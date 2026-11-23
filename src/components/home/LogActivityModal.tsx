import React, { useState, useEffect, useMemo } from 'react';
import { X, Flame, Clock, Zap, Plus, Activity, Footprints, Navigation } from 'lucide-react';
import type { ActivityType, ActivityIntensity } from '../../types/database';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/ProtectedRoute';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogActivity: (
    activity_type: ActivityType | string,
    duration_minutes: number,
    intensity: ActivityIntensity,
    calories_burned: number,
    distance_km?: number,
    average_speed_kmh?: number,
    calculated_steps?: number
  ) => Promise<void>;
}

const ACTIVITY_OPTIONS: { type: ActivityType; label: string; defaultBurnRate: { Low: number; Medium: number; High: number } }[] = [
  { type: 'Cricket', label: 'Cricket', defaultBurnRate: { Low: 4.5, Medium: 6.5, High: 8.5 } },
  { type: 'Football', label: 'Football / Soccer', defaultBurnRate: { Low: 7, Medium: 9.5, High: 12 } },
  { type: 'Walking', label: 'Walking (Brisk / Recovery)', defaultBurnRate: { Low: 3.5, Medium: 4.5, High: 6 } },
  { type: 'Running', label: 'Running / Jogging', defaultBurnRate: { Low: 9, Medium: 11.5, High: 14 } },
  { type: 'Swimming', label: 'Swimming', defaultBurnRate: { Low: 7, Medium: 9, High: 11.5 } },
  { type: 'Cycling', label: 'Cycling', defaultBurnRate: { Low: 6, Medium: 8, High: 10.5 } },
  { type: 'Other', label: 'Other Active Recovery', defaultBurnRate: { Low: 5, Medium: 7, High: 9 } },
];

export const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  onLogActivity,
}) => {
  const [activityType, setActivityType] = useState<ActivityType>('Cricket');
  const [duration, setDuration] = useState<string>('45');
  const [intensity, setIntensity] = useState<ActivityIntensity>('Medium');
  const [calories, setCalories] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automated Step Counter Fields
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [speedKmh, setSpeedKmh] = useState<string>('');
  const [userHeightCm, setUserHeightCm] = useState<number | null>(null);
  const { requireAuth } = useAuth();
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  const isStepActivity = activityType === 'Walking' || activityType === 'Running';

  // Fetch height when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchHeight = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const { data } = await supabase
              .from('body_metrics')
              .select('height_cm')
              .eq('user_id', session.user.id)
              .order('logged_at', { ascending: false })
              .limit(1)
              .single();
            if (data?.height_cm) {
              setUserHeightCm(Number(data.height_cm));
            } else {
              setUserHeightCm(170); // default
            }
          } else {
            setUserHeightCm(170);
          }
        } catch (err) {
          setUserHeightCm(170);
        }
      };
      fetchHeight();
      
      // Reset conditional fields
      setDistanceKm('');
      setSpeedKmh('');
    }
  }, [isOpen]);

  // Step Calculation Logic
  const calculatedSteps = useMemo(() => {
    if (!isStepActivity) return null;
    const distanceNum = parseFloat(distanceKm) || 0;
    const speedNum = parseFloat(speedKmh) || 0;
    
    if (distanceNum <= 0) return null;

    const heightMeters = (userHeightCm || 170) / 100;
    let strideMultiplier = 0.415; // default walking
    
    if (speedNum > 8 || activityType === 'Running') {
      strideMultiplier = 0.65; // running multiplier
    } else if (activityType === 'Walking' && speedNum > 0 && speedNum <= 8) {
       strideMultiplier = 0.415;
    }

    const strideLengthMeters = heightMeters * strideMultiplier;
    const distanceMeters = distanceNum * 1000;
    return Math.round(distanceMeters / strideLengthMeters);
  }, [isStepActivity, distanceKm, speedKmh, userHeightCm, activityType]);

  // Auto-estimate calories whenever activity, duration, or intensity changes unless user manually cleared it
  useEffect(() => {
    const durNum = parseFloat(duration) || 0;
    if (durNum > 0) {
      const match = ACTIVITY_OPTIONS.find((a) => a.type === activityType) || ACTIVITY_OPTIONS[6];
      const rate = match.defaultBurnRate[intensity];
      const est = Math.round(durNum * rate);
      setCalories(String(est));
    }
  }, [activityType, duration, intensity]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requireAuth(async () => {
      const durNum = parseInt(duration, 10);
      const calNum = parseFloat(calories) || 0;
      const distNum = parseFloat(distanceKm) || 0;
      const spdNum = parseFloat(speedKmh) || 0;
  
      if (isNaN(durNum) || durNum <= 0) {
        setError('Please enter a valid duration in minutes');
        return;
      }
  
      setError(null);
      setIsSubmitting(true);
  
      try {
        if (isStepActivity && distNum > 0) {
          await onLogActivity(activityType, durNum, intensity, calNum, distNum, spdNum, calculatedSteps || 0);
        } else {
          await onLogActivity(activityType, durNum, intensity, calNum);
        }
        onClose();
      } catch (err) {
        setError('Failed to log activity. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Log Sports & Recovery</h2>
              <p className="text-[11px] text-zinc-400">Track active sessions & calorie expenditure</p>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {/* 1. Activity Type Dropdown (Native HTML <select> min 48px height) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Activity Type</span>
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full h-13 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-sm font-bold focus:outline-none transition-colors"
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Step Counter Inputs */}
          {isStepActivity && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  <span>Distance (km)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full h-13 px-4 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl text-white font-mono font-black placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Speed (km/h)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={speedKmh}
                    onChange={(e) => setSpeedKmh(e.target.value)}
                    placeholder="e.g. 6.5"
                    className="w-full h-13 px-4 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl text-white font-mono font-black placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Step Display */}
          {isStepActivity && calculatedSteps !== null && calculatedSteps > 0 && (
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-900/50 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black text-blue-200 uppercase tracking-widest">Estimated Steps</span>
              </div>
              <div className="text-xl font-mono font-black text-blue-400 tracking-tight">
                {calculatedSteps.toLocaleString()}
              </div>
            </div>
          )}

          {/* 2. Duration Input (Minutes, min 48px height) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duration (Minutes)</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="1"
                max="600"
                required
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="45"
                className="w-full h-14 text-center font-mono font-black text-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
              />
              <span className="absolute right-4 text-xs font-mono text-zinc-500 pointer-events-none font-bold">
                min
              </span>
            </div>
          </div>

          {/* 3. Intensity Dropdown (Native HTML <select> min 48px height) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intensity Level</span>
            </label>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as ActivityIntensity)}
              className="w-full h-13 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-sm font-bold focus:outline-none transition-colors"
            >
              <option value="Low">Low Intensity (Casual pace, light sweat)</option>
              <option value="Medium">Medium Intensity (Steady cardio, regular game)</option>
              <option value="High">High Intensity (Sprint/match pace, vigorous)</option>
            </select>
          </div>

          {/* 4. Estimated Calories Burned (Optional numeric input, min 48px height) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Estimated Calories Burned</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Auto-calculated</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="1"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="e.g., 350"
                className="w-full h-13 text-center font-mono font-black text-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
              />
              <span className="absolute right-4 text-xs font-mono text-zinc-500 pointer-events-none font-bold">
                kcal
              </span>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>{isSubmitting ? 'Logging...' : 'Log Activity'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogActivityModal;
