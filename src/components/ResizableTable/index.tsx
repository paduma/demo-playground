import React, { useState, useEffect, useCallback } from 'react';
import { Table, Checkbox, Popover, Button } from 'antd';
import type { TableProps, TableColumnType } from 'antd';
import ResizableHeader from './ResizableHeader';

const STORAGE_KEY_PREFIX = 'table_settings_';

export interface ResizableColumnType<T> extends TableColumnType<T> {
  key: string;
  label?: string;
}

export interface ResizableTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  tableId: string;
  columns: ResizableColumnType<T>[];
  persistSettings?: boolean;
}

interface TableSettings {
  selectedColumns: string[];
  columnWidths: Record<string, number>;
}

const loadSettings = (tableId: string): TableSettings | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + tableId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSettings = (tableId: string, settings: TableSettings) => {
  localStorage.setItem(STORAGE_KEY_PREFIX + tableId, JSON.stringify(settings));
};

const ResizableTable = <T extends object>({
  tableId,
  columns: defaultColumns,
  persistSettings = true,
  ...tableProps
}: ResizableTableProps<T>) => {
  const allKeys = defaultColumns.map((c) => c.key);

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const saved = loadSettings(tableId);
    return saved?.selectedColumns ?? allKeys;
  });

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = loadSettings(tableId);
    return saved?.columnWidths ?? {};
  });

  // 持久化
  useEffect(() => {
    if (persistSettings) {
      saveSettings(tableId, { selectedColumns, columnWidths });
    }
  }, [selectedColumns, columnWidths, tableId, persistSettings]);

  const handleResize = useCallback(
    (key: string) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        setColumnWidths((prev) => ({ ...prev, [key]: size.width }));
      },
    []
  );

  const handleColumnToggle = (key: string, checked: boolean) => {
    setSelectedColumns((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const mergedColumns = defaultColumns
    .filter((col) => selectedColumns.includes(col.key))
    .map((col) => ({
      ...col,
      width: columnWidths[col.key] || col.width,
      onHeaderCell: (column: any) => ({
        width: column.width,
        onResize: handleResize(col.key),
      }),
    }));

  const columnSelector = (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="自定义列"
      content={
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {defaultColumns.map((col) => (
            <div key={col.key} style={{ marginBottom: 6 }}>
              <Checkbox
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => handleColumnToggle(col.key, e.target.checked)}
              >
                {col.label || String(col.title)}
              </Checkbox>
            </div>
          ))}
        </div>
      }
    >
      <Button size="small" style={{ marginBottom: 8 }}>自定义列</Button>
    </Popover>
  );

  return (
    <div>
      {columnSelector}
      <Table<T>
        {...tableProps}
        columns={mergedColumns as any}
        components={{ header: { cell: ResizableHeader } }}
        bordered
        size="small"
        tableLayout="fixed"
      />
    </div>
  );
};

export default ResizableTable;
