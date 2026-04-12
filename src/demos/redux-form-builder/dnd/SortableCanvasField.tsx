import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';

interface Props {
  id: string;
  children: React.ReactNode;
}

/**
 * 预览区可排序字段包装器
 *
 * - hover 时左侧 fade in 拖拽手柄（Notion 风格 ⠿）
 * - 拖拽时卡片浮起（Google Forms 风格 shadow）
 * - 只有手柄区域响应拖拽，字段内表单控件正常交互
 * - 垂直方向限制，避免水平偏移
 */
const SortableCanvasField: React.FC<Props> = ({ id, children }) => {
  const [hovered, setHovered] = useState(false);
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging, isOver,
  } = useSortable({ id, data: { type: 'canvas-field' } });

  const constrainedTransform = transform ? { ...transform, x: 0 } : transform;

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: CSS.Transform.toString(constrainedTransform),
        transition: transition || 'transform 200ms ease',
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
        borderRadius: 6,
        outline: isDragging ? '2px dashed #91caff' : undefined,
        zIndex: isDragging ? 100 : undefined,
        width: '100%',
      }}
      {...attributes}
    >
      {/* 插入指示线 */}
      {isOver && !isDragging && (
        <div style={{
          position: 'absolute',
          top: -1,
          left: 0,
          right: 0,
          height: 2,
          background: '#1677ff',
          borderRadius: 1,
          zIndex: 10,
        }} />
      )}

      {/* Notion 风格拖拽手柄 — hover 时 fade in */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        style={{
          position: 'absolute',
          left: -20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: hovered || isDragging ? 0.6 : 0,
          transition: 'opacity 0.15s ease',
          color: '#999',
          fontSize: 12,
          borderRadius: 3,
          zIndex: 5,
        }}
        title="拖拽排序"
      >
        <HolderOutlined />
      </div>

      {children}
    </div>
  );
};

export default React.memo(SortableCanvasField);
