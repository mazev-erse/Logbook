import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, RotateCcw } from 'lucide-react';
import type { ToastItem, ToastType } from '../../context/ToastContext';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const TOAST_STYLES: Record<
  ToastType,
  {
    container: string;
    icon: React.ReactNode;
    title: string;
  }
> = {
  error: {
    container:
      'bg-rose-950/95 border-2 border-rose-500 text-rose-100 shadow-2xl shadow-rose-950/80',
    icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 stroke-[2.5]" />,
    title: 'Error',
  },
  warning: {
    container:
      'bg-amber-950/95 border-2 border-amber-500 text-amber-100 shadow-2xl shadow-amber-950/80',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 stroke-[2.5]" />,
    title: 'Warning',
  },
  success: {
    container:
      'bg-emerald-950/95 border-2 border-emerald-500 text-emerald-100 shadow-2xl shadow-emerald-950/80',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 stroke-[2.5]" />,
    title: 'Success',
  },
  info: {
    container:
      'bg-zinc-900/95 border-2 border-zinc-700 text-zinc-100 shadow-2xl shadow-zinc-950/80',
    icon: <Info className="w-5 h-5 text-sky-400 shrink-0 stroke-[2.5]" />,
    title: 'Notice',
  },
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const [dragY, setDragY] = React.useState(0);
  const startYRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current !== null) {
      const diff = e.touches[0].clientY - startYRef.current;
      if (diff < 0) {
        setDragY(diff);
        if (diff < -45) {
          onDismiss();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    startYRef.current = null;
    setDragY(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        transition: dragY ? 'none' : 'transform 0.15s ease',
      }}
      className={`pointer-events-auto rounded-2xl p-3.5 backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 transition-all cursor-grab active:cursor-grabbing ${style.container}`}
    >
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1 pr-1">
        <p className="text-xs font-black tracking-tight leading-snug">{toast.message}</p>
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            await toast.action?.onClick();
            onDismiss();
          }}
          className="px-2.5 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black uppercase tracking-wider active-press shrink-0 flex items-center gap-1 shadow-md shadow-emerald-950/40"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{toast.action.label}</span>
        </button>
      )}
      <button
        onClick={onDismiss}
        className="w-6 h-6 rounded-lg bg-black/30 hover:bg-black/50 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 active-press transition-colors hit-slop"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
