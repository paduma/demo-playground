import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Table, Card, Button, Checkbox, Tag, Progress, Space, Popover, Tooltip,
  message, Badge, Typography, Divider, Select, Input, DatePicker, Row, Col, Form,
  Segmented, Empty, Modal,
} from 'antd';
import {
  SettingOutlined, ReloadOutlined, HolderOutlined,
  EyeInvisibleOutlined, SearchOutlined, DownOutlined, UpOutlined,
  FilterOutlined, ColumnHeightOutlined, ExportOutlined, DeleteOutlined,
  CheckSquareOutlined, MinusSquareOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnsType } from 'antd/es/table';
import type { SizeType } from 'antd/es/config-provider/SizeContext';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/* ── 数据类型 ── */
interface OrderRecord {
  key: string;
  orderNo: string;
  customer: string;
  product: string;
  amount: number;
  quantity: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  createDate: string;
  deliveryDate: string;
  salesperson: string;
  region: string;
}

interface ColumnMeta {
  key: string;
  title: string;
  visible: boolean;
  fixed?: 'left' | 'right' | false;
}

interface FilterMeta {
  key: string;
  label: string;
  visible: boolean;
  type: 'input' | 'select' | 'dateRange';
  options?: { label: string; value: string }[];
}

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '待处理' },
  processing: { color: 'processing', text: '生产中' },
  shipped: { color: 'warning', text: '已发货' },
  completed: { color: 'success', text: '已完成' },
  cancelled: { color: 'error', text: '已取消' },
};

const PRIORITY_MAP: Record<string, { color: string; text: string }> = {
  low: { color: 'green', text: '普通' },
  medium: { color: 'orange', text: '加急' },
  high: { color: 'red', text: '特急' },
};

const COL_STORAGE_KEY = 'configurable-table-columns';
const FILTER_STORAGE_KEY = 'configurable-table-filters';

/* ── 确定性伪随机（固定种子） ── */
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/* ── Mock 数据（确定性） ── */
const PRODUCTS = ['精密轴承 A-100', '液压阀 B-200', '传感器 C-300', '控制器 D-400', '电机 E-500'];
const NAMES = ['张伟', '李娜', '王强', '赵敏', '刘洋', '陈静'];
const REGIONS = ['华北', '华东', '华南', '西南', '东北'];

