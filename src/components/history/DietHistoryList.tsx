import React from 'react';
import { Utensils, Flame, Calendar, Trash2 } from 'lucide-react';
import { useDietHistory } from '../../hooks/useDietHistory';
import { DietLogSkeleton } from '../common/Skeleton';

export const DietHistoryList: React.FC = () => {
  const { logs, isLoading, deleteLog, hasMore, loadMore } = useDietHistory();

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="space-y-3.5">
        <DietLogSkeleton />
        <DietLogSkeleton />
        <DietLogSkeleton />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 px-6 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3.5">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
          <Utensils className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <div className="text-base font-bold text-zinc-200">No diet history yet</div>
          <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Log your meals and snacks to see your historical calorie and macro intake here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-3xl border border-zinc-800/90 bg-zinc-900/70 p-4 shadow-lg flex flex-col gap-3 relative"
        >
          <div className="flex justify-between items-start pr-8">
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{log.food_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/50 font-mono capitalize">
                  {log.meal_type}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(log.logged_at)}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm('Delete this diet log?')) {
                deleteLog(log.id);
              }
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 active-press"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/50">
            <div className="bg-amber-950/20 rounded-xl p-2 text-center border border-amber-900/30">
              <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <Flame className="w-2.5 h-2.5" /> KCAL
              </div>
              <div className="font-mono font-black text-amber-300 text-sm">{Math.round(log.calories)}</div>
            </div>
            <div className="bg-sky-950/20 rounded-xl p-2 text-center border border-sky-900/30">
              <div className="text-[10px] font-bold text-sky-400/80 uppercase tracking-wider mb-0.5">Pro</div>
              <div className="font-mono font-black text-sky-300 text-sm">{Math.round(log.protein)}g</div>
            </div>
            <div className="bg-emerald-950/20 rounded-xl p-2 text-center border border-emerald-900/30">
              <div className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider mb-0.5">Carb</div>
              <div className="font-mono font-black text-emerald-300 text-sm">{Math.round(log.carbs)}g</div>
            </div>
            <div className="bg-orange-950/20 rounded-xl p-2 text-center border border-orange-900/30">
              <div className="text-[10px] font-bold text-orange-400/80 uppercase tracking-wider mb-0.5">Fat</div>
              <div className="font-mono font-black text-orange-300 text-sm">{Math.round(log.fats)}g</div>
            </div>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full py-4 mt-2 rounded-2xl border border-dashed border-zinc-700 text-zinc-400 font-bold text-sm hover:text-white hover:bg-zinc-800/50 active-press transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Older Meals'}
        </button>
      )}
    </div>
  );
};
