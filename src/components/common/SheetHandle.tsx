import React from 'react';

interface SheetHandleProps {
  className?: string;
  handleProps?: React.DOMAttributes<HTMLDivElement>;
}

export const SheetHandle: React.FC<SheetHandleProps> = ({ className = '', handleProps }) => (
  <div
    {...handleProps}
    className={`w-full pt-3 pb-2 sm:hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0 hit-slop-48 ${className}`}
    aria-label="Drag handle to dismiss"
  >
    <div className="w-12 h-1.5 bg-zinc-700/80 hover:bg-zinc-600 active:bg-zinc-500 rounded-full transition-colors" />
  </div>
);