const MOCK_DATA: OrderRecord[] = Array.from({ length: 30 }, (_, i) => {
  const statuses: OrderRecord['status'][] = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
  const priorities: OrderRecord['priority'][] = ['low', 'medium', 'high'];
  const status = statuses[i % 5];
  const month = (i % 12) + 1;
  const day = (i % 28) + 1;
  const delMonth = month === 12 ? 1 : month + 1;
  return {
    key: `order-${i + 1}`,
    orderNo: `ORD-2026-${String(i + 1).padStart(4, '0')}`,
    customer: `客户${String.fromCharCode(65 + (i % 10))}公司`,
    product: PRODUCTS[i % 5],
    amount: Math.round(seededRandom(i + 1) * 50000 + 5000),
    quantity: Math.floor(seededRandom(i + 100) * 200) + 10,
    status,
    progress: status === 'completed' ? 100 : status === 'cancelled' ? 0 : Math.floor(seededRandom(i + 200) * 80) + 10,
    priority: priorities[i % 3],
    createDate: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    deliveryDate: `2026-${String(delMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    salesperson: NAMES[i % 6],
    region: REGIONS[i % 5],
  };
});

/* ── 默认列顺序 ── */
const DEFAULT_COLUMNS: ColumnMeta[] = [
  { key: 'orderNo', title: '订单号', visible: true, fixed: 'left' },
  { key: 'customer', title: '客户', visible: true },
  { key: 'product', title: '产品', visible: true },
  { key: 'amount', title: '金额', visible: true },
  { key: 'quantity', title: '数量', visible: true },
  { key: 'status', title: '状态', visible: true },
  { key: 'progress', title: '进度', visible: true },
  { key: 'priority', title: '优先级', visible: true },
  { key: 'createDate', title: '创建日期', visible: true },
  { key: 'deliveryDate', title: '交付日期', visible: false },
  { key: 'salesperson', title: '销售员', visible: false },
  { key: 'region', title: '区域', visible: false },
  { key: 'action', title: '操作', visible: true, fixed: 'right' },
];

/* ── 默认查询条件 ── */
const DEFAULT_FILTERS: FilterMeta[] = [
  { key: 'orderNo', label: '订单号', visible: true, type: 'input' },
  { key: 'customer', label: '客户', visible: true, type: 'input' },
  { key: 'status', label: '状态', visible: true, type: 'select', options: Object.entries(STATUS_MAP).map(([k, v]) => ({ label: v.text, value: k })) },
  { key: 'priority', label: '优先级', visible: true, type: 'select', options: Object.entries(PRIORITY_MAP).map(([k, v]) => ({ label: v.text, value: k })) },
  { key: 'product', label: '产品', visible: false, type: 'select', options: PRODUCTS.map(p => ({ label: p, value: p })) },
  { key: 'region', label: '区域', visible: false, type: 'select', options: REGIONS.map(r => ({ label: r, value: r })) },
  { key: 'salesperson', label: '销售员', visible: false, type: 'input' },
  { key: 'createDate', label: '创建日期', visible: false, type: 'dateRange' },
];

/* ── 可拖拽列配置项 ── */
const SortableColumnItem: React.FC<{
  meta: ColumnMeta;
  onToggle: () => void;
  onFixedChange: (fixed: 'left' | 'right' | false) => void;
}> = ({ meta, onToggle, onFixedChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: meta.key });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    marginBottom: 2,
    borderRadius: 4,
    background: isDragging ? '#e6f4ff' : '#fff',
    fontSize: 13,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ cursor: 'grab', color: '#bbb', display: 'flex' }}>
        <HolderOutlined />
      </span>
      <Checkbox checked={meta.visible} onChange={onToggle} />
      <span style={{ flex: 1 }}>{meta.title}</span>
      <Select
        size="small"
        variant="borderless"
        style={{ width: 70 }}
        value={meta.fixed || false}
        onChange={onFixedChange}
        options={[
          { label: '-', value: false as unknown as string },
          { label: '左', value: 'left' },
          { label: '右', value: 'right' },
        ]}
        popupMatchSelectWidth={false}
      />
    </div>
  );
};

/* ── 查询条件渲染 ── */
const FilterField: React.FC<{ meta: FilterMeta }> = ({ meta }) => {
  switch (meta.type) {
    case 'select':
      return (
        <Select
          allowClear
          placeholder={`请选择${meta.label}`}
          style={{ width: '100%' }}
          options={meta.options}
        />
      );
    case 'dateRange':
      return <RangePicker style={{ width: '100%' }} />;
    default:
      return <Input allowClear placeholder={`请输入${meta.label}`} />;
  }
};

/* ── 主组件 ── */
const ConfigurableTableDemo: React.FC = () => {
  const [columnMetas, setColumnMetas] = useState<ColumnMeta[]>(() => {
    try {
      const saved = localStorage.getItem(COL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_COLUMNS;
  });
  const [filterMetas, setFilterMetas] = useState<FilterMeta[]>(() => {
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_FILTERS;
  });
  const [colSettingsOpen, setColSettingsOpen] = useState(false);
  const [filterSettingsOpen, setFilterSettingsOpen] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [filteredData, setFilteredData] = useState<OrderRecord[]>(MOCK_DATA);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [tableSize, setTableSize] = useState<SizeType>('middle');

  const [form] = Form.useForm();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 持久化
  useEffect(() => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(columnMetas));
  }, [columnMetas]);
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterMetas));
  }, [filterMetas]);

  const visibleFilters = useMemo(() => filterMetas.filter(f => f.visible), [filterMetas]);
  const displayedFilters = filterExpanded ? visibleFilters : visibleFilters.slice(0, 3);
  const hasMoreFilters = visibleFilters.length > 3;

  /* ── 查询逻辑 ── */
  const doSearch = useCallback((values: Record<string, unknown>) => {
    setFilterValues(values);
    let data = [...MOCK_DATA];
    Object.entries(values).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') return;
      if (key === 'createDate' && Array.isArray(val) && val.length === 2) {
        const [start, end] = val;
        data = data.filter(r => r.createDate >= start.format('YYYY-MM-DD') && r.createDate <= end.format('YYYY-MM-DD'));
      } else if (typeof val === 'string') {
        data = data.filter(r => {
          const fv = r[key as keyof OrderRecord];
          return typeof fv === 'string' ? fv.toLowerCase().includes(val.toLowerCase()) : true;
        });
      }
    });
    setFilteredData(data);
    setSelectedRowKeys([]);
    message.success(`查询到 ${data.length} 条记录`);
  }, []);

  const handleSearch = useCallback(() => {
    doSearch(form.getFieldsValue());
  }, [form, doSearch]);

  const handleReset = useCallback(() => {
    form.resetFields();
    setFilterValues({});
    setFilteredData(MOCK_DATA);
    setSelectedRowKeys([]);
    message.info('已重置查询条件');
  }, [form]);

  /* ── 列操作 ── */
  const toggleColVisible = useCallback((key: string) => {
    setColumnMetas(prev => {
      const next = prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c);
      // 防止全部隐藏
      if (next.every(c => !c.visible)) {
        message.warning('至少保留一列');
        return prev;
      }
      return next;
    });
  }, []);

  const setAllColVisible = useCallback((visible: boolean) => {
    if (!visible) { message.warning('至少保留一列'); return; }
    setColumnMetas(prev => prev.map(c => ({ ...c, visible })));
  }, []);

  const setColFixed = useCallback((key: string, fixed: 'left' | 'right' | false) => {
    setColumnMetas(prev => prev.map(c => c.key === key ? { ...c, fixed } : c));
  }, []);

  const handleColDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnMetas(prev => arrayMove(prev, prev.findIndex(c => c.key === active.id), prev.findIndex(c => c.key === over.id)));
  }, []);

  const resetColumns = useCallback(() => {
    setColumnMetas(DEFAULT_COLUMNS);
    localStorage.removeItem(COL_STORAGE_KEY);
    message.success('已重置列配置');
  }, []);

  /* ── 查询条件配置 ── */
  const toggleFilterVisible = useCallback((key: string) => {
    setFilterMetas(prev => {
      const next = prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f);
      // 隐藏条件时清除对应表单值
      const target = prev.find(f => f.key === key);
      if (target?.visible) {
        form.setFieldValue(key, undefined);
      }
      return next;
    });
  }, [form]);

  const resetFilters = useCallback(() => {
    setFilterMetas(DEFAULT_FILTERS);
    localStorage.removeItem(FILTER_STORAGE_KEY);
    form.resetFields();
    setFilterValues({});
    setFilteredData(MOCK_DATA);
    setSelectedRowKeys([]);
    message.success('已重置查询条件');
  }, [form]);

  /* ── 批量操作 ── */
  const handleBatchDelete = useCallback(() => {
    Modal.confirm({
      title: '批量删除',
      content: `确定删除选中的 ${selectedRowKeys.length} 条记录？`,
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        setFilteredData(prev => prev.filter(r => !selectedRowKeys.includes(r.key)));
        setSelectedRowKeys([]);
        message.success(`已删除 ${selectedRowKeys.length} 条记录`);
      },
    });
  }, [selectedRowKeys]);

  const handleBatchExport = useCallback(() => {
    message.success(`已导出 ${selectedRowKeys.length > 0 ? selectedRowKeys.length : filteredData.length} 条记录（模拟）`);
  }, [selectedRowKeys, filteredData]);

  /* ── 操作列回调 ── */
  const handleView = useCallback((r: OrderRecord) => {
    Modal.info({
      title: `订单详情 - ${r.orderNo}`,
      width: 480,
      content: (
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <p>客户：{r.customer}</p>
          <p>产品：{r.product}</p>
          <p>金额：¥{r.amount.toLocaleString()}</p>
          <p>数量：{r.quantity}</p>
          <p>状态：{STATUS_MAP[r.status].text}</p>
          <p>优先级：{PRIORITY_MAP[r.priority].text}</p>
          <p>创建日期：{r.createDate}</p>
          <p>交付日期：{r.deliveryDate}</p>
          <p>销售员：{r.salesperson}</p>
          <p>区域：{r.region}</p>
        </div>
      ),
    });
  }, []);

  /* ── 构建 antd columns ── */
  const columns = useMemo<ColumnsType<OrderRecord>>(() => {
    const colDef: Record<string, Omit<ColumnsType<OrderRecord>[number], 'key' | 'dataIndex'>> = {
      orderNo: { width: 160, ellipsis: true },
      customer: { width: 130, ellipsis: true },
      product: { width: 150, ellipsis: true },
      amount: {
        width: 120,
        align: 'right',
        render: (v: number) => <Text strong>¥{v.toLocaleString()}</Text>,
        sorter: (a: OrderRecord, b: OrderRecord) => a.amount - b.amount,
      },
      quantity: {
        width: 80,
        align: 'right',
        sorter: (a: OrderRecord, b: OrderRecord) => a.quantity - b.quantity,
      },
      status: {
        width: 100,
        render: (_: unknown, r: OrderRecord) => <Tag color={STATUS_MAP[r.status].color}>{STATUS_MAP[r.status].text}</Tag>,
      },
      progress: {
        width: 160,
        render: (_: unknown, r: OrderRecord) => (
          <Progress
            percent={r.progress}
            size="small"
            status={r.status === 'cancelled' ? 'exception' : r.progress === 100 ? 'success' : 'active'}
          />
        ),
        sorter: (a: OrderRecord, b: OrderRecord) => a.progress - b.progress,
      },
      priority: {
        width: 80,
        render: (_: unknown, r: OrderRecord) => <Tag color={PRIORITY_MAP[r.priority].color}>{PRIORITY_MAP[r.priority].text}</Tag>,
      },
      createDate: { width: 120, sorter: (a: OrderRecord, b: OrderRecord) => a.createDate.localeCompare(b.createDate) },
      deliveryDate: { width: 120 },
      salesperson: { width: 90 },
      region: { width: 80 },
      action: {
        width: 150,
        render: (_: unknown, r: OrderRecord) => (
          <Space size="small">
            <a onClick={() => handleView(r)}>详情</a>
            <a onClick={() => message.info(`编辑 ${r.orderNo}（模拟）`)}>编辑</a>
            <a style={{ color: '#ff4d4f' }} onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定删除订单 ${r.orderNo}？`,
                okText: '删除',
                okType: 'danger',
                onOk: () => {
                  setFilteredData(prev => prev.filter(d => d.key !== r.key));
                  message.success('已删除');
                },
              });
            }}>删除</a>
          </Space>
        ),
      },
    };

    return columnMetas
      .filter(m => m.visible)
      .map(m => ({
        key: m.key,
        dataIndex: m.key === 'action' ? undefined : m.key,
        title: m.title,
        fixed: m.fixed || undefined,
        ...colDef[m.key],
      }));
  }, [columnMetas, handleView]);

  const visibleColCount = columnMetas.filter(c => c.visible).length;
  const hiddenColCount = columnMetas.length - visibleColCount;
  const hiddenFilterCount = filterMetas.length - filterMetas.filter(f => f.visible).length;
  const hasActiveFilters = Object.values(filterValues).some(v => v !== undefined && v !== null && v !== '');
  const allColsVisible = columnMetas.every(c => c.visible);

  /* ── 列配置面板 ── */
  const colSettingsContent = (
    <div style={{ width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space size="small">
          <Text strong>列配置</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{visibleColCount}/{columnMetas.length}</Text>
        </Space>
        <Space size="small">
          <Tooltip title={allColsVisible ? '取消全选' : '全选'}>
            <Button
              size="small"
              type="text"
              icon={allColsVisible ? <MinusSquareOutlined /> : <CheckSquareOutlined />}
              onClick={() => setAllColVisible(!allColsVisible)}
            />
          </Tooltip>
          <Button size="small" icon={<ReloadOutlined />} onClick={resetColumns}>重置</Button>
        </Space>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ fontSize: 11, color: '#999', marginBottom: 6, display: 'flex', gap: 40 }}>
        <span style={{ marginLeft: 36 }}>显示</span>
        <span style={{ flex: 1 }}>列名</span>
        <span>固定</span>
      </div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
          <SortableContext items={columnMetas.map(c => c.key)} strategy={verticalListSortingStrategy}>
            {columnMetas.map(meta => (
              <SortableColumnItem
                key={meta.key}
                meta={meta}
                onToggle={() => toggleColVisible(meta.key)}
                onFixedChange={(f) => setColFixed(meta.key, f)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );

  /* ── 查询条件配置面板 ── */
  const filterSettingsContent = (
    <div style={{ width: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>查询条件配置</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      {filterMetas.map(meta => (
        <div key={meta.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <Checkbox checked={meta.visible} onChange={() => toggleFilterVisible(meta.key)} />
          <span style={{ fontSize: 13, flex: 1 }}>{meta.label}</span>
          <Tag style={{ fontSize: 11 }}>{meta.type === 'input' ? '文本' : meta.type === 'select' ? '下拉' : '日期'}</Tag>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 查询条件区 ── */}
      <Card size="small">
        <Form form={form} layout="horizontal" labelCol={{ span: 7 }} wrapperCol={{ span: 17 }} onFinish={doSearch}>
          <Row gutter={16}>
            {displayedFilters.map(meta => (
              <Col key={meta.key} span={6}>
                <Form.Item label={meta.label} name={meta.key} style={{ marginBottom: 8 }}>
                  <FilterField meta={meta} />
                </Form.Item>
              </Col>
            ))}
            {/* 操作按钮 — 始终在最后一列 */}
            <Col span={6} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
              <Button type="primary" icon={<SearchOutlined />} htmlType="submit">查询</Button>
              <Button onClick={handleReset}>重置</Button>
              {hasMoreFilters && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setFilterExpanded(!filterExpanded)}
                  icon={filterExpanded ? <UpOutlined /> : <DownOutlined />}
                  style={{ padding: '4px 0' }}
                >
                  {filterExpanded ? '收起' : `展开(${visibleFilters.length - 3})`}
                </Button>
              )}
              <Popover
                content={filterSettingsContent}
                trigger="click"
                open={filterSettingsOpen}
                onOpenChange={setFilterSettingsOpen}
                placement="bottomRight"
              >
                <Tooltip title="配置查询条件显隐">
                  <Button type="text" size="small" icon={<FilterOutlined />} style={{ color: '#999' }}>
                    {hiddenFilterCount > 0 && <span style={{ fontSize: 11, color: '#ff4d4f' }}>+{hiddenFilterCount}</span>}
                  </Button>
                </Tooltip>
              </Popover>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* ── 工具栏 ── */}
      <Card size="small" styles={{ body: { padding: '8px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            <Space>
              <Text strong style={{ fontSize: 15 }}>订单管理</Text>
              <Badge
                count={hasActiveFilters ? `${filteredData.length}/${MOCK_DATA.length}` : filteredData.length}
                style={{ backgroundColor: hasActiveFilters ? '#faad14' : '#1677ff' }}
                overflowCount={9999}
              />
            </Space>
            {/* 批量操作 */}
            {selectedRowKeys.length > 0 && (
              <Space size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>已选 {selectedRowKeys.length} 项</Text>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>批量删除</Button>
                <Button size="small" icon={<ExportOutlined />} onClick={handleBatchExport}>导出选中</Button>
              </Space>
            )}
          </Space>
          <Space size="small">
            {selectedRowKeys.length === 0 && (
              <Button size="small" icon={<ExportOutlined />} onClick={handleBatchExport}>导出全部</Button>
            )}
            <Tooltip title="表格密度">
              <Segmented
                size="small"
                value={tableSize}
                onChange={v => setTableSize(v as SizeType)}
                options={[
                  { label: <Tooltip title="紧凑"><ColumnHeightOutlined style={{ fontSize: 12 }} /></Tooltip>, value: 'small' },
                  { label: <Tooltip title="默认"><ColumnHeightOutlined /></Tooltip>, value: 'middle' },
                  { label: <Tooltip title="宽松"><ColumnHeightOutlined style={{ fontSize: 18 }} /></Tooltip>, value: 'large' },
                ]}
              />
            </Tooltip>
            <Popover
              content={colSettingsContent}
              trigger="click"
              open={colSettingsOpen}
              onOpenChange={setColSettingsOpen}
              placement="bottomRight"
            >
              <Button icon={<SettingOutlined />}>
                表头配置
                {hiddenColCount > 0 && (
                  <Badge count={hiddenColCount} size="small" offset={[4, -2]}>
                    <EyeInvisibleOutlined style={{ color: '#999', marginLeft: 4 }} />
                  </Badge>
                )}
              </Button>
            </Popover>
          </Space>
        </div>
      </Card>

      {/* ── 表格 ── */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<OrderRecord>
          columns={columns}
          dataSource={filteredData}
          scroll={{ x: 'max-content' }}
          size={tableSize}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            columnWidth: 48,
          }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条`,
            showQuickJumper: true,
            size: 'default',
            style: { paddingRight: 16 },
          }}
          bordered
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={hasActiveFilters ? '未找到匹配的记录，请调整查询条件' : '暂无数据'}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default ConfigurableTableDemo;
