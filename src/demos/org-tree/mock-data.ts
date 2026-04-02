import type { OrgNode } from './types';

/** 模拟组织架构数据（纯虚构） */
export const MOCK_ORG_TREE: OrgNode[] = [
  {
    id: 'root',
    name: 'Acme Corporation',
    type: 'company',
    memberCount: 210,
    children: [
      {
        id: 'dept-tech',
        name: '技术研发部',
        type: 'department',
        memberCount: 68,
        children: [
          {
            id: 'team-fe',
            name: '前端开发组',
            type: 'team',
            memberCount: 14,
            children: [
              { id: 'p1', name: 'Alice Chen', type: 'person', title: '前端负责人' },
              { id: 'p2', name: 'Bob Wang', type: 'person', title: '高级前端工程师' },
              { id: 'p3', name: 'Carol Li', type: 'person', title: '前端工程师' },
              { id: 'p4', name: 'David Zhao', type: 'person', title: '前端工程师' },
            ],
          },
          {
            id: 'team-be',
            name: '后端开发组',
            type: 'team',
            memberCount: 18,
            children: [
              { id: 'p5', name: 'Eve Liu', type: 'person', title: '后端负责人' },
              { id: 'p6', name: 'Frank Sun', type: 'person', title: 'Java 工程师' },
              { id: 'p7', name: 'Grace Zhou', type: 'person', title: 'Go 工程师' },
            ],
          },
          {
            id: 'team-qa',
            name: '质量保障组',
            type: 'team',
            memberCount: 9,
            hasChildren: true,
          },
          {
            id: 'team-devops',
            name: '基础架构组',
            type: 'team',
            memberCount: 6,
            hasChildren: true,
          },
        ],
      },
      {
        id: 'dept-product',
        name: '产品设计部',
        type: 'department',
        memberCount: 28,
        children: [
          {
            id: 'team-pm',
            name: '产品经理组',
            type: 'team',
            memberCount: 10,
            children: [
              { id: 'p8', name: 'Helen Xu', type: 'person', title: '产品总监' },
              { id: 'p9', name: 'Ivan Wu', type: 'person', title: '高级产品经理' },
            ],
          },
          {
            id: 'team-design',
            name: 'UI/UX 设计组',
            type: 'team',
            memberCount: 7,
            children: [
              { id: 'p10', name: 'Julia Feng', type: 'person', title: '设计负责人' },
              { id: 'p11', name: 'Kevin Huang', type: 'person', title: 'UI 设计师' },
            ],
          },
        ],
      },
      {
        id: 'dept-sales',
        name: '市场营销部',
        type: 'department',
        memberCount: 42,
        hasChildren: true,
      },
      {
        id: 'dept-hr',
        name: '人力资源部',
        type: 'department',
        memberCount: 15,
        hasChildren: true,
      },
      {
        id: 'dept-finance',
        name: '财务部',
        type: 'department',
        memberCount: 12,
        hasChildren: true,
      },
    ],
  },
];

/** 模拟懒加载：根据节点 id 返回子节点 */
export function fetchChildren(parentId: string): Promise<OrgNode[]> {
  const lazyData: Record<string, OrgNode[]> = {
    'team-qa': [
      { id: 'p12', name: 'Leo Ma', type: 'person', title: '测试负责人' },
      { id: 'p13', name: 'Mia Han', type: 'person', title: '自动化测试工程师' },
      { id: 'p14', name: 'Nathan Lin', type: 'person', title: '测试工程师' },
    ],
    'team-devops': [
      { id: 'p15', name: 'Olivia Xie', type: 'person', title: '运维负责人' },
      { id: 'p16', name: 'Peter Cao', type: 'person', title: 'SRE 工程师' },
    ],
    'dept-sales': [
      {
        id: 'team-sales-north', name: '北区销售组', type: 'team', memberCount: 15,
        children: [
          { id: 'p17', name: 'Quinn Tian', type: 'person', title: '区域经理' },
          { id: 'p18', name: 'Ryan Song', type: 'person', title: '销售主管' },
        ],
      },
      {
        id: 'team-sales-east', name: '东区销售组', type: 'team', memberCount: 12,
        children: [
          { id: 'p19', name: 'Sophia Xu', type: 'person', title: '区域经理' },
        ],
      },
    ],
    'dept-hr': [
      { id: 'p20', name: 'Tom Feng', type: 'person', title: 'HRBP' },
      { id: 'p21', name: 'Uma Jiang', type: 'person', title: '招聘专员' },
      { id: 'p22', name: 'Vera Shen', type: 'person', title: '薪酬专员' },
    ],
    'dept-finance': [
      { id: 'p23', name: 'Will Peng', type: 'person', title: '财务总监' },
      { id: 'p24', name: 'Xena Pan', type: 'person', title: '会计' },
    ],
  };

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(lazyData[parentId] || []);
    }, 600 + Math.random() * 400);
  });
}
