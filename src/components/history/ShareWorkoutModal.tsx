import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
} from 'lucide-react';
import { useWorkoutHistory, type PastWorkoutSession } from '../../hooks/useWorkoutHistory';
import {
  drawWorkoutCard,
  downloadWorkoutCardImage,
  shareWorkoutCardImage,
  copyWorkoutCardImageToClipboard,
  generateWorkoutTextSummary,
  CARD_THEMES,
  type CardAspectRatio,
  type CardTheme,
  type WorkoutShareData,
} from '../../utils/canvasCardGenerator';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface ShareWorkoutModalProps {
  session: PastWorkoutSession | null;
  onClose: () => void;
}

export const ShareWorkoutModal: React.FC<ShareWorkoutModalProps> = ({ session, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>('story');
  const [theme, setTheme] = useState<CardTheme>('emerald');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose });

  const { getPreviousExercisePerformance } = useWorkoutHistory();

  const shareData: WorkoutShareData | null = useMemo(() => {
    if (!session) return null;

    const exercisesWithPRs = session.exercises
      .map((ex) => {
        const completedSets = ex.sets.filter((s) => s.isCompleted);
        let bestWeight = 0;
        let bestReps = 0;

        for (const s of completedSets) {
          if (s.weight > bestWeight) {
            bestWeight = s.weight;
            bestReps = s.reps;
          }
        }

        const prevPerf = getPreviousExercisePerformance(ex.exerciseName);
        const hasPr =
          Boolean(prevPerf.personalRecord && prevPerf.personalRecord.maxWeight > 0) &&
          completedSets.some((s) => s.weight > prevPerf.personalRecord!.maxWeight);

        return {
          name: ex.exerciseName,
          bestWeight,
          bestReps,
          completedSetsCount: completedSets.length,
          hasPr,
        };
      })
      .filter((ex) => ex.completedSetsCount > 0);

    const prsHitCount = exercisesWithPRs.filter((ex) => ex.hasPr).length;
    const exercises = exercisesWithPRs.map((ex) => ({
      name: ex.name,
      bestWeight: ex.bestWeight,
      bestReps: ex.bestReps,
      completedSetsCount: ex.completedSetsCount,
    }));

    return {
      name: session.name,
      date: new Date(session.completedAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      durationMinutes: session.durationMinutes,
      totalVolumeKg: session.totalVolume,
      totalSets: session.totalSets,
      mood: session.mood || null,
      sessionRpe: session.sessionRpe || null,
      notes: session.notes || null,
      exercises,
      prsHitCount,
    };
  }, [session, getPreviousExercisePerformance]);

  useEffect(() => {
    if (!session || !shareData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = aspectRatio === 'story' ? 1920 : 1080;

    drawWorkoutCard(ctx, shareData, aspectRatio, theme);
  }, [session, shareData, aspectRatio, theme]);

  if (!session || !shareData) return null;

  const handleShare = async () => {
    if (!canvasRef.current) return;
    setIsSharing(true);
    try {
      const summary = generateWorkoutTextSummary(shareData);
      await shareWorkoutCardImage(canvasRef.current, shareData.name, summary);
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    await downloadWorkoutCardImage(
      canvasRef.current,
      `${session.name.toLowerCase().replace(/\s+/g, '-')}-card.png`
    );
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    const ok = await copyWorkoutCardImageToClipboard(canvasRef.current);
    if (ok) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2200);
    } else {
      handleCopyText();
    }
  };

  const handleCopyText = async () => {
    const summary = generateWorkoutTextSummary(shareData);
    await navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Share Workout Graphic</h2>
              <p className="text-[11px] text-zinc-400">{session.name} summary card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Format & Aspect Ratio Switcher */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Format
            </span>
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setAspectRatio('story')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === 'story'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                9:16 Story
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('square')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  aspectRatio === 'square'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                1:1 Square
              </button>
            </div>
          </div>

          {/* Theme Picker Chips */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 px-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <Palette className="w-3 h-3 text-zinc-400" />
              <span>Card Style</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {(Object.keys(CARD_THEMES) as CardTheme[]).map((tKey) => {
                const t = CARD_THEMES[tKey];
                const isSelected = theme === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTheme(tKey)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all active-press border whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas Card */}
          <div className="w-full flex justify-center bg-zinc-950 p-2 rounded-2xl border border-zinc-800/80 shadow-inner">
            <canvas
              ref={canvasRef}
              className="w-auto max-h-80 rounded-xl shadow-2xl object-contain border border-white/5"
            />
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="h-12 col-span-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black flex items-center justify-center gap-2 active-press shadow-lg shadow-emerald-950/60 transition-all"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>Share to Stories / Apps</span>
            </button>

            {/* Copy Image Button */}
            <button
              type="button"
              onClick={handleCopyImage}
              className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-colors ${
                copiedImage
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
              }`}
              title="Copy PNG directly to clipboard to paste into Instagram Story"
            >
              {copiedImage ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Image Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-sky-400" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Save PNG</span>
            </button>
          </div>

          {/* Copy Text Summary */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleCopyText}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 py-1 px-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 active-press"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span className="text-emerald-400 font-semibold">Summary Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Text Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareWorkoutModal;
