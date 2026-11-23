import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/common/Toast';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  showUndoToast: (message: string, onUndo: () => void | Promise<void>, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', action?: ToastAction) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type, action }]);

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const showUndoToast = useCallback(
    (message: string, onUndo: () => void | Promise<void>, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type: 'info',
          action: {
            label: 'Undo',
            onClick: onUndo,
          },
        },
      ]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg: string) => console.log('[Toast]', msg),
      showUndoToast: (msg: string, onUndo: () => void) => {
        console.log('[Toast Undo]', msg);
        onUndo();
      },
      removeToast: () => {},
    };
  }
  return ctx;
}
