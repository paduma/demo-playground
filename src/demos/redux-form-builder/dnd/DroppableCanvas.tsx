import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  children: React.ReactNode;
  isOver?: boolean;
}

/** 中间预览区的可放置容器 */
const DroppableCanvas: React.FC<Props> = ({ children, isOver }) => {
  const { setNodeRef, isOver: dropping } = useDroppable({ id: 'canvas-drop-zone' });
  const active = isOver || dropping;

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 200,
        border: active ? '2px dashed #1677ff' : '2px dashed transparent',
        borderRadius: 8,
        background: active ? 'rgba(22,119,255,0.02)' : undefined,
        transition: 'all 0.2s',
        padding: active ? 8 : 0,
      }}
    >
      {children}
      {active && (
        <div style={{
          textAlign: 'center',
          padding: '12px 0',
          color: '#1677ff',
          fontSize: 12,
          borderTop: '1px dashed #91caff',
          marginTop: 8,
        }}>
          释放以添加到末尾
        </div>
      )}
    </div>
  );
};

export default DroppableCanvas;
