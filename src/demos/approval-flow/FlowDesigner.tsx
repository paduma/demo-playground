import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Card, Button, Space, Typography, Tag, Tooltip, Popconfirm, Select,
  Input, Form, Modal, Empty, message, Divider,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined,
  BranchesOutlined, MailOutlined, PlayCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import type { FlowNode, FlowEdge, FlowNodeType, ConditionRule } from './types';
import { NODE_TYPE_CONFIG, genNodeId, genEdgeId, createDefaultFlow } from './types';
import type { FieldSchema } from '../form-builder/types';

const { Text } = Typography;

const NODE_W = 200;
const NODE_H = 60;

interface Props {
  /** 表单字段列表，用于条件分支引用 */
  formFields: FieldSchema[];
}

const FlowDesigner: React.FC<Props> = ({ formFields }) => {
  const [{ nodes, edges }, setFlow] = useState(createDefaultFlow);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [editForm] = Form.useForm();

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  /* ── 添加节点 ── */
  const addNode = useCallback((type: FlowNodeType) => {
    const cfg = NODE_TYPE_CONFIG[type];
    const maxY = Math.max(...nodes.map(n => n.y), 0);
    const newNode: FlowNode = {
      id: genNodeId(),
      type,
      label: cfg.label,
      x: 300,
      y: maxY + 120,
      approveMode: type === 'approve' ? 'any' : undefined,
    };
    setFlow(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedNodeId(newNode.id);
    message.success(`已添加「${cfg.label}」节点`);
  }, [nodes]);

  /* ── 删除节点 ── */
  const deleteNode = useCallback((id: string) => {
    if (id === 'start-1' || id === 'end-1') { message.warning('起止节点不可删除'); return; }
    setFlow(prev => ({
      nodes: prev.nodes.filter(n => n.id !== id),
      edges: prev.edges.filter(e => e.from !== id && e.to !== id),
    }));
    if (selectedNodeId === id) setSelectedNodeId(null);
    message.success('已删除');
  }, [selectedNodeId]);

  /* ── 拖拽移动节点 ── */
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragState({
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragState.offsetX);
    const y = Math.max(0, e.clientY - rect.top - dragState.offsetY);
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === dragState.nodeId ? { ...n, x, y } : n),
    }));
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  /* ── 连线 ── */
  const handleConnect = useCallback((toId: string) => {
    if (!connectingFrom || connectingFrom === toId) { setConnectingFrom(null); return; }
    const exists = edges.some(e => e.from === connectingFrom && e.to === toId);
    if (exists) { message.warning('连线已存在'); setConnectingFrom(null); return; }
    setFlow(prev => ({
      ...prev,
      edges: [...prev.edges, { id: genEdgeId(), from: connectingFrom, to: toId }],
    }));
    setConnectingFrom(null);
    message.success('已连线');
  }, [connectingFrom, edges]);

  /* ── 删除连线 ── */
  const deleteEdge = useCallback((edgeId: string) => {
    setFlow(prev => ({ ...prev, edges: prev.edges.filter(e => e.id !== edgeId) }));
  }, []);

  /* ── 编辑节点 ── */
  const openEdit = useCallback((node: FlowNode) => {
    setSelectedNodeId(node.id);
    editForm.setFieldsValue({
      label: node.label,
      assignee: node.assignee || '',
      approveMode: node.approveMode || 'any',
      ccList: node.ccList?.join(', ') || '',
      condField: node.conditions?.[0]?.field || '',
      condOp: node.conditions?.[0]?.op || '==',
      condValue: node.conditions?.[0]?.value || '',
    });
    setEditModalOpen(true);
  }, [editForm]);

  const handleEditSave = useCallback(() => {
    editForm.validateFields().then(values => {
      setFlow(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => {
          if (n.id !== selectedNodeId) return n;
          const updated = { ...n, label: values.label };
          if (n.type === 'approve') {
            updated.assignee = values.assignee;
            updated.approveMode = values.approveMode;
          }
          if (n.type === 'cc') {
            updated.ccList = values.ccList ? values.ccList.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
          }
          if (n.type === 'condition' && values.condField) {
            updated.conditions = [{ field: values.condField, op: values.condOp, value: values.condValue }];
          }
          return updated;
        }),
      }));
      setEditModalOpen(false);
      message.success('已保存');
    });
  }, [editForm, selectedNodeId]);

  /* ── 绘制贝塞尔连线 ── */
  const renderEdges = () => {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.x + NODE_W / 2;
      const y1 = fromNode.y + NODE_H;
      const x2 = toNode.x + NODE_W / 2;
      const y2 = toNode.y;
      const cy = (y1 + y2) / 2;

      return (
        <g key={edge.id}>
          <path
            d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
            fill="none"
            stroke="#d9d9d9"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
          {/* 可点击的透明宽线用于删除 */}
          <path
            d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              Modal.confirm({
                title: '删除连线',
                content: `删除 ${fromNode.label} → ${toNode.label} 的连线？`,
                okText: '删除',
                okType: 'danger',
                onOk: () => deleteEdge(edge.id),
              });
            }}
          />
          {edge.label && (
            <text x={(x1 + x2) / 2} y={cy - 6} textAnchor="middle" fontSize={11} fill="#999">
              {edge.label}
            </text>
          )}
        </g>
      );
    });
  };

  /* ── 绘制节点 ── */
  const renderNodes = () => {
    return nodes.map(node => {
      const cfg = NODE_TYPE_CONFIG[node.type];
      const isSelected = selectedNodeId === node.id;
      const isConnectTarget = connectingFrom && connectingFrom !== node.id;

      return (
        <g key={node.id}>
          <foreignObject x={node.x} y={node.y} width={NODE_W} height={NODE_H}>
            <div
              onClick={e => {
                e.stopPropagation();
                if (isConnectTarget) { handleConnect(node.id); return; }
                setSelectedNodeId(node.id);
              }}
              onDoubleClick={() => openEdit(node)}
              onMouseDown={e => handleMouseDown(e, node.id)}
              style={{
                width: NODE_W,
                height: NODE_H,
                borderRadius: 8,
                border: `2px solid ${isSelected ? cfg.color : '#e8e8e8'}`,
                background: isConnectTarget ? `${cfg.color}10` : '#fff',
                boxShadow: isSelected ? `0 0 0 2px ${cfg.color}30` : '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                cursor: dragState?.nodeId === node.id ? 'grabbing' : isConnectTarget ? 'crosshair' : 'grab',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>{cfg.icon}</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.label}
                </div>
                {node.assignee && (
                  <div style={{ fontSize: 11, color: '#999' }}>{node.assignee}</div>
                )}
                {node.conditions && node.conditions.length > 0 && (
                  <div style={{ fontSize: 11, color: '#faad14' }}>
                    {node.conditions[0].field} {node.conditions[0].op} {node.conditions[0].value}
                  </div>
                )}
              </div>
              <Tag color={cfg.color} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                {cfg.label}
              </Tag>
            </div>
          </foreignObject>
        </g>
      );
    });
  };

  const canvasH = Math.max(600, Math.max(...nodes.map(n => n.y)) + 200);

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>

      {/* ── 左侧：节点面板 ── */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card size="small" title="添加节点">
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            <Button icon={<UserOutlined />} block onClick={() => addNode('approve')}>审批人</Button>
            <Button icon={<BranchesOutlined />} block onClick={() => addNode('condition')}>条件分支</Button>
            <Button icon={<MailOutlined />} block onClick={() => addNode('cc')}>抄送人</Button>
          </Space>
        </Card>

        <Card size="small" title="操作">
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {connectingFrom ? (
              <Button block type="primary" danger onClick={() => setConnectingFrom(null)}>
                取消连线
              </Button>
            ) : (
              <Tooltip title="选中一个节点后点击此按钮，再点击目标节点完成连线">
                <Button
                  block
                  disabled={!selectedNodeId}
                  onClick={() => setConnectingFrom(selectedNodeId)}
                >
                  🔗 从选中节点连线
                </Button>
              </Tooltip>
            )}
            {selectedNode && selectedNode.type !== 'start' && selectedNode.type !== 'end' && (
              <Popconfirm title={`删除「${selectedNode.label}」？`} onConfirm={() => deleteNode(selectedNode.id)} okText="删除" okType="danger">
                <Button block danger icon={<DeleteOutlined />}>删除选中节点</Button>
              </Popconfirm>
            )}
          </Space>
        </Card>

        {/* 选中节点信息 */}
        {selectedNode && (
          <Card size="small" title="节点信息">
            <div style={{ fontSize: 12, lineHeight: 2 }}>
              <div><Text type="secondary">类型：</Text>{NODE_TYPE_CONFIG[selectedNode.type].label}</div>
              <div><Text type="secondary">名称：</Text>{selectedNode.label}</div>
              {selectedNode.assignee && <div><Text type="secondary">审批人：</Text>{selectedNode.assignee}</div>}
              {selectedNode.approveMode && <div><Text type="secondary">方式：</Text>{selectedNode.approveMode === 'any' ? '或签' : selectedNode.approveMode === 'all' ? '会签' : '依次审批'}</div>}
              {selectedNode.conditions && selectedNode.conditions.length > 0 && (
                <div><Text type="secondary">条件：</Text>{selectedNode.conditions[0].field} {selectedNode.conditions[0].op} {selectedNode.conditions[0].value}</div>
              )}
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(selectedNode)} style={{ marginTop: 8 }} block>
                编辑节点
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* ── 画布 ── */}
      <Card
        style={{ flex: 1, overflow: 'auto' }}
        styles={{ body: { padding: 0, minHeight: '100%' } }}
      >
        {connectingFrom && (
          <div style={{ background: '#e6f4ff', padding: '6px 16px', fontSize: 12, borderBottom: '1px solid #91caff' }}>
            🔗 连线模式：点击目标节点完成连线，或点击空白处取消
          </div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height={canvasH}
          style={{ display: 'block', cursor: connectingFrom ? 'crosshair' : 'default' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { setSelectedNodeId(null); setConnectingFrom(null); }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#d9d9d9" />
            </marker>
          </defs>
          {renderEdges()}
          {renderNodes()}
        </svg>
      </Card>

      {/* ── 编辑弹窗 ── */}
      <Modal
        title={`编辑节点 - ${selectedNode?.label || ''}`}
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="节点名称" name="label" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>

          {selectedNode?.type === 'approve' && (
            <>
              <Form.Item label="审批人" name="assignee">
                <Input placeholder="如：直属主管、部门负责人" />
              </Form.Item>
              <Form.Item label="审批方式" name="approveMode">
                <Select options={[
                  { label: '或签（任一人通过即可）', value: 'any' },
                  { label: '会签（所有人通过）', value: 'all' },
                  { label: '依次审批', value: 'sequential' },
                ]} />
              </Form.Item>
            </>
          )}

          {selectedNode?.type === 'cc' && (
            <Form.Item label="抄送人（逗号分隔）" name="ccList">
              <Input placeholder="如：HR, 部门助理" />
            </Form.Item>
          )}

          {selectedNode?.type === 'condition' && (
            <>
              <Divider>条件规则（引用表单字段）</Divider>
              <Form.Item label="表单字段" name="condField">
                <Select
                  placeholder="选择表单字段"
                  allowClear
                  options={formFields.map(f => ({ label: `${f.label} (${f.name})`, value: f.name }))}
                />
              </Form.Item>
              <Space>
                <Form.Item label="运算符" name="condOp">
                  <Select style={{ width: 100 }} options={[
                    { label: '等于', value: '==' },
                    { label: '不等于', value: '!=' },
                    { label: '大于', value: '>' },
                    { label: '小于', value: '<' },
                    { label: '包含', value: 'in' },
                  ]} />
                </Form.Item>
                <Form.Item label="值" name="condValue">
                  <Input placeholder="比较值" />
                </Form.Item>
              </Space>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default FlowDesigner;
