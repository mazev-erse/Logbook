import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Pill } from 'lucide-react';
import { supplementSchema, type SupplementFormData } from '../../lib/validationSchemas';
import { FormFieldError } from '../common/FormFieldError';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface AddSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSupplement: (name: string, dosage: string) => void;
}

const QUICK_SUGGESTIONS = [
  { name: 'Creatine Monohydrate', dosage: '5g' },
  { name: 'Whey Protein', dosage: '1 scoop' },
  { name: 'Vitamin D3', dosage: '5,000 IU' },
  { name: 'Omega-3 Fish Oil', dosage: '2 capsules' },
  { name: 'Magnesium Glycinate', dosage: '400mg' },
  { name: 'Pre-Workout', dosage: '1 scoop' },
];

export const AddSupplementModal: React.FC<AddSupplementModalProps> = ({
  isOpen,
  onClose,
  onAddSupplement,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupplementFormData>({
    resolver: zodResolver(supplementSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      dosage: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ name: '', dosage: '' });
    }
  }, [isOpen, reset]);

  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  if (!isOpen) return null;

  const onSubmit = (data: SupplementFormData) => {
    onAddSupplement(data.name.trim(), data.dosage.trim());
    onClose();
  };

  const handleSelectSuggestion = (sugName: string, sugDosage: string) => {
    setValue('name', sugName, { shouldValidate: true });
    setValue('dosage', sugDosage, { shouldValidate: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom-5 duration-200 max-h-[90vh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Add Supplement</h2>
              <p className="text-[11px] text-zinc-400">Track your daily vitamins & supplements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 overflow-y-auto flex-1" noValidate>
          {/* Quick Suggestions */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug.name, sug.dosage)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-[11px] font-medium text-zinc-300 hover:text-emerald-400 active-press transition-colors"
                >
                  {sug.name} ({sug.dosage})
                </button>
              ))}
            </div>
          </div>

          {/* Supplement Name Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Supplement Name
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g., Creatine Monohydrate"
              className={`w-full h-13 px-4 rounded-xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors ${
                errors.name
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
            />
            <FormFieldError error={errors.name?.message} />
          </div>

          {/* Dosage Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Dosage
            </label>
            <input
              {...register('dosage')}
              type="text"
              placeholder="e.g., 5g, 1 scoop, 2 capsules"
              className={`w-full h-13 px-4 rounded-xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors ${
                errors.dosage
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
            />
            <FormFieldError error={errors.dosage?.message} />
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Add to Today's Checklist</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSupplementModal;
