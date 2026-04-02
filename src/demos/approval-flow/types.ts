/** 流程节点类型 */
export type FlowNodeType = 'start' | 'approve' | 'condition' | 'cc' | 'end';

/** 流程节点 */
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  /** 审批人（approve 节点） */
  assignee?: string;
  /** 审批方式 */
  approveMode?: 'any' | 'all' | 'sequential';
  /** 条件表达式（condition 节点） */
  conditions?: ConditionRule[];
  /** 抄送人（cc 节点） */
  ccList?: string[];
  /** 画布位置 */
  x: number;
  y: number;
}

/** 条件规则 */
export interface ConditionRule {
  field: string;   // 引用表单字段 name
  op: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in';
  value: string;
}

/** 节点间连线 */
export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

/** 节点类型配置 */
export const NODE_TYPE_CONFIG: Record<FlowNodeType, { label: string; color: string; icon: string }> = {
  start: { label: '发起人', color: '#52c41a', icon: '🟢' },
  approve: { label: '审批人', color: '#1677ff', icon: '✅' },
  condition: { label: '条件分支', color: '#faad14', icon: '🔀' },
  cc: { label: '抄送人', color: '#722ed1', icon: '📧' },
  end: { label: '结束', color: '#ff4d4f', icon: '🔴' },
};

let _uid = 0;
export function genNodeId(): string {
  return `node_${Date.now()}_${++_uid}`;
}
export function genEdgeId(): string {
  return `edge_${Date.now()}_${++_uid}`;
}

/** 默认审批流程 */
export function createDefaultFlow(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const startId = 'start-1';
  const approve1Id = 'approve-1';
  const approve2Id = 'approve-2';
  const endId = 'end-1';

  return {
    nodes: [
      { id: startId, type: 'start', label: '发起人', x: 300, y: 40 },
      { id: approve1Id, type: 'approve', label: '直属主管审批', assignee: '直属主管', approveMode: 'any', x: 300, y: 160 },
      { id: approve2Id, type: 'approve', label: '部门负责人审批', assignee: '部门负责人', approveMode: 'all', x: 300, y: 280 },
      { id: endId, type: 'end', label: '结束', x: 300, y: 400 },
    ],
    edges: [
      { id: 'e1', from: startId, to: approve1Id },
      { id: 'e2', from: approve1Id, to: approve2Id },
      { id: 'e3', from: approve2Id, to: endId },
    ],
  };
}
