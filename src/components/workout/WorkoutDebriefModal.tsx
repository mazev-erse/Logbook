import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Sparkles,
  Flame,
  Clock,
  Layers,
  ChevronRight,
  Sliders,
  AlertCircle,
  Palette,
} from 'lucide-react';
import type { ActiveWorkout, WorkoutMood } from '../../types/database';
import {
  drawWorkoutCard,
  downloadWorkoutCardImage,
  shareWorkoutCardImage,
  copyWorkoutCardImageToClipboard,
  generateWorkoutTextSummary,
  MOOD_META,
  CARD_THEMES,
  type CardAspectRatio,
  type CardTheme,
  type WorkoutShareData,
} from '../../utils/canvasCardGenerator';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface WorkoutDebriefModalProps {
  isOpen: boolean;
  workout: ActiveWorkout;
  elapsedSeconds: number;
  onClose: () => void;
  onFinishAndSave: (debrief: {
    notes?: string;
    mood?: WorkoutMood;
    sessionRpe?: number;
  }) => Promise<void>;
  isSaving: boolean;
}

export const WorkoutDebriefModal: React.FC<WorkoutDebriefModalProps> = ({
  isOpen,
  workout,
  elapsedSeconds,
  onClose,
  onFinishAndSave,
  isSaving,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedMood, setSelectedMood] = useState<WorkoutMood>('strong');
  const [sessionRpe, setSessionRpe] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>('story');
  const [theme, setTheme] = useState<CardTheme>('emerald');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  const { getPreviousExercisePerformance } = useWorkoutHistory();

  // Compute stats & PRs for shareable card
  const shareData: WorkoutShareData = useMemo(() => {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    const exercisesWithStats = workout.exercises
      .map((ex) => {
        const completedSets = ex.sets.filter(
          (s) => s.isCompleted || Number(s.weight) > 0 || Number(s.reps) > 0
        );
        let bestWeight = 0;
        let bestReps = 0;

        for (const s of completedSets) {
          if (s.weight > bestWeight) {
            bestWeight = s.weight;
            bestReps = s.reps;
          }
        }

        const prevPerf = getPreviousExercisePerformance(ex.exercise.name);
        const hasPr =
          Boolean(prevPerf.personalRecord && prevPerf.personalRecord.maxWeight > 0) &&
          completedSets.some((s) => s.weight > prevPerf.personalRecord!.maxWeight);

        return {
          name: ex.exercise.name,
          bestWeight,
          bestReps,
          completedSetsCount: completedSets.length,
          volume: completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
          hasPr,
        };
      })
      .filter((ex) => ex.completedSetsCount > 0);

    const totalVolume = exercisesWithStats.reduce((sum, ex) => sum + ex.volume, 0);
    const totalSets = exercisesWithStats.reduce((sum, ex) => sum + ex.completedSetsCount, 0);
    const prsHitCount = exercisesWithStats.filter((ex) => ex.hasPr).length;

    const exercises = exercisesWithStats.map((ex) => ({
      name: ex.name,
      bestWeight: ex.bestWeight,
      bestReps: ex.bestReps,
      completedSetsCount: ex.completedSetsCount,
    }));

    return {
      name: workout.name,
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      durationMinutes,
      totalVolumeKg: totalVolume,
      totalSets,
      mood: selectedMood,
      sessionRpe,
      notes: notes.trim() || null,
      exercises,
      prsHitCount,
    };
  }, [workout, elapsedSeconds, selectedMood, sessionRpe, notes, getPreviousExercisePerformance]);

  // Redraw canvas whenever shareData, aspectRatio, or theme changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = aspectRatio === 'story' ? 1920 : 1080;

    drawWorkoutCard(ctx, shareData, aspectRatio, theme);
  }, [isOpen, shareData, aspectRatio, theme, showShareOptions]);

  if (!isOpen) return null;

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
      `${workout.name.toLowerCase().replace(/\s+/g, '-')}-card.png`
    );
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    const ok = await copyWorkoutCardImageToClipboard(canvasRef.current);
    if (ok) {
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2200);
    } else {
      // Fallback to text copy
      handleCopyText();
    }
  };

  const handleCopyText = async () => {
    const summary = generateWorkoutTextSummary(shareData);
    await navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      await onFinishAndSave({
        notes: notes.trim() || undefined,
        mood: selectedMood,
        sessionRpe,
      });
    } catch (err: any) {
      if (
        err?.message?.includes('Grace period expired') ||
        err?.message?.includes('check_workout_36h_grace_period') ||
        err?.code === '23514' ||
        err?.details?.includes('36')
      ) {
        setSaveError('Grace period expired. This workout can no longer be logged.');
      } else {
        setSaveError(err?.message || 'Failed to save workout.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Workout Summary</h2>
              <p className="text-[11px] text-zinc-400">Review the session and save it to your log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                Time
              </span>
              <div className="text-base font-black text-white font-mono mt-0.5">
                {shareData.durationMinutes}m
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Volume
              </span>
              <div className="text-base font-black text-white font-mono mt-0.5">
                {Math.round(shareData.totalVolumeKg).toLocaleString()}kg
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                Sets
              </span>
              <div className="text-base font-black text-white font-mono mt-0.5">
                {shareData.totalSets}
              </div>
            </div>
          </div>

          {/* 1. Post-Workout Mood Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              Post-Workout Mood
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(MOOD_META) as WorkoutMood[]).map((m) => {
                const meta = MOOD_META[m];
                const isSelected = selectedMood === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMood(m)}
                    className={`py-2 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1 active-press transition-all ${
                      isSelected
                        ? 'bg-emerald-400 text-black font-black border-emerald-400 shadow-md shadow-emerald-950/60 scale-102'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{meta.emoji}</span>
                    <span className="text-[9px] text-center leading-tight truncate w-full px-0.5">
                      {meta.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Session RPE Intensity Slider */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Session RPE (Intensity)
              </span>
              <span className="text-xs font-mono font-black text-emerald-400">
                {sessionRpe} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={sessionRpe}
              onChange={(e) => setSessionRpe(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-medium">
              <span>Light (1-3)</span>
              <span>Moderate (4-6)</span>
              <span>Hard (7-8.5)</span>
              <span>Max (9-10)</span>
            </div>
          </div>

          {/* 3. Workout Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              Session Notes & Reflection
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Felt super locked in on bench press today, rested 2 mins on top sets..."
              className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white placeholder-zinc-500 text-xs focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Sharing is optional and stays collapsed until requested. */}
          <div className="pt-1">
            <button type="button" onClick={() => setShowShareOptions((open) => !open)} aria-expanded={showShareOptions}
              className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 text-left text-sm font-semibold text-zinc-200 hover:border-zinc-700">
              <span className="flex items-center gap-2"><Share2 className="h-4 w-4 text-emerald-300" />Share workout card</span>
              <span className="text-xs text-zinc-500">{showShareOptions ? 'Hide options' : 'Optional'}</span>
            </button>
            {showShareOptions && <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                Shareable Card Preview
              </span>
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
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
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    aspectRatio === 'square'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  1:1 Post
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

            {/* Scaled Preview Canvas */}
            <div className="w-full flex justify-center bg-zinc-950 p-2 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                className="w-auto max-h-72 rounded-xl shadow-2xl object-contain border border-white/5"
              />
            </div>

            {/* Social Share & Export Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* One-Tap Share to Stories / WhatsApp */}
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="h-12 col-span-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black flex items-center justify-center gap-2 active-press shadow-lg shadow-emerald-950/60 transition-all"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
                <span>Share to Stories / Apps</span>
              </button>

              {/* Copy Image to Clipboard */}
              <button
                type="button"
                onClick={handleCopyImage}
                className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-colors ${
                  copiedImage
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
                title="Copy PNG directly to clipboard to paste in Instagram Stories"
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
                title="Save PNG image"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Save PNG</span>
              </button>
            </div>

            {/* Copy Text Summary */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-1 py-1"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    <span className="text-emerald-400 font-semibold">Summary Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-zinc-500" />
                    <span>Copy Text Summary</span>
                  </>
                )}
              </button>
            </div>
            </div>}
          </div>
        </div>

        {/* Bottom Finish & Save Action */}
        <div className="p-4 pt-2 border-t border-zinc-900 bg-zinc-950 space-y-2">
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 stroke-[2.5]" />
              <span>{saveError}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[3.5]" />
            <span>Finish & Save Workout</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutDebriefModal;
