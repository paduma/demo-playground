/** 菜单节点 */
export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  children?: MenuItem[];
}

/** 按钮级权限操作 */
export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import';

export const ACTION_LABELS: Record<ActionType, string> = {
  view: '查看',
  create: '新增',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  import: '导入',
};

/** 角色 */
export interface Role {
  id: string;
  name: string;
  description: string;
  /** 拥有的菜单 key 集合 */
  menuKeys: string[];
  /** 按钮权限：menuKey -> ActionType[] */
  actionMap: Record<string, ActionType[]>;
}

/** 模拟菜单树 */
export const MENU_TREE: MenuItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: '📊',
  },
  {
    key: 'order',
    label: '订单管理',
    icon: '📦',
    children: [
      { key: 'order-list', label: '订单列表' },
      { key: 'order-return', label: '退货管理' },
      { key: 'order-invoice', label: '发票管理' },
    ],
  },
  {
    key: 'product',
    label: '产品管理',
    icon: '🏭',
    children: [
      { key: 'product-list', label: '产品列表' },
      { key: 'product-category', label: '分类管理' },
      { key: 'product-stock', label: '库存管理' },
    ],
  },
  {
    key: 'customer',
    label: '客户管理',
    icon: '👥',
    children: [
      { key: 'customer-list', label: '客户列表' },
      { key: 'customer-contact', label: '联系人' },
      { key: 'customer-contract', label: '合同管理' },
    ],
  },
  {
    key: 'finance',
    label: '财务管理',
    icon: '💰',
    children: [
      { key: 'finance-receivable', label: '应收账款' },
      { key: 'finance-payable', label: '应付账款' },
      { key: 'finance-report', label: '财务报表' },
    ],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: '⚙️',
    children: [
      { key: 'system-user', label: '用户管理' },
      { key: 'system-role', label: '角色管理' },
      { key: 'system-menu', label: '菜单管理' },
      { key: 'system-log', label: '操作日志' },
    ],
  },
];

/** 收集所有叶子节点 key */
export function collectLeafKeys(items: MenuItem[]): string[] {
  const keys: string[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.children && item.children.length > 0) {
        walk(item.children);
      } else {
        keys.push(item.key);
      }
    }
  };
  walk(items);
  return keys;
}

/** 收集所有 key */
export function collectAllKeys(items: MenuItem[]): string[] {
  const keys: string[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      keys.push(item.key);
      if (item.children) walk(item.children);
    }
  };
  walk(items);
  return keys;
}

/** 默认角色列表 */
const allKeys = collectAllKeys(MENU_TREE);
const allLeafKeys = collectLeafKeys(MENU_TREE);
const allActions: ActionType[] = ['view', 'create', 'edit', 'delete', 'export', 'import'];

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: '超级管理员',
    description: '拥有所有权限',
    menuKeys: allKeys,
    actionMap: Object.fromEntries(allLeafKeys.map(k => [k, [...allActions]])),
  },
  {
    id: 'sales',
    name: '销售经理',
    description: '订单和客户管理权限',
    menuKeys: ['dashboard', 'order', 'order-list', 'order-return', 'customer', 'customer-list', 'customer-contact', 'customer-contract'],
    actionMap: {
      'order-list': ['view', 'create', 'edit', 'export'],
      'order-return': ['view', 'create'],
      'customer-list': ['view', 'create', 'edit', 'delete'],
      'customer-contact': ['view', 'create', 'edit'],
      'customer-contract': ['view', 'export'],
    },
  },
  {
    id: 'finance',
    name: '财务专员',
    description: '财务和发票相关权限',
    menuKeys: ['dashboard', 'order', 'order-list', 'order-invoice', 'finance', 'finance-receivable', 'finance-payable', 'finance-report'],
    actionMap: {
      'order-list': ['view'],
      'order-invoice': ['view', 'create', 'edit', 'export'],
      'finance-receivable': ['view', 'create', 'edit', 'export'],
      'finance-payable': ['view', 'create', 'edit'],
      'finance-report': ['view', 'export'],
    },
  },
  {
    id: 'viewer',
    name: '只读用户',
    description: '仅查看权限',
    menuKeys: ['dashboard', 'order', 'order-list', 'product', 'product-list'],
    actionMap: {
      'order-list': ['view'],
      'product-list': ['view'],
    },
  },
];
