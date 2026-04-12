import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Form, Table, Typography, Popconfirm, Empty } from 'antd';
import EditableCell from './EditableCell';
import type { EditableCellProps, InputConfig } from './EditableCell';

export interface EditableColumnProps<T> {
  title: string | React.ReactNode;
  dataIndex: keyof T | string;
  editable?: boolean;
  inputType?: InputConfig;
  label?: string;
  options?: { label: string; value: any }[];
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  required?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface VirtualEditableTableProps<T> {
  dataSource: T[];
  columns: EditableColumnProps<T>[];
  rowKey?: string | ((record: T) => string);
  scrollY?: number;
  rowHeight?: number;
  bufferRows?: number;
  onSave?: (record: T) => Promise<boolean> | boolean;
  onDelete?: (record: T) => void;
  allowAddRow?: boolean;
}

const SCROLLBAR_WIDTH = 17;

const VirtualEditableTable = <T extends { key: string; isNew?: boolean }>({
  dataSource: initialDataSource,
  columns,
  rowKey = 'key',
  scrollY = 480,
  rowHeight: initialRowHeight = 39,
  bufferRows = 10,
  onSave,
  onDelete,
  allowAddRow = false,
}: VirtualEditableTableProps<T>) => {
  const [form] = Form.useForm();
  const [data, setData] = useState<T[]>(initialDataSource);
  const [editingKey, setEditingKey] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataTableRef = useRef<HTMLDivElement>(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(initialRowHeight);
  const pendingValuesRef = useRef<Record<string, any>>({});

  useEffect(() => { setData(initialDataSource); }, [initialDataSource]);

  // 用 useLayoutEffect 在绘制前同步测量行高，减少闪烁
  useLayoutEffect(() => {
    if (!dataTableRef.current) return;
    const rows = dataTableRef.current.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      let totalH = 0;
      rows.forEach((row) => { totalH += (row as HTMLElement).offsetHeight; });
      const avgHeight = totalH / rows.length;
      if (Math.abs(avgHeight - measuredRowHeight) > 1) {
        setMeasuredRowHeight(avgHeight);
      }
    }
  });

  const getRowKey = useCallback(
    (record: T): string =>
      typeof rowKey === 'function' ? rowKey(record) : String(record[rowKey as keyof T]),
    [rowKey]
  );

  const rowHeight = measuredRowHeight;
  const visibleRowCount = Math.ceil(scrollY / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
  const endIndex = Math.min(data.length, startIndex + visibleRowCount + 2 * bufferRows);
  const visibleData = data.slice(startIndex, endIndex);

  const isEditing = (record: T) => getRowKey(record) === editingKey;

  const handleCellUnmount = useCallback((dataIndex: string, value: any) => {
    pendingValuesRef.current[dataIndex] = value;
  }, []);

  useEffect(() => {
    if (!editingKey) return;
    const stillVisible = visibleData.some((item) => getRowKey(item) === editingKey);
    if (stillVisible && Object.keys(pendingValuesRef.current).length > 0) {
      const editingRecord = data.find((item) => getRowKey(item) === editingKey);
      if (editingRecord) {
        form.setFieldsValue({ ...editingRecord, ...pendingValuesRef.current });
      }
      pendingValuesRef.current = {};
    }
  }, [startIndex, endIndex, editingKey, visibleData, data, form, getRowKey]);

  const edit = (record: T) => {
    pendingValuesRef.current = {};
    form.setFieldsValue(record);
    setEditingKey(getRowKey(record));
  };

  const cancel = () => {
    if (data.some((item) => item.isNew && getRowKey(item) === editingKey)) {
      setData((prev) => prev.filter((item) => !item.isNew));
    }
    pendingValuesRef.current = {};
    setEditingKey('');
  };

  const save = async (key: string) => {
    try {
      const row = (await form.validateFields()) as T;
      const newData = [...data];
      const index = newData.findIndex((item) => key === getRowKey(item));
      if (index > -1) {
        const updatedRow = { ...newData[index], ...row, isNew: false };
        newData[index] = updatedRow;
        setData(newData);
        const result = await onSave?.(updatedRow);
        if (result !== false) {
          pendingValuesRef.current = {};
          setEditingKey('');
        }
      }
    } catch (err) {
      console.log('Validate Failed:', err);
    }
  };

  const handleDelete = (record: T) => {
    setData((prev) => prev.filter((item) => getRowKey(item) !== getRowKey(record)));
    onDelete?.(record);
  };

  // 直接同步更新 scrollTop，不经过 rAF，减少一帧延迟
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleAddRow = () => {
    const newKey = `new-${Date.now()}`;
    const newRow = {
      key: newKey,
      isNew: true,
      ...columns.reduce((acc, col) => {
        if (col.editable) {
          return { ...acc, [col.dataIndex]: col.inputType?.type === 'number' ? 0 : '' };
        }
        return acc;
      }, {}),
    } as T;
    setData((prev) => [...prev, newRow]);
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, 0);
    pendingValuesRef.current = {};
    setEditingKey(newKey);
    form.setFieldsValue(newRow);
  };

  const operationColumn: EditableColumnProps<T> = {
    title: '操作',
    dataIndex: 'operation',
    width: 100,
    align: 'center',
    render: (_, record) => {
      const key = getRowKey(record);
      const editable = isEditing(record);
      return editable ? (
        <span>
          <Typography.Link onClick={() => save(key)} style={{ marginRight: 8 }}>保存</Typography.Link>
          <Popconfirm title="确认取消?" onConfirm={cancel}><a>取消</a></Popconfirm>
        </span>
      ) : (
        <span>
          <Typography.Link onClick={() => edit(record)} disabled={editingKey !== ''} style={{ marginRight: 8 }}>编辑</Typography.Link>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </span>
      );
    },
  };

  const mergedColumns = [...columns, operationColumn].map((col) => {
    if (!col.editable) return col;
    return {
      ...col,
      onCell: (record: T): EditableCellProps<T> => ({
        record,
        dataIndex: col.dataIndex as string,
        title: col.title,
        label: col.label || String(col.title),
        inputType: col.inputType || { type: 'text' as const },
        options: col.options,
        align: col.align,
        editing: isEditing(record),
        required: col.required ?? true,
        children: null,
        onUnmount: handleCellUnmount,
      }),
    };
  });

  const paddingTop = startIndex * rowHeight;
  const paddingBottom = Math.max(0, (data.length - endIndex) * rowHeight);

  return (
    <Form form={form} component={false}>
      <div style={{ border: '1px solid #f0f0f0' }}>
        <div style={{ marginRight: SCROLLBAR_WIDTH }}>
          <Table<T>
            bordered
            size="small"
            dataSource={[]}
            columns={mergedColumns as any}
            pagination={false}
            showHeader
            tableLayout="fixed"
            components={{ body: { cell: () => null } }}
          />
        </div>
        <div
          ref={containerRef}
          style={{ overflowY: 'scroll', maxHeight: scrollY, willChange: 'transform' }}
        >
          {data.length > 0 ? (
            <div style={{ paddingTop, paddingBottom, contain: 'layout style' }}>
              <div ref={dataTableRef}>
                <Table<T>
                  components={{ body: { cell: EditableCell } }}
                  bordered
                  size="small"
                  dataSource={visibleData}
                  columns={mergedColumns as any}
                  rowClassName="editable-row"
                  pagination={false}
                  showHeader={false}
                  tableLayout="fixed"
                />
              </div>
            </div>
          ) : (
            <Empty description="暂无数据" style={{ padding: 40 }} />
          )}
        </div>
      </div>
      {allowAddRow && (
        <a
          style={{ display: 'inline-block', marginTop: 12, color: editingKey ? '#ccc' : '#1890ff' }}
          onClick={editingKey ? undefined : handleAddRow}
        >
          + 添加一行
        </a>
      )}
    </Form>
  );
};

export default VirtualEditableTable;
