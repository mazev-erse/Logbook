import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { X, TrendingUp, Award, Calendar, Zap } from 'lucide-react';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface ExerciseProgressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  category?: string;
  equipment?: string;
}

export const ExerciseProgressDrawer: React.FC<ExerciseProgressDrawerProps> = ({
  isOpen,
  onClose,
  exerciseName,
  category,
  equipment,
}) => {
  const { sheetRef, handleProps } = useSwipeToDismiss({
    onDismiss: onClose,
    isOpen: isOpen && Boolean(exerciseName),
  });

  const { getExerciseProgress, getExerciseHistorySessions } = useWorkoutHistory();

  if (!isOpen || !exerciseName) return null;

  const progressData = getExerciseProgress(exerciseName);
  const sessionHistory = getExerciseHistorySessions(exerciseName);

  const bestWeight = progressData.length > 0 ? Math.max(...progressData.map((d) => d.weight)) : 0;
  const best1RM = progressData.length > 0 ? Math.max(...progressData.map((d) => d.estimated1RM)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={sheetRef}
        className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-w-md w-full mx-auto p-5 pt-2 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] space-y-4 shadow-2xl max-h-[88dvh] overflow-y-auto will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />

        {/* Drawer Header */}
        <div {...handleProps} className="flex items-center justify-between cursor-grab">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Progression & History</span>
            </div>
            <h3 className="text-xl font-black text-white mt-0.5 tracking-tight">
              {exerciseName}
            </h3>
            {(category || equipment) && (
              <div className="text-[11px] text-zinc-400 capitalize mt-0.5">
                {category} {equipment ? `• ${equipment}` : ''}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 active-press hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* High-Level PR Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Max Weight
            </div>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {bestWeight > 0 ? `${bestWeight} kg` : '-'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Best 1RM
            </div>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {best1RM > 0 ? `${best1RM} kg` : '-'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Logged
            </div>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {sessionHistory.length} {sessionHistory.length === 1 ? 'time' : 'times'}
            </div>
          </div>
        </div>

        {/* 1RM Trendline Chart */}
        {progressData.length === 0 ? (
          <div className="py-8 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-2">
            <Award className="w-7 h-7 mx-auto text-zinc-600" />
            <div className="text-xs font-bold text-zinc-300">No Past Sessions Yet</div>
            <div className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Finish your current workout to log your first data point and start your 1RM progression curve.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>1RM & Weight Trendline</span>
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Max
                </span>
                <span className="flex items-center gap-1 text-sky-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span> 1RM
                </span>
              </div>
            </div>

            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272e27" />
                  <XAxis dataKey="displayDate" stroke="#858e82" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#858e82"
                    fontSize={10}
                    tickLine={false}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151a15',
                      borderColor: '#3a433a',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name="Max Weight (kg)"
                    stroke="#c5f600"
                    strokeWidth={2.5}
                    dot={{ fill: '#c5f600', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimated1RM"
                    name="Est. 1RM (kg)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: '#38bdf8', r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Historical Sessions Breakdown */}
        {sessionHistory.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 px-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Recent Session Logs
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {sessionHistory.map((s) => (
                <div
                  key={s.sessionId}
                  className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-zinc-200">{s.displayDate}</div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-zinc-400">Max: <strong className="text-white">{s.maxWeight}kg</strong></span>
                      <span className="text-emerald-400">1RM: <strong>{s.best1RM}kg</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {s.sets.map((st) => (
                      <span
                        key={st.setNumber}
                        className="px-2 py-1 rounded-lg bg-zinc-800/90 border border-zinc-700/60 text-[11px] font-mono text-zinc-200"
                      >
                        Set {st.setNumber}: <span className="font-bold text-white">{st.weight}kg</span> × {st.reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
