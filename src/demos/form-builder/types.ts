/** 支持的字段类型 */
export type FieldType =
  | 'input'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'switch'
  | 'radio'
  | 'checkbox';

/** 校验规则 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

/** 选项（select / radio / checkbox 用） */
export interface FieldOption {
  label: string;
  value: string;
}

/** 单个字段的 Schema 定义 */
export interface FieldSchema {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: unknown;
  options?: FieldOption[];
  rules?: ValidationRule;
  span?: number;
  disabled?: boolean;
  readonly?: boolean;
}

/** 整个表单的 Schema */
export interface FormSchema {
  title: string;
  labelCol?: number;
  fields: FieldSchema[];
}

/** 组件面板中的模板 */
export interface FieldTemplate {
  type: FieldType;
  label: string;
  icon: string;
}

export const FIELD_TEMPLATES: FieldTemplate[] = [
  { type: 'input', label: '单行文本', icon: '✏️' },
  { type: 'textarea', label: '多行文本', icon: '📝' },
  { type: 'number', label: '数字', icon: '🔢' },
  { type: 'select', label: '下拉选择', icon: '📋' },
  { type: 'date', label: '日期', icon: '📅' },
  { type: 'switch', label: '开关', icon: '🔘' },
  { type: 'radio', label: '单选', icon: '⭕' },
  { type: 'checkbox', label: '多选', icon: '☑️' },
];

let _uid = 0;
export function genFieldId(): string {
  return `field_${Date.now()}_${++_uid}`;
}

/** 根据类型创建默认字段 */
export function createField(type: FieldType): FieldSchema {
  const id = genFieldId();
  const base: FieldSchema = {
    id,
    type,
    label: FIELD_TEMPLATES.find(t => t.type === type)!.label,
    name: `field_${id.slice(-4)}`,
    rules: { required: false },
  };
  if (type === 'select' || type === 'radio' || type === 'checkbox') {
    base.options = [
      { label: '选项一', value: 'opt1' },
      { label: '选项二', value: 'opt2' },
    ];
  }
  if (type === 'number') {
    base.rules = { ...base.rules, min: 0, max: 9999 };
  }
  return base;
}

/* ── 预设模板 ── */

export interface FormTemplate {
  key: string;
  label: string;
  schema: FormSchema;
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: 'user',
    label: '👤 用户信息',
    schema: {
      title: '用户信息表单',
      labelCol: 6,
      fields: [
        { id: 'f1', type: 'input', label: '姓名', name: 'name', span: 12, rules: { required: true } },
        { id: 'f2', type: 'input', label: '手机号', name: 'phone', span: 12, rules: { required: true, pattern: '^1[3-9]\\d{9}$', message: '手机号格式不正确' } },
        {
          id: 'f3', type: 'select', label: '部门', name: 'dept', span: 12, options: [
            { label: '技术部', value: 'tech' }, { label: '产品部', value: 'product' }, { label: '设计部', value: 'design' },
          ]
        },
        { id: 'f4', type: 'date', label: '入职日期', name: 'joinDate', span: 12 },
        {
          id: 'f5', type: 'radio', label: '性别', name: 'gender', options: [
            { label: '男', value: 'male' }, { label: '女', value: 'female' },
          ]
        },
        { id: 'f6', type: 'switch', label: '是否在职', name: 'active', defaultValue: true },
      ],
    },
  },
  {
    key: 'order',
    label: '📦 订单录入',
    schema: {
      title: '订单录入表单',
      labelCol: 5,
      fields: [
        { id: 'o1', type: 'input', label: '订单号', name: 'orderNo', span: 12, rules: { required: true }, disabled: true, defaultValue: 'ORD-2026-001' },
        { id: 'o2', type: 'date', label: '下单日期', name: 'orderDate', span: 12, rules: { required: true } },
        { id: 'o3', type: 'input', label: '客户名称', name: 'customer', rules: { required: true } },
        {
          id: 'o4', type: 'select', label: '优先级', name: 'priority', span: 12, options: [
            { label: '普通', value: 'normal' }, { label: '加急', value: 'urgent' }, { label: '特急', value: 'critical' },
          ]
        },
        { id: 'o5', type: 'number', label: '金额', name: 'amount', span: 12, rules: { required: true, min: 0 } },
        { id: 'o6', type: 'textarea', label: '备注', name: 'remark' },
      ],
    },
  },
  {
    key: 'feedback',
    label: '💬 意见反馈',
    schema: {
      title: '意见反馈表单',
      labelCol: 4,
      fields: [
        {
          id: 'fb1', type: 'radio', label: '类型', name: 'type', rules: { required: true }, options: [
            { label: 'Bug 反馈', value: 'bug' }, { label: '功能建议', value: 'feature' }, { label: '体验问题', value: 'ux' },
          ]
        },
        { id: 'fb2', type: 'input', label: '标题', name: 'title', rules: { required: true } },
        { id: 'fb3', type: 'textarea', label: '详细描述', name: 'description', rules: { required: true } },
        {
          id: 'fb4', type: 'select', label: '严重程度', name: 'severity', span: 12, options: [
            { label: '低', value: 'low' }, { label: '中', value: 'medium' }, { label: '高', value: 'high' },
          ]
        },
        { id: 'fb5', type: 'input', label: '联系方式', name: 'contact', span: 12 },
      ],
    },
  },
];
