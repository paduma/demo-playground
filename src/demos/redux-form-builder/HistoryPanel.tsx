import React from 'react';
import { useSelector } from 'react-redux';
import { Timeline, Typography, Empty } from 'antd';
import { selectHistoryLog } from './store';

const { Text } = Typography;

/** 操作历史面板 — 可视化展示 Redux action 日志 */
const HistoryPanel: React.FC = () => {
  const log = useSelector(selectHistoryLog);

  if (log.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作记录" style={{ padding: 24 }} />;
  }

  return (
    <div style={{ padding: '12px 16px', height: '100%', overflow: 'auto' }}>
      <Timeline
        items={[...log].reverse().map((entry, i) => ({
          color: i === 0 ? 'blue' : 'gray',
          children: (
            <div>
              <Text style={{ fontSize: 12 }}>{entry.label}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 10 }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Text>
            </div>
          ),
        }))}
      />
    </div>
  );
};

export default HistoryPanel;
