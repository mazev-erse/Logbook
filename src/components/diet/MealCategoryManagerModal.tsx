import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import type { MealCategory } from '../../types/database';
import { CategoryIcon, CATEGORY_ICONS_LIST } from './CategoryIcon';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface MealCategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: MealCategory[];
  onAddCategory: (name: string, icon?: string) => Promise<any>;
  onUpdateCategory: (id: string, updates: Partial<{ name: string; icon: string; sequence_order: number }>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories: (id: string, direction: 'up' | 'down') => Promise<void>;
}

export const MealCategoryManagerModal: React.FC<MealCategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Utensils');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('Utensils');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(newCatName.trim(), selectedIcon);
      setNewCatName('');
      setSelectedIcon('Utensils');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (cat: MealCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingIcon(cat.icon || 'Utensils');
    setConfirmDeleteId(null);
  };

  const saveEditing = async (id: string) => {
    if (!editingName.trim()) return;
    await onUpdateCategory(id, {
      name: editingName.trim(),
      icon: editingIcon,
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      await onDeleteCategory(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container (Bottom sheet on mobile, rounded modal on desktop) */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Manage Meal Categories</h2>
              <p className="text-[11px] text-zinc-400">Add, rename, reorder, or delete custom meal sections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* 1. ADD NEW CATEGORY CARD */}
          <form
            onSubmit={handleAdd}
            className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-3.5 space-y-3"
          >
            <div className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Custom Meal</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Pre-Workout, Meal 1, Late Night..."
                maxLength={40}
                className="flex-1 h-12 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white text-xs font-bold focus:outline-none transition-colors placeholder:text-zinc-600"
              />

              <button
                type="submit"
                disabled={!newCatName.trim() || isSubmitting}
                className="h-12 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs active-press transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Icon Selector */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Choose Icon
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_ICONS_LIST.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = selectedIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedIcon(item.name)}
                      className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          {/* 2. REORDERABLE & EDITABLE CATEGORIES LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Active Categories ({categories.length})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Use arrows to reorder</span>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500 text-xs">
                No categories found. Add one above!
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat, idx) => {
                  const isEditing = editingId === cat.id;
                  const isFirst = idx === 0;
                  const isLast = idx === categories.length - 1;
                  const isConfirmingDelete = confirmDeleteId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 p-3 flex items-center justify-between gap-2 transition-all hover:border-zinc-700/80"
                    >
                      {/* Left: Drag / Order Indicator & Icon & Name */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Order badge */}
                        <span className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Category Icon */}
                        <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                          <CategoryIcon iconKey={cat.icon} categoryName={cat.name} className="w-4 h-4" />
                        </div>

                        {/* Name or Edit Input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              autoFocus
                              maxLength={40}
                              className="w-full h-9 px-2.5 rounded-lg bg-zinc-950 border border-emerald-500 text-white text-xs font-bold focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => saveEditing(cat.id)}
                              className="w-8 h-8 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black flex items-center justify-center active-press shrink-0"
                              title="Save"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center active-press shrink-0"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-white truncate">{cat.name}</div>
                          </div>
                        )}
                      </div>

                      {/* Right: Controls (Reorder up/down, Edit, Delete) */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reorder Up */}
                          <button
                            type="button"
                            onClick={() => onReorderCategories(cat.id, 'up')}
                            disabled={isFirst}
                            className="w-8 h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white active-press transition-colors"
                            aria-label={`Move ${cat.name} up`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Reorder Down */}
                          <button
                            type="button"
                            onClick={() => onReorderCategories(cat.id, 'down')}
                            disabled={isLast}
                            className="w-8 h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white active-press transition-colors"
                            aria-label={`Move ${cat.name} down`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Name */}
                          <button
                            type="button"
                            onClick={() => startEditing(cat)}
                            className="w-8 h-8 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press transition-colors"
                            aria-label={`Rename ${cat.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id)}
                            className={`h-8 px-2 rounded-lg border flex items-center justify-center gap-1 active-press transition-all ${
                              isConfirmingDelete
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold text-[10px]'
                                : 'bg-zinc-950 hover:bg-rose-950/40 border-zinc-800 hover:border-rose-800/60 text-zinc-500 hover:text-rose-400 w-8'
                            }`}
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isConfirmingDelete && <span>Sure?</span>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-bold text-xs active-press transition-colors"
          >
            Done Managing Meals
          </button>
        </div>
      </div>
    </div>
  );
};
