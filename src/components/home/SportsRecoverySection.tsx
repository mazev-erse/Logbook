import React, { useState } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  Clock,
  Flame,
  Zap,
  Footprints,
  Trophy,
  Waves,
  Bike,
  HeartPulse,
  Moon,
} from 'lucide-react';
import { useActiveRecovery } from '../../hooks/useActiveRecovery';
import { useSleepTracker } from '../../hooks/useSleepTracker';
import { LogActivityModal } from './LogActivityModal';
import { ActivityLogSkeleton } from '../common/Skeleton';
import { LogSleepModal } from '../sleep/LogSleepModal';
import type { ActivityType, ActiveRecoveryLog } from '../../types/database';

export const SportsRecoverySection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { logs, isLoading, addActivity, deleteActivity, weeklyStats } = useActiveRecovery();
  const { latestSleep } = useSleepTracker();

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
      case 'Good':
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
      case 'Fair':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'Poor':
      default:
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
    }
  };

  const getQualityTextColor = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'text-emerald-400';
      case 'Good':
        return 'text-indigo-300';
      case 'Fair':
        return 'text-amber-400';
      case 'Poor':
      default:
        return 'text-rose-400';
    }
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Activity type icon resolver
  const getActivityIcon = (type: ActivityType | string) => {
    switch (type.toLowerCase()) {
      case 'cricket':
        return Trophy;
      case 'football':
        return Activity;
      case 'walking':
        return Footprints;
      case 'running':
        return Zap;
      case 'swimming':
        return Waves;
      case 'cycling':
        return Bike;
      default:
        return HeartPulse;
    }
  };

  // Intensity color badges
  const getIntensityBadge = (intensity: string) => {
    switch (intensity) {
      case 'High':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'Medium':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'Low':
      default:
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  // Format date helper (e.g. "Today", "Yesterday", "Mon")
  const formatDateLabel = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteActivity(id);
    setDeletingId(null);
  };

  return (
    <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-4 space-y-3.5 shadow-xl">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-7 h-7 rounded-xl bg-emerald-400/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
              Sports & Recovery
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium">
              {weeklyStats.count > 0
                ? `${weeklyStats.totalMinutes} mins • ${weeklyStats.totalCalories} kcal this week`
                : 'Log non-gym active recovery'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press shadow-md transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Log Activity</span>
        </button>
      </div>

      {/* 2. DEDICATED SLEEP CARD */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/50 via-cyan-950/30 to-zinc-950 border border-sky-500/30 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Moon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Sleep Tracker</span>
                {latestSleep && (
                  <span
                    className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md border ${getQualityBadge(
                      latestSleep.quality
                    )}`}
                  >
                    {latestSleep.quality} Quality
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                {latestSleep ? formatDateLabel(latestSleep.bedtime) : 'Track nightly rest'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSleepModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold active-press shadow-sm transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>{latestSleep ? 'Log' : 'Log Sleep'}</span>
          </button>
        </div>

        {latestSleep ? (
          <div className="flex items-center justify-between pt-1 border-t border-indigo-900/30">
            <div>
              <div className="text-lg font-black text-white font-mono tracking-tight">
                {Math.floor(latestSleep.duration_minutes / 60)}h {latestSleep.duration_minutes % 60}m
              </div>
              <div className="text-[10px] text-zinc-400">
                {formatTimeOnly(latestSleep.bedtime)} → {formatTimeOnly(latestSleep.wake_time)}
              </div>
            </div>

            <div className="text-right">
              <div className={`text-xs font-black ${getQualityTextColor(latestSleep.quality)}`}>
                {latestSleep.quality}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {latestSleep.duration_minutes >= 420
                  ? 'Optimal rest'
                  : latestSleep.duration_minutes >= 360
                  ? 'Sufficient'
                  : 'Under 6h (Deficit)'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
            <span>No sleep logged yet for last night.</span>
            <button
              onClick={() => setIsSleepModalOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-bold text-xs underline"
            >
              Track now
            </button>
          </div>
        )}
      </div>

      {/* 3. Activities List */}
      {isLoading ? (
        <div className="space-y-2.5">
          <ActivityLogSkeleton />
          <ActivityLogSkeleton />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800/80 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-600">
            <Footprints className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-zinc-300">No sports logged this week</div>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
            Played cricket, football, or went for a walk? Track your active recovery and calorie burn here.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold active-press border border-zinc-700 transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
            <span>Log Your First Activity</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((item: ActiveRecoveryLog) => {
            const Icon = getActivityIcon(item.activity_type);
            const intensityClass = getIntensityBadge(item.intensity);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-zinc-950/75 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors group"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-tight truncate">
                        {item.activity_type}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[9px] font-black font-mono border uppercase tracking-wider ${intensityClass}`}
                      >
                        {item.intensity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-0.5 text-zinc-300">
                        <Clock className="w-2.5 h-2.5 text-zinc-500" />
                        <span>{item.duration_minutes}m</span>
                      </span>

                      {item.calories_burned > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>{item.calories_burned} kcal</span>
                        </span>
                      )}

                      <span className="text-zinc-600">• {formatDateLabel(item.logged_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Delete Action Button */}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-900/60 flex items-center justify-center text-zinc-500 hover:text-rose-400 active-press transition-colors shrink-0"
                  title="Delete activity log"
                  aria-label={`Delete ${item.activity_type}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Log Activity Modal */}
      <LogActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogActivity={addActivity}
      />

      {/* 4. Log Sleep Modal */}
      <LogSleepModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
      />
    </div>
  );
};

export default SportsRecoverySection;
