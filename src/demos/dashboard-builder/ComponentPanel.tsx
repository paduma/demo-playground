import React from 'react';
import { Card, Space, Button, Popconfirm, Tooltip, message } from 'antd';
import { UndoOutlined, RedoOutlined, DeleteOutlined, ClearOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { dashboardActions, historyActions, WIDGET_TEMPLATES, type AppState, type AppDispatch, type Widget } from './store';
import { clearSavedDashboard } from './hooks/useAutoSave';

/** Export dashboard as JSON file download */
function exportJson(widgets: Widget[]) {
  const json = JSON.stringify(widgets, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success('Exported');
}

/** Import dashboard from JSON file */
function importJson(dispatch: AppDispatch) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const widgets = JSON.parse(reader.result as string);
        if (!Array.isArray(widgets)) throw new Error('Invalid');
        dispatch(dashboardActions.loadPreset(widgets));
        message.success('Imported');
      } catch { message.error('Invalid JSON file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

interface Props {
  presetWidgets: Widget[];
}

const ComponentPanel: React.FC<Props> = ({ presetWidgets }) => {
  const dispatch = useDispatch<AppDispatch>();
  const widgets = useSelector((s: AppState) => s.dashboard.widgets);
  const selectedIds = useSelector((s: AppState) => s.dashboard.selectedIds);
  const canUndo = useSelector((s: AppState) => s.history.past.length > 0);
  const canRedo = useSelector((s: AppState) => s.history.future.length > 0);

  return (
    <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card size="small" title="Toolbar">
        <Space wrap>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button size="small" icon={<UndoOutlined />} disabled={!canUndo} onClick={() => dispatch(historyActions.undo())} />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Shift+Z)">
            <Button size="small" icon={<RedoOutlined />} disabled={!canRedo} onClick={() => dispatch(historyActions.redo())} />
          </Tooltip>
          {selectedIds.length > 0 && (
            <Tooltip title="Delete (Del)">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => dispatch(dashboardActions.deleteSelected())} />
            </Tooltip>
          )}
        </Space>
      </Card>

      <Card size="small" title="Components">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {WIDGET_TEMPLATES.map(t => (
            <div key={t.type} draggable
              onDragStart={e => e.dataTransfer.setData('widget-type', t.type)}
              style={{ padding: '6px 10px', border: '1px dashed #d9d9d9', borderRadius: 4, cursor: 'grab', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t.icon}</span>{t.label}
            </div>
          ))}
        </div>
      </Card>

      <Card size="small" title="Actions">
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
          <Button size="small" block onClick={() => { dispatch(dashboardActions.loadPreset(presetWidgets)); message.success('Loaded'); }}>
            Load Preset
          </Button>
          <Button size="small" block icon={<DownloadOutlined />} onClick={() => exportJson(widgets)} disabled={widgets.length === 0}>
            Export JSON
          </Button>
          <Button size="small" block icon={<UploadOutlined />} onClick={() => importJson(dispatch)}>
            Import JSON
          </Button>
          <Popconfirm title="Clear all?" onConfirm={() => { dispatch(dashboardActions.clearAll()); clearSavedDashboard(); }}>
            <Button size="small" block danger icon={<ClearOutlined />}>Clear</Button>
          </Popconfirm>
        </Space>
      </Card>
    </div>
  );
};

export default ComponentPanel;
