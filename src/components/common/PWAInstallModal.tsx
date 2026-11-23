import React from 'react';
import { X, Share, PlusSquare, Smartphone, Check, Sparkles } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, isIOS }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Install Logbook App</h3>
              <p className="text-[11px] text-zinc-400">Add to Home Screen for 0ms native app experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-zinc-300">
                  Tap the <strong className="text-white">Share button</strong> (
                  <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" />
                  ) at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-zinc-300">
                  Scroll down the menu and tap <strong className="text-white">Add to Home Screen</strong> (
                  <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />
                  ).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-zinc-300">
                  Tap <strong className="text-white">Add</strong> in the top-right corner. Logbook will appear on your phone alongside your other native apps!
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-900/50 text-[11px] text-emerald-300">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Full screen without browser bars, offline rest timers, and instant loading.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-zinc-300">
            <p>
              Logbook is ready to be installed as a standalone Progressive Web App (PWA).
            </p>
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>Fullscreen OLED interface</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>Offline caching & background rest timers</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>0ms tab switching & instant launch</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full h-12 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs active-press transition-colors shadow-lg shadow-emerald-950/60"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
