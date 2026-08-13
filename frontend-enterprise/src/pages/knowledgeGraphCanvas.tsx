import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import '@xyflow/react/dist/style.css';

import type { GraphNode, GraphRelationship } from './knowledgeGraph';
import { graphNodeOptionLabel } from './knowledgeGraph';

export type GraphCanvasProps = {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  hasMoreNodes: boolean;
  hasMoreRelationships: boolean;
  onLoadMoreNodes: () => void;
  onLoadMoreRelationships: () => void;
  depth: number;
  hasMoreLayers: boolean;
  onExpandDepth: () => void;
};

export type GraphLayoutStyle = 'radial' | 'tree' | 'circle' | 'force';

const GRAPH_STYLE_OPTIONS: { value: GraphLayoutStyle; label: string }[] = [
  { value: 'radial', label: '同心圆' },
  { value: 'tree', label: '树状' },
  { value: 'circle', label: '环形' },
  { value: 'force', label: '力导向' },
];

type GraphNodeData = {
  label: string;
  detail: string;
  nodeType: string;
  isRoot: boolean;
};

type GraphFlowNode = Node<GraphNodeData, 'graphNode'>;

const NODE_WIDTH = 150;
const NODE_HEIGHT = 58;
const RING_BASE_RADIUS = 220;
const RING_STEP = 175;

const NODE_TYPE_COLORS = ['#1a71ff', '#7c5cff', '#12a150', '#e8792b', '#0891b2', '#d6458f', '#8a6d3b'];

function nodeTypeColor(nodeType: string): string {
  if (!nodeType) return NODE_TYPE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < nodeType.length; i += 1) {
    hash = (hash * 31 + nodeType.charCodeAt(i)) >>> 0;
  }
  return NODE_TYPE_COLORS[hash % NODE_TYPE_COLORS.length];
}

function readableNodeLabel(node: GraphNode): string {
  return graphNodeOptionLabel(node) || node.labels?.[0] || 'Node';
}

function nodeDetail(node: GraphNode): string {
  const props = node.properties || {};
  return String(props.id ?? props.name ?? props.canonical_name ?? '');
}

function nodeIdentity(node: GraphNode): string {
  return String(node.identity ?? '');
}

type LayoutNode = {
  id: string;
  label: string;
  detail: string;
  nodeType: string;
  isRoot: boolean;
  x: number;
  y: number;
};

type LayoutEdge = { id: string; source: string; target: string; type: string };

type CanvasLayout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
};

type GraphModel = {
  rootId: string;
  nodes: GraphNode[];
  depthOf: Map<string, number>;
  order: string[];
  edges: LayoutEdge[];
};

