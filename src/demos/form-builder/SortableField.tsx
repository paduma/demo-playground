import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FieldSchema } from './types';

interface Props {
  field: FieldSchema;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SortableField: React.FC<Props> = ({ field, isSelected, onSelect, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  // 只保留垂直位移，避免水平溢出产生横向滚动条
  const constrainedTransform = transform ? { ...transform, x: 0 } : transform;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(constrainedTransform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : undefined,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    marginBottom: 4,
    borderRadius: 6,
    border: isSelected ? '1px solid #1677ff' : '1px solid #f0f0f0',
    background: isSelected ? '#e6f4ff' : '#fff',
    cursor: 'pointer',
    fontSize: 13,
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.12)' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect} {...attributes}>
      <span {...listeners} style={{ cursor: 'grab', color: '#bbb', display: 'flex' }}>
        <HolderOutlined />
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {field.rules?.required && <span style={{ color: '#ff4d4f', marginRight: 2 }}>*</span>}
        {field.label}
      </span>
      <span style={{ color: '#999', fontSize: 11 }}>{field.type}</span>
      <DeleteOutlined
        style={{ color: '#ff4d4f', fontSize: 12 }}
        onClick={e => { e.stopPropagation(); onDelete(); }}
      />
    </div>
  );
};

export default SortableField;
