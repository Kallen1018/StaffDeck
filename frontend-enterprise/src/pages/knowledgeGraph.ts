/**
 * Neo4j graph helpers shared by the knowledge graph node picker and the
 * relationship-graph reasoning view.
 */

export type GraphQueryType = 'labels' | 'relationship_types' | 'property_keys';

export type GraphNode = {
  identity: string | number;
  labels?: string[];
  properties?: Record<string, unknown>;
};

export type GraphRelationship = {
  type?: string;
  start?: number;
  end?: number;
  startNode?: number;
  endNode?: number;
  properties?: Record<string, unknown>;
};

export const GRAPH_QUERY_TYPES: { value: GraphQueryType; label: string }[] = [
  { value: 'labels', label: 'Node labels' },
  { value: 'relationship_types', label: 'Relationship types' },
  { value: 'property_keys', label: 'Property keys' },
];

export const GRAPH_CATALOG_ENDPOINTS: Record<GraphQueryType, string> = {
  labels: '/neo4j/labels',
  relationship_types: '/neo4j/relationship-types',
  property_keys: '/neo4j/property-keys',
};

export const DEFAULT_GRAPH_DEPTH = 3;
export const GRAPH_NODE_PAGE_SIZE = 20;
export const GRAPH_REL_PAGE_SIZE = 20;

export function graphQueryItemLabel(type: GraphQueryType): string {
  if (type === 'labels') return '节点标签';
  if (type === 'relationship_types') return '关系类型';
  return '属性键';
}

export function graphNodeAnchorKey(node: GraphNode): string {
  const docId = stringValue(node.properties?.id);
  return docId || String(node.identity ?? '');
}

export function graphNodeOptionLabel(node: GraphNode): string {
  const props = node.properties || {};
  return (
    stringValue(props.title) ||
    stringValue(props.name) ||
    stringValue(props.doc_name) ||
    stringValue(props.filename) ||
    baseName(stringValue(props.source_file)) ||
    stringValue(props.canonical_name) ||
    truncateText(stringValue(props.text)) ||
    stringValue(props.description) ||
    graphNodeAnchorKey(node)
  );
}

/**
 * Picks the default child node from the loaded options: first an exact match
 * on the preferred keyword (e.g. the fuel pump), then a fuzzy match, then the
 * node anchored to the current document, and finally the first option.
 */
export function defaultGraphChildNode(
  list: GraphNode[],
  documentId: string,
  preferredKeyword = '燃料泵',
): GraphNode | null {
  if (list.length === 0) return null;
  const exact = list.find((node) => graphNodeOptionLabel(node) === preferredKeyword);
  if (exact) return exact;
  const fuzzy = list.find((node) => graphNodeOptionLabel(node).includes(preferredKeyword));
  if (fuzzy) return fuzzy;
  return list.find((node) => graphNodeAnchorKey(node) === documentId) ?? list[0] ?? null;
}

/**
 * The legacy Neo4j HTTP API serializes bare node values as flat property maps,
 * so child-node queries must return an explicit node-shaped map for the
 * backend proxy to recognize them as nodes.
 */
const GRAPH_NODE_SHAPE = '{identity:id(n),labels:labels(n),properties:properties(n)} AS n';

/**
 * Builds the Cypher used to load child-node options for the selected query
 * type/value, e.g. `MATCH (n:PROD_KG) RETURN n LIMIT 5`.
 */
export function buildGraphNodeOptionsCypher(
  queryType: GraphQueryType,
  queryValue: string,
): string {
  const value = queryValue.trim();
  if (!value) return `MATCH (n) RETURN ${GRAPH_NODE_SHAPE} LIMIT 5`;
  if (queryType === 'labels') {
    return `MATCH (n:${escapeCypherLabel(value)}) RETURN ${GRAPH_NODE_SHAPE} LIMIT 5`;
  }
  if (queryType === 'relationship_types') {
    return `MATCH (n)-[r:${escapeCypherLabel(value)}]-(m) RETURN ${GRAPH_NODE_SHAPE} LIMIT 5`;
  }
  return `MATCH (n) WHERE n.${escapeCypherLabel(value)} IS NOT NULL RETURN ${GRAPH_NODE_SHAPE} LIMIT 5`;
}

function buildNodeIdCondition(node: GraphNode): string {
  const docId = stringValue(node.properties?.id);
  const identity = Number(node.identity);
  if (docId) return `d.id = "${escapeCypherString(docId)}"`;
  if (Number.isFinite(identity)) return `id(d) = ${identity}`;
  return 'false';
}

/**
 * Returns the distinct nodes within `depth` hops from the selected node.
 * The limit is requested as `limit + 1` by callers so "has more" can be
 * detected without a separate count query.
 */
export function buildGraphLayerNodesCypher(
  node: GraphNode,
  depth: number,
  limit: number,
): string {
  return (
    `MATCH (d) WHERE ${buildNodeIdCondition(node)} WITH d ` +
    `MATCH path = (d)-[*1..${depth}]-(m) ` +
    'UNWIND nodes(path) AS n WITH DISTINCT n ' +
    'RETURN {identity:id(n),labels:labels(n),properties:properties(n)} AS n ' +
    `LIMIT ${limit}`
  );
}

/**
 * Returns the distinct relationships within `depth` hops from the selected node.
 */
export function buildGraphLayerRelationshipsCypher(
  node: GraphNode,
  depth: number,
  limit: number,
): string {
  return (
    `MATCH (d) WHERE ${buildNodeIdCondition(node)} WITH d ` +
    `MATCH path = (d)-[*1..${depth}]-(m) ` +
    'UNWIND relationships(path) AS r WITH DISTINCT r ' +
    'RETURN {identity:id(r), type:type(r), start:id(startNode(r)), end:id(endNode(r)), properties:properties(r)} AS r ' +
    `LIMIT ${limit}`
  );
}

/**
 * Probes whether any node exists exactly one layer deeper than `depth`.
 */
export function buildGraphHasDeeperLayerCypher(node: GraphNode, depth: number): string {
  return (
    `MATCH (d) WHERE ${buildNodeIdCondition(node)} ` +
    `MATCH (d)-[*${depth + 1}]-(m) WITH DISTINCT m RETURN m LIMIT 1`
  );
}

export function escapeCypherLabel(value: string): string {
  return `\`${value.replace(/`/g, '``')}\``;
}

export function escapeCypherString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function truncateText(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function baseName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.split(/[\\/]/).pop() || trimmed;
}
