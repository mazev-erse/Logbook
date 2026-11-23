import React from 'react';
import { Pill, Calendar, Trash2, CheckCircle2 } from 'lucide-react';
import { useSupplementHistory } from '../../hooks/useSupplementHistory';
import { DietLogSkeleton } from '../common/Skeleton';

export const SupplementHistoryList: React.FC = () => {
  const { logs, isLoading, deleteLog, hasMore, loadMore } = useSupplementHistory();

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
          <Pill className="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <div className="text-base font-bold text-zinc-200">No supplement history yet</div>
          <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Log your vitamins, pre-workout, or protein shakes to see your history here.
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
          className="rounded-3xl border border-zinc-800/90 bg-zinc-900/70 p-4 shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              log.taken
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
            }`}>
              {log.taken ? <CheckCircle2 className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{log.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/50 font-mono">
                  {log.dosage}
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
              if (window.confirm('Delete this supplement log?')) {
                deleteLog(log.id);
              }
            }}
            className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 active-press shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoading}
          className="w-full py-4 mt-2 rounded-2xl border border-dashed border-zinc-700 text-zinc-400 font-bold text-sm hover:text-white hover:bg-zinc-800/50 active-press transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Older Supplements'}
        </button>
      )}
    </div>
  );
};
