/** 组织节点类型 */
export type OrgNodeType = 'company' | 'department' | 'team' | 'person';

/** 组织树节点 */
export interface OrgNode {
  id: string;
  name: string;
  type: OrgNodeType;
  title?: string;        // 职位（person 用）
  avatar?: string;       // 头像占位
  memberCount?: number;  // 部门人数
  children?: OrgNode[];
  /** 模拟懒加载：true 表示有子节点但尚未加载 */
  hasChildren?: boolean;
}

export const NODE_ICONS: Record<OrgNodeType, string> = {
  company: '🏢',
  department: '📁',
  team: '👥',
  person: '👤',
};

export const NODE_COLORS: Record<OrgNodeType, string> = {
  company: '#1677ff',
  department: '#722ed1',
  team: '#13c2c2',
  person: '#52c41a',
};
