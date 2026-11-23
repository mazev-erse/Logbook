import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Flame } from 'lucide-react';
import { LeaderboardSkeleton } from '../common/Skeleton';
import { useGamification } from '../../hooks/useGamification';
import type { ExerciseRanking } from '../../types/database';

interface PerformanceRankingDashboardProps {
  exerciseName: string;
}

export const PerformanceRankingDashboard: React.FC<PerformanceRankingDashboardProps> = ({
  exerciseName,
}) => {
  const { fetchExerciseRankings } = useGamification();
  const [rankings, setRankings] = useState<ExerciseRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchExerciseRankings(exerciseName)
      .then((data) => {
        if (isMounted) {
          setRankings(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching exercise rankings:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [exerciseName, fetchExerciseRankings]);

  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  if (rankings.length === 0) {
    return (
      <div className="p-5 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-2">
        <Trophy className="w-7 h-7 mx-auto text-zinc-600" />
        <h4 className="text-xs font-bold text-zinc-300">No Historical Records Yet</h4>
        <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
          Complete sets for <span className="text-emerald-400 font-semibold">{exerciseName}</span> in your workouts to automatically generate your all-time leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-tight uppercase">
              Top 5 Historical Performances
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Ranked by Estimated 1RM (Epley formula)
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Rankings View
        </span>
      </div>

      {/* Leaderboard Rows */}
      <div className="space-y-2">
        {rankings.map((item) => {
          const isRank1 = item.performance_rank === 1;
          const isRank2 = item.performance_rank === 2;
          const isRank3 = item.performance_rank === 3;

          return (
            <div
              key={item.set_id || `rank-${item.performance_rank}`}
              className={`p-3 rounded-2xl border transition-all ${
                isRank1
                  ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900/90 to-zinc-950 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/20'
                  : isRank2
                  ? 'bg-zinc-900/80 border-slate-500/40 text-zinc-200'
                  : isRank3
                  ? 'bg-zinc-900/70 border-orange-700/40 text-zinc-300'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Left Rank Badge + Lift Specs */}
                <div className="flex items-center gap-3">
                  {/* Rank Icon / Number */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isRank1
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-md shadow-amber-500/30 font-black'
                        : isRank2
                        ? 'bg-gradient-to-tr from-slate-400 to-zinc-200 text-black font-black'
                        : isRank3
                        ? 'bg-gradient-to-tr from-orange-600 to-amber-700 text-white font-black'
                        : 'bg-zinc-800 text-zinc-400 font-bold'
                    }`}
                  >
                    {isRank1 ? (
                      <Crown className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      `#${item.performance_rank}`
                    )}
                  </div>

                  {/* Weight, Reps & Workout Name */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white font-mono">
                        {item.weight} kg
                      </span>
                      <span className="text-xs text-zinc-400">×</span>
                      <span className="text-xs font-bold text-zinc-300">
                        {item.reps} {item.reps === 1 ? 'rep' : 'reps'}
                      </span>

                      {/* Rank 1 Highlight Badge */}
                      {isRank1 && (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md bg-amber-400 text-black tracking-wider flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 fill-black" />
                          <span>All-Time #1</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                      <span>{item.workout_name || 'Workout'}</span>
                      <span>•</span>
                      <span>
                        {item.performed_at
                          ? new Date(item.performed_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Estimated 1RM Stat */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-mono font-black ${
                      isRank1
                        ? 'text-amber-300'
                        : isRank2
                        ? 'text-slate-200'
                        : isRank3
                        ? 'text-orange-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.estimated_1rm} kg
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                    Est. 1RM
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceRankingDashboard;