function buildGraphModel(nodes: GraphNode[], relationships: GraphRelationship[]): GraphModel | null {
  const seen = new Set<string>();
  const uniqueNodes = nodes.filter((node) => {
    const identity = nodeIdentity(node);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  if (uniqueNodes.length === 0) return null;

  const rootId = nodeIdentity(uniqueNodes[0]);
  const adjacency = new Map<string, Set<string>>();
  relationships.forEach((rel) => {
    const start = String(rel.start ?? rel.startNode ?? '');
    const end = String(rel.end ?? rel.endNode ?? '');
    if (!start || !end) return;
    if (!adjacency.has(start)) adjacency.set(start, new Set());
    if (!adjacency.has(end)) adjacency.set(end, new Set());
    adjacency.get(start)?.add(end);
    adjacency.get(end)?.add(start);
  });

  const depthOf = new Map<string, number>();
  const order: string[] = [];
  depthOf.set(rootId, 0);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    order.push(current);
    const currentDepth = depthOf.get(current) ?? 0;
    const neighbors = [...(adjacency.get(current) ?? [])].sort((a, b) => a.localeCompare(b));
    for (const neighbor of neighbors) {
      if (depthOf.has(neighbor)) continue;
      depthOf.set(neighbor, currentDepth + 1);
      queue.push(neighbor);
    }
  }
  uniqueNodes.forEach((node) => {
    const id = nodeIdentity(node);
    if (!depthOf.has(id)) depthOf.set(id, 1);
    if (!order.includes(id)) order.push(id);
  });

  const positionedIds = new Set(uniqueNodes.map(nodeIdentity));
  const edgeSeen = new Set<string>();
  const edges: LayoutEdge[] = [];
  relationships.forEach((rel) => {
    const start = String(rel.start ?? rel.startNode ?? '');
    const end = String(rel.end ?? rel.endNode ?? '');
    const type = rel.type || '';
    if (!start || !end) return;
    if (!positionedIds.has(start) || !positionedIds.has(end)) return;
    const key = `${start}|${end}|${type}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ id: `rel-${edges.length}`, source: start, target: end, type });
  });

  return { rootId, nodes: uniqueNodes, depthOf, order, edges };
}

function modelToNodes(model: GraphModel): LayoutNode[] {
  const nodeById = new Map(model.nodes.map((node) => [nodeIdentity(node), node]));
  return model.order
    .map((id) => nodeById.get(id))
    .filter((node): node is GraphNode => Boolean(node))
    .map((node) => ({
      id: nodeIdentity(node),
      label: readableNodeLabel(node),
      detail: nodeDetail(node),
      nodeType: node.labels?.[0] || 'Node',
      isRoot: nodeIdentity(node) === model.rootId,
      x: 0,
      y: 0,
    }));
}

export function computeRadialLayout(nodes: GraphNode[], relationships: GraphRelationship[]): CanvasLayout {
  const model = buildGraphModel(nodes, relationships);
  if (!model) return { nodes: [], edges: [] };

  const byDepth = new Map<number, LayoutNode[]>();
  modelToNodes(model).forEach((item) => {
    const depth = model.depthOf.get(item.id) ?? 1;
    const ring = byDepth.get(depth) ?? [];
    ring.push(item);
    byDepth.set(depth, ring);
  });

  const positioned: LayoutNode[] = [];
  byDepth.forEach((ringNodes, depth) => {
    const count = ringNodes.length;
    const requiredRadius = (count * (NODE_WIDTH + 24)) / (2 * Math.PI);
    const radius =
      depth === 0 ? 0 : Math.max(RING_BASE_RADIUS + (depth - 1) * RING_STEP, requiredRadius);
    const startAngle = -Math.PI / 2 + (depth % 2) * (Math.PI / count);
    ringNodes.forEach((item, index) => {
      const angle = startAngle + (Math.PI * 2 * index) / count;
      item.x = radius === 0 ? 0 : Math.cos(angle) * radius;
      item.y = radius === 0 ? 0 : Math.sin(angle) * radius;
      positioned.push(item);
    });
  });

  return { nodes: positioned, edges: model.edges };
}

export function computeTreeLayout(nodes: GraphNode[], relationships: GraphRelationship[]): CanvasLayout {
  const model = buildGraphModel(nodes, relationships);
  if (!model) return { nodes: [], edges: [] };

  const columnGap = NODE_WIDTH + 60;
  const rowGap = NODE_HEIGHT + 20;
  const rowsByDepth = new Map<number, LayoutNode[]>();
  modelToNodes(model).forEach((item) => {
    const depth = model.depthOf.get(item.id) ?? 1;
    const row = rowsByDepth.get(depth) ?? [];
    row.push(item);
    rowsByDepth.set(depth, row);
  });

  rowsByDepth.forEach((row, depth) => {
    const count = row.length;
    row.forEach((item, index) => {
      item.x = depth * columnGap;
      item.y = (index - (count - 1) / 2) * rowGap;
    });
  });

  const positioned = model.order
    .map((id) => rowsByDepth.get(model.depthOf.get(id) ?? 1)?.find((item) => item.id === id))
    .filter((item): item is LayoutNode => Boolean(item));
  return { nodes: positioned, edges: model.edges };
}

export function computeCircleLayout(nodes: GraphNode[], relationships: GraphRelationship[]): CanvasLayout {
  const model = buildGraphModel(nodes, relationships);
  if (!model) return { nodes: [], edges: [] };

  const items = modelToNodes(model);
  const count = items.length;
  const radius = Math.max(220, (count * (NODE_WIDTH + 24)) / (2 * Math.PI));
  items.forEach((item, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    item.x = Math.cos(angle) * radius;
    item.y = Math.sin(angle) * radius;
  });
  return { nodes: items, edges: model.edges };
}

type ForceNode = SimulationNodeDatum & { id: string };
type ForceLink = SimulationLinkDatum<ForceNode>;

export function computeForceLayout(nodes: GraphNode[], relationships: GraphRelationship[]): CanvasLayout {
  const model = buildGraphModel(nodes, relationships);
  if (!model) return { nodes: [], edges: [] };

  const simNodes: ForceNode[] = model.nodes.map((node) => ({ id: nodeIdentity(node) }));
  const simLinks: ForceLink[] = model.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));
  const rootSim = simNodes.find((item) => item.id === model.rootId);
  if (rootSim) {
    rootSim.fx = 0;
    rootSim.fy = 0;
  }

  const simulation = forceSimulation<ForceNode>(simNodes)
    .force(
      'link',
      forceLink<ForceNode, ForceLink>(simLinks)
        .id((item) => item.id)
        .distance(150)
        .strength(0.35),
    )
    .force('charge', forceManyBody<ForceNode>().strength(-420))
    .force('x', forceX<ForceNode>(0).strength(0.06))
    .force('y', forceY<ForceNode>(0).strength(0.06))
    .force('collide', forceCollide<ForceNode>().radius(NODE_WIDTH / 2 + 4).strength(0.85))
    .stop();
  simulation.tick(400);

  const byId = new Map(simNodes.map((item) => [item.id, item]));
  const positioned: LayoutNode[] = modelToNodes(model).map((item) => {
    const sim = byId.get(item.id);
    return {
      ...item,
      x: sim?.x ?? 0,
      y: sim?.y ?? 0,
    };
  });
  return { nodes: positioned, edges: model.edges };
}

export function computeGraphLayout(
  nodes: GraphNode[],
  relationships: GraphRelationship[],
  style: GraphLayoutStyle,
): CanvasLayout {
  if (style === 'tree') return computeTreeLayout(nodes, relationships);
  if (style === 'circle') return computeCircleLayout(nodes, relationships);
  if (style === 'force') return computeForceLayout(nodes, relationships);
  return computeRadialLayout(nodes, relationships);
}

function GraphNodeCard({ data }: NodeProps<GraphFlowNode>) {
  const { label, detail, nodeType, isRoot } = data;
  const color = nodeTypeColor(nodeType);
  return (
    <div
      className={`flex min-w-[150px] max-w-[200px] items-center gap-[10px] rounded-[12px] border px-[12px] py-[9px] shadow-sm transition-shadow hover:shadow-md ${
        isRoot
          ? 'border-[#1a71ff]/55 bg-[#f0f6ff] shadow-[0_0_0_3px_rgba(26,113,255,0.14)]'
          : 'border-[#e3e7f1] bg-white'
      }`}
      title={`${nodeType} · ${label}${detail ? ` · ${detail}` : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-px !w-px !opacity-0" />
      <span className="size-[10px] shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold tracking-wide uppercase" style={{ color }}>
          {nodeType}
        </span>
        <strong className="kg-node-title block text-[12px] font-semibold leading-[1.35] text-[#24292f]">{label}</strong>
        {detail && detail !== label ? <small className="block truncate text-[10px] text-[#9aa3b2]">{detail}</small> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-px !w-px !opacity-0" />
    </div>
  );
}

const graphNodeTypes = { graphNode: GraphNodeCard };

function GraphCanvasInner({
  nodes,
  relationships,
  hasMoreNodes,
  hasMoreRelationships,
  onLoadMoreNodes,
  onLoadMoreRelationships,
  depth,
  hasMoreLayers,
  onExpandDepth,
}: GraphCanvasProps) {
  const { fitView } = useReactFlow();
  const [style, setStyle] = useState<GraphLayoutStyle>('radial');
  const layout = useMemo(
    () => computeGraphLayout(nodes, relationships, style),
    [nodes, relationships, style],
  );

  const flowNodes = useMemo<GraphFlowNode[]>(
    () =>
      layout.nodes.map((item) => ({
        id: item.id,
        type: 'graphNode',
        position: { x: item.x - NODE_WIDTH / 2, y: item.y - NODE_HEIGHT / 2 },
        data: {
          label: item.label,
          detail: item.detail,
          nodeType: item.nodeType,
          isRoot: item.isRoot,
        },
      })),
    [layout],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      layout.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type || undefined,
        labelStyle: { fill: '#8a93a6', fontSize: 10, fontWeight: 600 },
        labelBgStyle: {
          fill: 'rgba(255,255,255,0.92)',
          fillOpacity: 1,
          stroke: '#e3e7f1',
          strokeWidth: 1,
          rx: 4,
        },
        labelBgPadding: [4, 2] as [number, number],
        style: { stroke: '#aab4c7', strokeWidth: 1.4 },
      })),
    [layout],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.22, duration: 350 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [fitView, layout]);

  if (layout.nodes.length === 0) {
    return <div className="text-[13px] text-[#858b9c]">暂无图谱数据</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[10px]">
        <div className="flex items-center gap-[4px] rounded-[10px] border border-[#e3e7f1] bg-[#f6f8fc] p-[3px]">
          {GRAPH_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStyle(option.value)}
              className={`rounded-[8px] px-[10px] py-[5px] text-[12px] transition-colors ${
                style === option.value
                  ? 'bg-white font-semibold text-[#1a71ff] shadow-sm'
                  : 'text-[#5b6878] hover:text-[#24292f]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[6px] text-[12px] text-[#5b6878]">
          <span>层级 {depth} 层</span>
          <button
            type="button"
            onClick={onExpandDepth}
            disabled={!hasMoreLayers}
            title={hasMoreLayers ? '再展开一层' : '暂无更深层级'}
            className="grid size-[20px] place-items-center rounded-[6px] text-[13px] leading-none text-[#1a71ff] transition-colors hover:bg-[#f2f6ff] disabled:cursor-not-allowed disabled:text-[#c0c6d4]"
          >
            +
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={graphNodeTypes}
          minZoom={0.2}
          maxZoom={2.5}
          nodesDraggable
          panOnScroll
          fitView
          fitViewOptions={{ padding: 0.22, maxZoom: 1.2 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#d9dee9" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="mt-[10px] flex flex-wrap items-center gap-[8px] rounded-[12px] border border-[#eceef1] bg-[#fafbff] px-[12px] py-[8px] text-[12px] text-[#5b6878]">
        <strong className="text-[13px] text-[#24292f]">图谱</strong>
        <span>节点 {layout.nodes.length}</span>
        <span>关系 {layout.edges.length}</span>
        {hasMoreNodes ? (
          <button
            type="button"
            onClick={onLoadMoreNodes}
            className="text-[12px] text-[#1a71ff] transition-colors hover:text-[#4a8dff]"
          >
            加载更多节点
          </button>
        ) : null}
        {hasMoreRelationships ? (
          <button
            type="button"
            onClick={onLoadMoreRelationships}
            className="text-[12px] text-[#1a71ff] transition-colors hover:text-[#4a8dff]"
          >
            加载更多关系
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
