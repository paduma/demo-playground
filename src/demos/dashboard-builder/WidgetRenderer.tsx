import React from 'react';
import { Table, Typography, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { Widget } from './store';

const { Text } = Typography;

/* ── Mock Data ── */
const MOCK_LINE = [30, 45, 28, 60, 72, 55, 80, 65, 90, 78, 85, 92];
const MOCK_BAR = [120, 200, 150, 80, 70, 110, 130];
const MOCK_BAR_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_PIE = [
  { name: 'Direct', value: 335, color: '#1677ff' },
  { name: 'Email', value: 310, color: '#52c41a' },
  { name: 'Search', value: 234, color: '#faad14' },
  { name: 'Other', value: 135, color: '#ff4d4f' },
];

/* ── SVG Mini Charts ── */

const MiniLineChart: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#1677ff' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 400, h = 160, pad = 12;
  const points = data.map((v, i) =>
    `${pad + (i / (data.length - 1)) * (w - pad * 2)},${pad + (1 - (v - min) / range) * (h - pad * 2)}`
  );
  const areaPath = `M ${points[0]} ${points.join(' L ')} L ${pad + (w - pad * 2)},${h - pad} L ${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`lg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#lg-${color.replace('#', '')})`} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (() => {
        const [cx, cy] = points[points.length - 1].split(',');
        return <circle cx={cx} cy={cy} r="5" fill={color} stroke="#fff" strokeWidth="2.5" />;
      })()}
    </svg>
  );
};

const MiniBarChart: React.FC<{ data: number[]; labels?: string[]; color?: string }> = ({
  data, labels = MOCK_BAR_LABELS, color = '#52c41a',
}) => {
  const max = Math.max(...data);
  const barCount = data.length;
  const w = 400, h = 160, pad = 12;
  const gap = 12;
  const barW = (w - pad * 2 - gap * (barCount - 1)) / barCount;

  return (
    <svg viewBox={`0 0 ${w} ${h + 24}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      {data.map((v, i) => {
        const barH = (v / max) * (h - pad * 2);
        const x = pad + i * (barW + gap);
        const y = h - barH - pad;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={5} opacity={0.8} />
            <text x={x + barW / 2} y={h + 8} textAnchor="middle" fontSize="12" fill="#999">
              {labels[i] || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const MiniPieChart: React.FC<{ data: typeof MOCK_PIE }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const r = 42, cx = 50, cy = 50;

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 16, padding: '8px 16px' }}>
      <svg viewBox="0 0 100 100" style={{ flex: '0 0 55%', maxHeight: '90%', aspectRatio: '1' }}>
        {data.map((d, i) => {
          const start = (acc / total) * 360;
          acc += d.value;
          const end = (acc / total) * 360;
          const largeArc = end - start > 180 ? 1 : 0;
          const x1 = cx + r * Math.cos((start - 90) * Math.PI / 180);
          const y1 = cy + r * Math.sin((start - 90) * Math.PI / 180);
          const x2 = cx + r * Math.cos((end - 90) * Math.PI / 180);
          const y2 = cy + r * Math.sin((end - 90) * Math.PI / 180);
          return (
            <path key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={d.color} stroke="#fff" strokeWidth="1.5" />
          );
        })}
        <circle cx={cx} cy={cy} r={22} fill="#fff" />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="#333">
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, overflow: 'hidden' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ color: '#666' }}>{d.name}</span>
            <span style={{ color: '#333', fontWeight: 600 }}>{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Widget Renderer ── */

interface Props {
  widget: Widget;
}

const WidgetRenderer: React.FC<Props> = ({ widget }) => {
  const { type, config } = widget;
  const color = config.color || '#1677ff';

  switch (type) {
    case 'stat-card': {
      const isUp = Math.random() > 0.4;
      const change = `${isUp ? '+' : '-'}${(Math.random() * 20 + 1).toFixed(1)}%`;
      return (
        <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>{config.title || 'Metric'}</Text>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {config.value ?? '1,234'}
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag color={isUp ? 'success' : 'error'} style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 4px' }}>
              {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {change}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>vs last week</Text>
          </div>
        </div>
      );
    }

    case 'line-chart':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13 }}>{config.title}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Last 12 days</Text>
          </div>
          <div style={{ flex: 1, padding: '4px 8px 8px' }}><MiniLineChart data={MOCK_LINE} color={color} /></div>
        </div>
      );

    case 'bar-chart':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13 }}>{config.title}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>This week</Text>
          </div>
          <div style={{ flex: 1, padding: '4px 8px 0' }}><MiniBarChart data={MOCK_BAR} color={color} /></div>
        </div>
      );

    case 'pie-chart':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ padding: '10px 14px 0', fontSize: 13, display: 'block' }}>{config.title}</Text>
          <div style={{ flex: 1 }}><MiniPieChart data={MOCK_PIE} /></div>
        </div>
      );

    case 'table':
      return (
        <div style={{ padding: '4px 8px', height: '100%', overflow: 'auto' }}>
          <Table size="small" pagination={false}
            dataSource={[
              { key: '1', name: 'Product A', sales: '¥32,000', growth: '+12%', status: 'up' },
              { key: '2', name: 'Product B', sales: '¥28,000', growth: '+8%', status: 'up' },
              { key: '3', name: 'Product C', sales: '¥15,000', growth: '-3%', status: 'down' },
              { key: '4', name: 'Product D', sales: '¥9,800', growth: '+22%', status: 'up' },
            ]}
            columns={[
              { title: 'Product', dataIndex: 'name', key: 'name', width: 100 },
              { title: 'Sales', dataIndex: 'sales', key: 'sales', width: 90 },
              {
                title: 'Growth', dataIndex: 'growth', key: 'growth', width: 80,
                render: (v: string, r: any) => (
                  <Tag color={r.status === 'up' ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>{v}</Tag>
                ),
              },
            ]}
          />
        </div>
      );

    case 'text':
      return (
        <div style={{
          padding: '12px 16px', height: '100%',
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(135deg, #f6f8fc 0%, #fff 100%)',
          borderLeft: `3px solid ${color}`,
          borderRadius: '8px',
        }}>
          <Text style={{ fontSize: 14, lineHeight: 1.6 }}>{config.title || 'Double click to edit text'}</Text>
        </div>
      );

    default:
      return <div style={{ padding: 16 }}>Unknown widget</div>;
  }
};

export default React.memo(WidgetRenderer);
