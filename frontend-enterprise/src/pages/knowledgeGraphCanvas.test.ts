import { describe, expect, it } from 'vitest';

import type { GraphNode, GraphRelationship } from './knowledgeGraph';
import {
  computeCircleLayout,
  computeForceLayout,
  computeGraphLayout,
  computeRadialLayout,
  computeTreeLayout,
} from './knowledgeGraphCanvas';

const root: GraphNode = {
  identity: 1,
  labels: ['PROD_Document'],
  properties: { id: 'doc-1', title: '根文档' },
};
const childA: GraphNode = {
  identity: 2,
  labels: ['Topic'],
  properties: { id: 'topic-1', title: '主题A' },
};
const childB: GraphNode = {
  identity: 3,
  labels: ['Topic'],
  properties: { id: 'topic-2', title: '主题B' },
};
const grand: GraphNode = {
  identity: 4,
  labels: ['Playbook'],
  properties: { id: 'pb-1', title: '知识页' },
};

const link = (start: number, end: number): GraphRelationship => ({ type: 'LINK', start, end });

describe('computeRadialLayout', () => {
  it('places the root node at the center', () => {
    const layout = computeRadialLayout([root], []);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ id: '1', isRoot: true, x: 0, y: 0 });
  });

  it('distributes first-hop children on a ring around the root', () => {
    const layout = computeRadialLayout([root, childA, childB], [link(1, 2), link(1, 3)]);
    const rootNode = layout.nodes.find((node) => node.isRoot);
    const children = layout.nodes.filter((node) => !node.isRoot);
    expect(rootNode).toMatchObject({ x: 0, y: 0 });
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(Math.hypot(child.x, child.y)).toBeCloseTo(220);
    }
    const angleDiff = Math.abs(
      Math.atan2(children[0].y, children[0].x) - Math.atan2(children[1].y, children[1].x),
    );
    expect(angleDiff).toBeCloseTo(Math.PI);
  });

  it('places deeper hops on a larger ring', () => {
    const layout = computeRadialLayout([root, childA, grand], [link(1, 2), link(2, 4)]);
    const grandNode = layout.nodes.find((node) => node.id === '4');
    expect(grandNode).toBeDefined();
    expect(Math.hypot(grandNode?.x ?? 0, grandNode?.y ?? 0)).toBeCloseTo(395);
  });

  it('deduplicates repeated node identities', () => {
    const layout = computeRadialLayout([root, root, childA], [link(1, 2)]);
    expect(layout.nodes).toHaveLength(2);
  });

  it('deduplicates repeated edges', () => {
    const layout = computeRadialLayout([root, childA], [link(1, 2), link(1, 2)]);
    expect(layout.edges).toHaveLength(1);
  });

  it('tree layout puts the root at the origin and children in later columns', () => {
    const layout = computeTreeLayout([root, childA, childB], [link(1, 2), link(1, 3)]);
    const rootNode = layout.nodes.find((node) => node.isRoot);
    expect(rootNode).toMatchObject({ x: 0, y: 0 });
    const children = layout.nodes.filter((node) => !node.isRoot);
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.x).toBeCloseTo(210);
      expect(Math.abs(child.y)).toBeGreaterThan(0);
    }
  });

  it('circle layout puts every node on the same ring with the root first', () => {
    const layout = computeCircleLayout([root, childA, childB], [link(1, 2), link(1, 3)]);
    expect(layout.nodes[0].isRoot).toBe(true);
    for (const node of layout.nodes) {
      expect(Math.hypot(node.x, node.y)).toBeCloseTo(220);
    }
  });

  it('force layout pins the root at the center', () => {
    const layout = computeForceLayout([root, childA, childB], [link(1, 2), link(1, 3)]);
    const rootNode = layout.nodes.find((node) => node.isRoot);
    expect(rootNode).toMatchObject({ x: 0, y: 0 });
    for (const node of layout.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('computeGraphLayout dispatches by style', () => {
    expect(computeGraphLayout([root, childA], [link(1, 2)], 'tree').nodes[0]).toMatchObject({ x: 0, y: 0 });
    expect(computeGraphLayout([root, childA], [link(1, 2)], 'circle').nodes[0].isRoot).toBe(true);
    expect(computeGraphLayout([root, childA], [link(1, 2)], 'force').nodes[0]).toMatchObject({ x: 0, y: 0 });
    expect(computeGraphLayout([root, childA], [link(1, 2)], 'radial').nodes[0]).toMatchObject({ x: 0, y: 0 });
  });
});
