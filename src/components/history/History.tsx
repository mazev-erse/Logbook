import React, { useState } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Layers,
  Flame,
  Calendar,
  Sparkles,
  CheckCircle2,
  Share2,
  Trash2,
  Utensils,
  Pill,
  Download,
} from 'lucide-react';
import { useWorkoutHistory, type PastWorkoutSession } from '../../hooks/useWorkoutHistory';
import { ShareWorkoutModal } from './ShareWorkoutModal';
import { DietHistoryList } from './DietHistoryList';
import { SupplementHistoryList } from './SupplementHistoryList';
import { MOOD_META } from '../../utils/canvasCardGenerator';
import { downloadCSV } from '../../utils/csvExport';
import { transitionView } from '../../lib/utils';
import { WorkoutCardSkeleton } from '../common/Skeleton';

export interface HistoryProps {
  onStartWorkout?: (name?: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onStartWorkout }) => {
  const { sessions, isLoading, deleteWorkout } = useWorkoutHistory();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedShareSession, setSelectedShareSession] = useState<PastWorkoutSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PastWorkoutSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'workouts' | 'diet' | 'supplements'>('workouts');

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  const handleDownloadCSV = async () => {
    try {
      const { supabase, getAuthUser } = await import('../../lib/supabaseClient');
      const user = await getAuthUser();
      if (!user) return alert('Not logged in');
  
      if (activeTab === 'diet') {
        const { data } = await supabase.from('diet_logs').select('food_name,meal_type,calories,protein,carbs,fats,logged_at').eq('user_id', user.id).order('logged_at', { ascending: false });
        if (data && data.length > 0) downloadCSV(data, 'diet_history.csv');
        else alert('No diet history to download.');
      } else if (activeTab === 'supplements') {
        const { data } = await supabase.from('supplement_logs').select('name,dosage,taken,logged_at').eq('user_id', user.id).order('logged_at', { ascending: false });
        if (data && data.length > 0) downloadCSV(data, 'supplement_history.csv');
        else alert('No supplement history to download.');
      } else {
         if (sessions.length === 0) return alert('No workout history to download.');
         const flatSessions = sessions.map(s => ({
           name: s.name,
           started_at: s.startedAt,
           completed_at: s.completedAt,
           duration_minutes: s.durationMinutes,
           total_volume: s.totalVolume,
           total_sets: s.totalSets,
           session_rpe: s.sessionRpe || '',
           mood: s.mood || ''
         }));
         downloadCSV(flatSessions, 'workout_history.csv');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to download CSV');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="pb-28 px-4 pt-4 space-y-4">
      {/* Top Header & Tabs */}
      <div className="px-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Logbook History</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Chronological records of your fitness journey
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadCSV}
              className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Download CSV"
            >
              <Download className="w-4 h-4 text-sky-400" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 border border-zinc-800/80 w-full overflow-x-auto no-scrollbar">
          <button
            onClick={() => transitionView(() => setActiveTab('workouts'))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all min-w-max ${
              activeTab === 'workouts'
                ? 'bg-zinc-800 text-emerald-400 shadow-md shadow-black/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Workouts
          </button>
          <button
            onClick={() => transitionView(() => setActiveTab('diet'))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all min-w-max ${
              activeTab === 'diet'
                ? 'bg-zinc-800 text-amber-400 shadow-md shadow-black/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Diet
          </button>
          <button
            onClick={() => transitionView(() => setActiveTab('supplements'))}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all min-w-max ${
              activeTab === 'supplements'
                ? 'bg-zinc-800 text-indigo-400 shadow-md shadow-black/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            Supplements
          </button>
        </div>
      </div>

      {activeTab === 'workouts' && (
        <>
          {isLoading ? (
        <div className="space-y-3.5">
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
            <Dumbbell className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-200">No workout history yet</div>
            <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Complete your first workout to view your chronological logbook, volume breakdowns, and set records.
            </div>
          </div>
          {onStartWorkout && (
            <button
              onClick={() => onStartWorkout("Today's Workout")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold shadow-lg shadow-emerald-950/50 active-press transition-colors"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Log First Workout</span>
            </button>
          )}
        </div>
      ) : (
        /* Chronological Feed */
        <div className="space-y-3">
          {sessions.map((session: PastWorkoutSession) => {
            const isExpanded = expandedSessionId === session.id;

            // Extract primary muscle groups from exercises
            const categories = Array.from(
              new Set(session.exercises.map((e) => e.exerciseCategory).filter(Boolean))
            ).slice(0, 3);

            return (
              <div
                key={session.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  isExpanded
                    ? 'bg-zinc-900/90 border-emerald-500/40 shadow-emerald-950/20'
                    : 'bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                {/* Compact Session Summary Card (Progressive Disclosure) */}
                <button
                  onClick={() => toggleExpand(session.id)}
                  className="w-full p-4 text-left flex items-center justify-between active-press"
                  aria-expanded={isExpanded}
                >
                  <div className="space-y-1.5 flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-white tracking-tight">
                        {session.name}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50 font-mono">
                        {formatDate(session.completedAt)}
                      </span>
                      {session.totalSets === 0 && (
                        <span className="text-[10px] font-black text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/50 font-mono">
                          0 sets
                        </span>
                      )}
                    </div>

                    {categories.length > 0 && (
                      <div className="text-[11px] font-medium text-zinc-400 capitalize">
                        {categories.join(' • ')}
                      </div>
                    )}

                    {/* Compact Metrics Row */}
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono pt-0.5">
                      <div className="flex items-center gap-1 text-zinc-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{session.durationMinutes}m</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-zinc-300">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{session.totalSets} sets</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-zinc-300">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{Math.round(session.totalVolume).toLocaleString()}kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShareSession(session);
                      }}
                      className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors active-press"
                      title="Share Workout Graphic"
                      aria-label="Share Workout Graphic"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Expand/Collapse Chevron Indicator */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isExpanded
                          ? 'bg-emerald-400 text-black scale-105'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expandable Details: Specific Exercises, Sets, Weights, and Reps */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-zinc-800/80 bg-zinc-950/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                      Completed at {formatTime(session.completedAt)}
                    </div>

                    {session.exercises.map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-100 tracking-tight">
                            {ex.exerciseName}
                          </span>
                          <span className="text-[10px] text-zinc-500 capitalize font-medium">
                            {ex.exerciseCategory}
                          </span>
                        </div>

                        {/* Sets Grid / Rows */}
                        <div className="space-y-1">
                          {ex.sets.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-mono transition-colors ${
                                sIdx % 2 === 0 ? 'bg-zinc-950/70' : 'bg-zinc-900/40'
                              } border border-zinc-800/40`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-zinc-500 w-4">
                                  #{s.setNumber}
                                </span>
                                <span className="text-zinc-200 font-bold">
                                  {s.weight} <span className="text-[10px] text-zinc-500 font-normal">kg</span>
                                </span>
                                <span className="text-zinc-500">×</span>
                                <span className="text-zinc-200 font-bold">
                                  {s.reps} <span className="text-[10px] text-zinc-500 font-normal">reps</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {s.weight > 0 && s.reps > 0 && (
                                  <span className="text-[10px] text-zinc-500">
                                    vol: {Math.round(s.weight * s.reps)}kg
                                  </span>
                                )}
                                {s.isCompleted && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {/* Mood & Notes Display */}
                    {(session.mood || session.notes) && (
                      <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                        {session.mood && MOOD_META[session.mood] && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                            <span>{MOOD_META[session.mood].emoji}</span>
                            <span>{MOOD_META[session.mood].label}</span>
                            {session.sessionRpe && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                • RPE {session.sessionRpe}/10
                              </span>
                            )}
                          </div>
                        )}
                        {session.notes && (
                          <p className="text-xs text-zinc-400 italic">"{session.notes}"</p>
                        )}
                      </div>
                    )}

                    {/* Empty Exercises Warning */}
                    {session.exercises.length === 0 && (
                      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                        <div className="text-xs font-bold text-zinc-300">No exercises logged in this session</div>
                        <p className="text-[11px] text-zinc-500">
                          This workout was finished with 0 sets. You can delete it below.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons: Share Graphic & Delete */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedShareSession(session)}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Graphic</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSessionToDelete(session)}
                        className="py-2.5 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Delete Workout Session?</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to remove <span className="text-white font-bold">"{sessionToDelete.name}"</span> ({formatDate(sessionToDelete.completedAt)})? This will remove all associated sets permanently.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSessionToDelete(null)}
                className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold active-press transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteWorkout(sessionToDelete.id);
                    setSessionToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black active-press transition-colors shadow-lg shadow-rose-950/50 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'diet' && <DietHistoryList />}
      {activeTab === 'supplements' && <SupplementHistoryList />}

      {/* Share Workout Graphic Modal */}
      <ShareWorkoutModal
        session={selectedShareSession}
        onClose={() => setSelectedShareSession(null)}
      />
    </div>
  );
};

export default History;
