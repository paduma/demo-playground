import React from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { Tag } from 'antd';
import { FIELD_TEMPLATES } from '../../form-builder/types';
import type { FieldType } from '../../form-builder/types';

interface Props {
  activeType: FieldType | null;
}

/** 拖拽时的幽灵预览 */
const DragOverlayPreview: React.FC<Props> = ({ activeType }) => {
  if (!activeType) return null;

  const tpl = FIELD_TEMPLATES.find(t => t.type === activeType);
  if (!tpl) return null;

  return (
    <DragOverlay dropAnimation={null}>
      <div style={{
        padding: '8px 16px',
        background: '#fff',
        border: '2px solid #1677ff',
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(22,119,255,0.2)',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'grabbing',
        whiteSpace: 'nowrap',
        width: 'max-content',
      }}>
        <span>{tpl.icon}</span>
        <span>{tpl.label}</span>
        <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>新增</Tag>
      </div>
    </DragOverlay>
  );
};

export default DragOverlayPreview;
