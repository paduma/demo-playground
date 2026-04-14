import React from 'react';
import { Card, Form, Input, Button, Space, Tooltip, Tag, Typography } from 'antd';
import { DeleteOutlined, VerticalAlignTopOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { dashboardActions, type AppState, type AppDispatch } from './store';

const { Text } = Typography;

const PropertyPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const widgets = useSelector((s: AppState) => s.dashboard.widgets);
  const selectedIds = useSelector((s: AppState) => s.dashboard.selectedIds);
  const selectedWidget = widgets.find(w => selectedIds.includes(w.id)) || null;

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      <Card size="small" title="Properties" style={{ height: '100%' }}>
        {selectedWidget ? (
          <div style={{ fontSize: 12 }}>
            <div style={{ marginBottom: 8 }}><Tag color="blue">{selectedWidget.type}</Tag></div>
            <Form size="small" layout="vertical">
              <Form.Item label="Title">
                <Input value={selectedWidget.config.title || ''}
                  onChange={e => dispatch(dashboardActions.updateWidgetConfig({ id: selectedWidget.id, config: { title: e.target.value } }))} />
              </Form.Item>
              {selectedWidget.type === 'stat-card' && (
                <Form.Item label="Value">
                  <Input value={String(selectedWidget.config.value ?? '')}
                    onChange={e => dispatch(dashboardActions.updateWidgetConfig({ id: selectedWidget.id, config: { value: e.target.value } }))} />
                </Form.Item>
              )}
              <Form.Item label="Color">
                <Input type="color" value={selectedWidget.config.color || '#1677ff'}
                  onChange={e => dispatch(dashboardActions.updateWidgetConfig({ id: selectedWidget.id, config: { color: e.target.value } }))} />
              </Form.Item>
              <Form.Item label="Position">
                <Text type="secondary" style={{ fontSize: 11 }}>
                  x: {selectedWidget.layout.x}, y: {selectedWidget.layout.y} | {selectedWidget.layout.w} × {selectedWidget.layout.h}
                </Text>
              </Form.Item>
            </Form>
            <Space style={{ marginTop: 8 }}>
              <Tooltip title="Bring to front">
                <Button size="small" icon={<VerticalAlignTopOutlined />} onClick={() => dispatch(dashboardActions.bringToFront(selectedWidget.id))} />
              </Tooltip>
              <Tooltip title="Send to back">
                <Button size="small" icon={<VerticalAlignBottomOutlined />} onClick={() => dispatch(dashboardActions.sendToBack(selectedWidget.id))} />
              </Tooltip>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => dispatch(dashboardActions.deleteWidget(selectedWidget.id))} />
            </Space>
          </div>
        ) : (
          <div style={{ color: '#999', fontSize: 12, textAlign: 'center', padding: 16 }}>
            <p>Select a widget to edit</p>
            <p style={{ marginTop: 8 }}>Drag components to canvas</p>
            <div style={{ marginTop: 12, textAlign: 'left', lineHeight: 2.2 }}>
              <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl+Z</kbd> Undo</div>
              <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Delete</kbd> Remove</div>
              <div><kbd style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3, border: '1px solid #d9d9d9' }}>Ctrl+A</kbd> Select all</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PropertyPanel;
