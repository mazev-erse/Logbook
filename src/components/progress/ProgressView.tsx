import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, BarChart2, Award, Dumbbell, Calendar } from 'lucide-react';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { DEFAULT_EXERCISES } from '../../hooks/useExercises';
import { BodyMetrics } from './BodyMetrics';
import { GoalTrackerCard } from './GoalTrackerCard';
import { PerformanceRankingDashboard } from './PerformanceRankingDashboard';

export const ProgressView: React.FC = () => {
  const { getExerciseProgress, getExerciseHistorySessions, sessions } = useWorkoutHistory();
  const [selectedExercise, setSelectedExercise] = useState<string>('Barbell Bench Press');

  // Collect distinct exercises across all sessions plus defaults
  const exerciseOptions = Array.from(
    new Set([
      ...DEFAULT_EXERCISES.map((e) => e.name),
      ...sessions.flatMap((s) => s.exercises.map((e) => e.exerciseName)),
    ])
  );

  const data = getExerciseProgress(selectedExercise);
  const sessionHistory = getExerciseHistorySessions(selectedExercise);

  const bestWeight = data.length > 0 ? Math.max(...data.map((d) => d.weight)) : 0;
  const best1RM = data.length > 0 ? Math.max(...data.map((d) => d.estimated1RM)) : 0;
  const totalVolume = data.reduce((acc, d) => acc + d.volume, 0);

  return (
    <div className="pb-28 px-4 pt-4 space-y-6">
      <div className="px-1">
        <h2 className="text-xl font-black text-white tracking-tight">Progress & Analytics</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Track body weight trends and exercise progression
        </p>
      </div>

      {/* CURRENT FITNESS GOAL TRACKER */}
      <GoalTrackerCard />

      {/* BODY METRICS & WEIGHT TRENDLINE SECTION */}
      <BodyMetrics />

      {/* SECTION DIVIDER */}
      <div className="relative flex items-center justify-center pt-2">
        <div className="absolute inset-x-0 h-px bg-zinc-850" />
        <span className="relative bg-[#0b0e0b] px-3 text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exercise Strength</span>
        </span>
      </div>

      {/* Exercise Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
          Select Exercise
        </label>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500"
        >
          {exerciseOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Max Weight
          </div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {bestWeight > 0 ? `${bestWeight} kg` : '-'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Best 1RM
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">
            {best1RM > 0 ? `${best1RM} kg` : '-'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Total Vol
          </div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {totalVolume > 0 ? `${Math.round(totalVolume)} kg` : '-'}
          </div>
        </div>
      </div>

      {/* Charts */}
      {data.length === 0 ? (
        <div className="py-14 px-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
          <Award className="w-8 h-8 mx-auto text-zinc-600" />
          <div className="text-sm font-bold text-zinc-300">No logs for {selectedExercise}</div>
          <div className="text-xs text-zinc-500">
            Log this exercise in a completed workout to visualize your progress curve.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Weight & 1RM Progression Chart */}
          <div className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Weight & 1RM Trend
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Max
                </span>
                <span className="flex items-center gap-1 text-sky-300">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span> 1RM
                </span>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272e27" />
                  <XAxis dataKey="displayDate" stroke="#858e82" fontSize={11} tickLine={false} />
                  <YAxis stroke="#858e82" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151a15',
                      borderColor: '#3a433a',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name="Max Weight (kg)"
                    stroke="#c5f600"
                    strokeWidth={3}
                    dot={{ fill: '#c5f600', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="estimated1RM"
                    name="Est. 1RM (kg)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: '#38bdf8', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume Progression Chart */}
          <div className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Volume per Session (kg)
              </span>
            </div>

            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272e27" />
                  <XAxis dataKey="displayDate" stroke="#858e82" fontSize={11} tickLine={false} />
                  <YAxis stroke="#858e82" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151a15',
                      borderColor: '#3a433a',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    name="Volume (kg)"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Sessions Breakdown Table */}
          {sessionHistory.length > 0 && (
            <div className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/90 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Past Session Logs ({sessionHistory.length})
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {sessionHistory.map((s) => (
                  <div
                    key={s.sessionId}
                    className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-zinc-200">{s.displayDate}</div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-zinc-400">
                          Max: <strong className="text-white">{s.maxWeight}kg</strong>
                        </span>
                        <span className="text-emerald-400">
                          1RM: <strong>{s.best1RM}kg</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.sets.map((st) => (
                        <span
                          key={st.setNumber}
                          className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300"
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
      )}

      {/* PERFORMANCE RANKING DASHBOARD (Top 5 Leaderboard) */}
      <PerformanceRankingDashboard exerciseName={selectedExercise} />
    </div>
  );
};
