import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { FieldType } from '../../form-builder/types';

interface Props {
  type: FieldType;
  label: string;
  icon: string;
}

/** 组件面板中可拖拽的组件项 */
const DraggableComponentItem: React.FC<Props> = ({ type, label, icon }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-field-${type}`,
    data: { type: 'new-field', fieldType: type },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        padding: '6px 8px',
        borderRadius: 4,
        border: '1px dashed #d9d9d9',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: 12,
        textAlign: 'center',
        transition: 'all 0.2s',
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#e6f4ff' : '#fff',
      }}
    >
      <span style={{ marginRight: 4 }}>{icon}</span>
      {label}
    </div>
  );
};

export default DraggableComponentItem;
