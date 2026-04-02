import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker } from 'antd';

export interface InputConfig {
  type: 'text' | 'number' | 'select' | 'date' | 'custom';
  precision?: number;
  min?: number;
  max?: number;
  options?: { label: string; value: any }[];
  /** type 为 custom 时，用于渲染自定义输入组件 */
  renderInput?: (dataIndex: string, record: any) => React.ReactNode;
}

export interface EditableCellProps<T> {
  editing: boolean;
  dataIndex: string;
  title: React.ReactNode;
  label: string;
  inputType?: InputConfig;
  options?: { label: string; value: any }[];
  align?: 'left' | 'right' | 'center';
  record: T;
  children: React.ReactNode;
  required?: boolean;
  /** 卸载前回调，用于在虚拟滚动移除行时保存当前编辑值 */
  onUnmount?: (dataIndex: string, value: any) => void;
}

const EditableCell = <T,>({
  editing,
  dataIndex,
  label,
  inputType = { type: 'text' },
  options,
  align,
  record,
  children,
  required = true,
  onUnmount,
}: EditableCellProps<T>) => {
  const form = Form.useFormInstance();

  // 关键：Form.Item 卸载前，把当前字段值通过回调保存出去
  useEffect(() => {
    if (!editing) return;
    return () => {
      if (onUnmount && dataIndex) {
        const value = form.getFieldValue(dataIndex);
        onUnmount(dataIndex, value);
      }
    };
  }, [editing]);

  let inputNode: React.ReactNode;

  if (inputType.type === 'custom' && inputType.renderInput) {
    inputNode = inputType.renderInput(dataIndex, record);
  } else {
    switch (inputType.type) {
      case 'number':
        inputNode = (
          <InputNumber
            precision={inputType.precision ?? 0}
            min={inputType.min}
            max={inputType.max}
            style={{ width: '100%' }}
          />
        );
        break;
      case 'select':
        inputNode = <Select options={options || inputType.options} style={{ width: '100%' }} allowClear />;
        break;
      case 'date':
        inputNode = <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} allowClear />;
        break;
      default:
        inputNode = <Input allowClear />;
    }
  }

  return (
    <td style={{ padding: '4px 8px' }}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required, message: `请输入${label}` }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        <div style={{ textAlign: align }}>{children}</div>
      )}
    </td>
  );
};

export default EditableCell;
