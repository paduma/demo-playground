import React, { useState } from 'react';
import { Resizable } from 'react-resizable';

export interface ResizableHeaderProps {
  onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width: number;
  [key: string]: any;
}

const ResizableHeader: React.FC<ResizableHeaderProps> = ({ onResize, width, ...restProps }) => {
  const [offset, setOffset] = useState(0);

  if (!width) return <th {...restProps} />;

  return (
    <Resizable
      width={width + offset}
      height={0}
      handle={
        <div
          className="react-resizable-handle"
          style={{ transform: `translateX(${offset}px)` }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={(_, { size }) => setOffset(size.width - width)}
      onResizeStop={(e, data) => {
        setOffset(0);
        onResize(e, data);
      }}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export default ResizableHeader;
