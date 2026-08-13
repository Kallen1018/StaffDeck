import { describe, expect, it } from 'vitest';

import {
  buildGraphHasDeeperLayerCypher,
  buildGraphLayerNodesCypher,
  buildGraphLayerRelationshipsCypher,
  buildGraphNodeOptionsCypher,
  defaultGraphChildNode,
  escapeCypherLabel,
  escapeCypherString,
  graphNodeAnchorKey,
  graphNodeOptionLabel,
  type GraphNode,
} from './knowledgeGraph';

describe('knowledge graph Cypher builders', () => {
  it('loads child node options for a selected label', () => {
    expect(buildGraphNodeOptionsCypher('labels', 'PROD_Document')).toBe(
      'MATCH (n:`PROD_Document`) RETURN {identity:id(n),labels:labels(n),properties:properties(n)} AS n LIMIT 5',
    );
  });

  it('links the selected relationship type to child node options', () => {
    expect(buildGraphNodeOptionsCypher('relationship_types', 'RELATED_TO')).toBe(
      'MATCH (n)-[r:`RELATED_TO`]-(m) RETURN {identity:id(n),labels:labels(n),properties:properties(n)} AS n LIMIT 5',
    );
  });

  it('links the selected property key to child node options', () => {
    expect(buildGraphNodeOptionsCypher('property_keys', 'title')).toBe(
      'MATCH (n) WHERE n.`title` IS NOT NULL RETURN {identity:id(n),labels:labels(n),properties:properties(n)} AS n LIMIT 5',
    );
  });

  it('builds a layered nodes query around the selected child node', () => {
    const node: GraphNode = {
      identity: 3,
      labels: ['PROD_Document'],
      properties: { id: 'doc-1', title: '采购制度' },
    };
    const cypher = buildGraphLayerNodesCypher(node, 3, 20);

    expect(cypher).toBe(
      'MATCH (d) WHERE d.id = "doc-1" WITH d MATCH path = (d)-[*1..3]-(m) ' +
        'UNWIND nodes(path) AS n WITH DISTINCT n ' +
        'RETURN {identity:id(n),labels:labels(n),properties:properties(n)} AS n LIMIT 20',
    );
  });

  it('builds a layered relationships query within the same depth', () => {
    const node: GraphNode = {
      identity: 3,
      labels: ['PROD_Document'],
      properties: { id: 'doc-1' },
    };
    const cypher = buildGraphLayerRelationshipsCypher(node, 4, 20);

    expect(cypher).toBe(
      'MATCH (d) WHERE d.id = "doc-1" WITH d MATCH path = (d)-[*1..4]-(m) ' +
        'UNWIND relationships(path) AS r WITH DISTINCT r ' +
        'RETURN {identity:id(r), type:type(r), start:id(startNode(r)), end:id(endNode(r)), properties:properties(r)} AS r ' +
        'LIMIT 20',
    );
  });

  it('probes for an exact deeper layer', () => {
    const node: GraphNode = { identity: 42, labels: ['PROD_KG'] };

    expect(buildGraphHasDeeperLayerCypher(node, 3)).toBe(
      'MATCH (d) WHERE id(d) = 42 MATCH (d)-[*4]-(m) WITH DISTINCT m RETURN m LIMIT 1',
    );
  });

  it('falls back to the identity when a node has no document id', () => {
    const node: GraphNode = { identity: 42, labels: ['PROD_KG'] };
    const cypher = buildGraphLayerNodesCypher(node, 3, 20);

    expect(cypher).toContain('WHERE id(d) = 42');
  });

  it('escapes backticks and quotes in Cypher fragments', () => {
    expect(escapeCypherLabel('Weird`Label')).toBe('`Weird``Label`');
    expect(escapeCypherString('a"b\\c')).toBe('a\\"b\\\\c');
  });

  it('exposes stable node anchors and readable option labels', () => {
    const node: GraphNode = {
      identity: 7,
      properties: { id: 'doc-2', title: '合同模板' },
    };

    expect(graphNodeAnchorKey(node)).toBe('doc-2');
    expect(graphNodeOptionLabel(node)).toBe('合同模板');
    expect(graphNodeOptionLabel({ identity: 8 })).toBe('8');
  });

  it('falls back to file/name/text properties for option labels', () => {
    expect(
      graphNodeOptionLabel({
        identity: 1,
        properties: { id: 'doc-3', source_file: '采购制度.docx' },
      }),
    ).toBe('采购制度.docx');
    expect(
      graphNodeOptionLabel({
        identity: 1,
        properties: { id: 'doc-3', source_file: '/project/upload/发动机说明书.pdf' },
      }),
    ).toBe('发动机说明书.pdf');
    expect(
      graphNodeOptionLabel({
        identity: 2,
        properties: { id: 'doc-4', name: '报告头' },
      }),
    ).toBe('报告头');
    expect(
      graphNodeOptionLabel({
        identity: 3,
        properties: { id: 'doc-5', text: '报告编号：GL-YF100K-2025-0211' },
      }),
    ).toBe('报告编号：GL-YF100K-2025-0211');
  });
});

describe('defaultGraphChildNode', () => {
  it('picks the exact preferred child node by default', () => {
    const pump: GraphNode = { identity: 1, properties: { id: 'pump', title: '燃料泵' } };
    const other: GraphNode = { identity: 2, properties: { id: 'pipe', title: '管路' } };
    expect(defaultGraphChildNode([other, pump], 'doc-1')).toBe(pump);
  });

  it('fuzzy-matches the preferred child node', () => {
    const pump: GraphNode = { identity: 1, properties: { id: 'pump', title: '高压燃料泵总成' } };
    const other: GraphNode = { identity: 2, properties: { id: 'pipe', title: '管路' } };
    expect(defaultGraphChildNode([other, pump], 'doc-1')).toBe(pump);
  });

  it('falls back to the current document node then the first option', () => {
    const docNode: GraphNode = { identity: 3, properties: { id: 'doc-1', title: '当前文档' } };
    const first: GraphNode = { identity: 4, properties: { id: 'x', title: '其他' } };
    expect(defaultGraphChildNode([docNode, first], 'doc-1')).toBe(docNode);
    expect(defaultGraphChildNode([first], 'doc-1')).toBe(first);
    expect(defaultGraphChildNode([], 'doc-1')).toBeNull();
  });
});
