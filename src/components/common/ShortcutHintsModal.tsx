import React from 'react';
import { X, Keyboard, Compass, Dumbbell, Sparkles } from 'lucide-react';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from './SheetHandle';

interface ShortcutHintsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  badge?: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcuts: ShortcutItem[];
}

export const ShortcutHintsModal: React.FC<ShortcutHintsModalProps> = ({ isOpen, onClose }) => {
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  if (!isOpen) return null;

  const sections: ShortcutSection[] = [
    {
      title: 'Navigation',
      icon: Compass,
      shortcuts: [
        { keys: ['1'], description: 'Go to Home Dashboard' },
        { keys: ['2'], description: 'Go to Active Workout / Start' },
        { keys: ['3'], description: 'Go to Diet & Nutrition' },
        { keys: ['4'], description: 'Go to Workout History' },
        { keys: ['5'], description: 'Go to Progress & Analytics' },
        { keys: ['6'], description: 'Go to Profile' },
        { keys: ['R'], description: 'Browse Routines & Splits', badge: 'Templates' },
      ],
    },
    {
      title: 'Workout & Rest Timer',
      icon: Dumbbell,
      shortcuts: [
        { keys: ['N'], description: 'Quick-Start Empty Workout / Resume' },
        { keys: ['Space'], description: 'Add +30s to Active Rest Timer', badge: 'Timer' },
        { keys: ['Esc'], description: 'Dismiss Rest Timer or In-Flight Sheet' },
      ],
    },
    {
      title: 'Global & General',
      icon: Sparkles,
      shortcuts: [
        { keys: ['?'], description: 'Toggle Keyboard Shortcuts Sheet' },
        { keys: ['Esc'], description: 'Close any active modal or drawer' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
    >
      <div
        ref={sheetRef}
        className="w-full sm:max-w-lg bg-[#0d110e] border border-zinc-800 rounded-t-[32px] sm:rounded-[28px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        <SheetHandle handleProps={handleProps} />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-md">
              <Keyboard className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <span className="kbd-hint text-[10px]">?</span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Speed up logging and navigation with power-user keybindings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active-press transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Sections */}
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400/90">
                  <SectionIcon className="w-4 h-4 text-emerald-400" />
                  <span>{section.title}</span>
                </div>
                <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 divide-y divide-zinc-850 overflow-hidden">
                  {section.shortcuts.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {item.description}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.keys.map((key) => (
                          <kbd key={key} className="kbd-hint">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="p-4 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] font-medium">Shortcuts are disabled while editing text fields.</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Press</span>
            <kbd className="kbd-hint text-[10px]">Esc</kbd>
            <span className="text-[10px] uppercase font-bold text-zinc-500">to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
