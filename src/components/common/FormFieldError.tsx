import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldErrorProps {
  error?: string;
  className?: string;
}

export const FormFieldError: React.FC<FormFieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div
      className={`pt-1 px-0.5 animate-in fade-in duration-150 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 leading-tight">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 stroke-[2.5]" />
        <span>{error}</span>
      </p>
    </div>
  );
};
