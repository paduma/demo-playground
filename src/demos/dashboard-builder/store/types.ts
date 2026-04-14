/** Widget types available in the dashboard */
export type WidgetType = 'stat-card' | 'line-chart' | 'bar-chart' | 'pie-chart' | 'table' | 'text';

/** Position and size of a widget on the canvas */
export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Widget data model */
export interface Widget {
  id: string;
  type: WidgetType;
  layout: WidgetLayout;
  /** z-index layer order */
  zIndex: number;
  /** Widget-specific config */
  config: {
    title?: string;
    value?: string | number;
    color?: string;
    dataSource?: 'mock-sales' | 'mock-users' | 'mock-orders';
  };
}

/** Dashboard state */
export interface DashboardState {
  widgets: Widget[];
  selectedIds: string[];
  /** Grid snap size in px */
  gridSize: number;
  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;
  /** Next z-index to assign */
  nextZIndex: number;
}

/** History state (same pattern as redux-form-builder) */
export interface HistoryEntry {
  label: string;
  timestamp: number;
}

export interface HistoryState {
  past: DashboardState[];
  future: DashboardState[];
  log: HistoryEntry[];
}

export interface RootState {
  dashboard: DashboardState;
  history: HistoryState;
}

/** Widget template for the component panel */
export interface WidgetTemplate {
  type: WidgetType;
  label: string;
  icon: string;
  defaultSize: { w: number; h: number };
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  { type: 'stat-card', label: '统计卡片', icon: '📊', defaultSize: { w: 240, h: 112 } },
  { type: 'line-chart', label: '折线图', icon: '📈', defaultSize: { w: 480, h: 256 } },
  { type: 'bar-chart', label: '柱状图', icon: '📉', defaultSize: { w: 368, h: 256 } },
  { type: 'pie-chart', label: '饼图', icon: '🥧', defaultSize: { w: 320, h: 240 } },
  { type: 'table', label: '数据表格', icon: '📋', defaultSize: { w: 480, h: 240 } },
  { type: 'text', label: '文本块', icon: '📝', defaultSize: { w: 240, h: 80 } },
];

let _uid = 0;
export function genWidgetId(): string {
  return `widget_${Date.now()}_${++_uid}`;
}
