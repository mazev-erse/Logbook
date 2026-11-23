import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Scale,
  Ruler,
  Plus,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,

  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { generateUUID } from '../../lib/utils';
import { useAuth } from '../auth/ProtectedRoute';
import { useToast } from '../../context/ToastContext';
import type { BodyMetric } from '../../types/database';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

export const BodyMetrics: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Historical weight logs
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [height, setHeight] = useState<number>(178); // Default static height (cm)
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputWeight, setInputWeight] = useState<string>('78.5');
  const [inputHeight, setInputHeight] = useState<string>('178');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: () => setIsModalOpen(false), isOpen: isModalOpen });

  // Fetch metrics and profile height from Supabase
  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      // Local fallback
      const savedMetrics = localStorage.getItem('gymtracker_body_metrics');
      const savedHeight = localStorage.getItem('gymtracker_user_height');

      if (savedMetrics) {
        try {
          setMetrics(JSON.parse(savedMetrics));
        } catch (e) {
          console.error('Error parsing local metrics:', e);
        }
      } else {
        // Seed initial realistic trendline for local preview
        const initialSeed: BodyMetric[] = [
          { id: '1', user_id: user.id, weight: 81.0, logged_at: new Date(Date.now() - 30 * 86400000).toISOString(), created_at: '' },
          { id: '2', user_id: user.id, weight: 80.2, logged_at: new Date(Date.now() - 21 * 86400000).toISOString(), created_at: '' },
          { id: '3', user_id: user.id, weight: 79.5, logged_at: new Date(Date.now() - 14 * 86400000).toISOString(), created_at: '' },
          { id: '4', user_id: user.id, weight: 79.1, logged_at: new Date(Date.now() - 7 * 86400000).toISOString(), created_at: '' },
          { id: '5', user_id: user.id, weight: 78.5, logged_at: new Date().toISOString(), created_at: '' },
        ];
        setMetrics(initialSeed);
      }

      if (savedHeight) {
        setHeight(parseFloat(savedHeight) || 178);
        setInputHeight(savedHeight);
      }

      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch weight metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true });

      if (metricsError) {
        console.error('Error fetching body metrics:', metricsError.message);
      } else if (metricsData && metricsData.length > 0) {
        setMetrics(metricsData as BodyMetric[]);
        const latest = metricsData[metricsData.length - 1];
        setInputWeight(String(latest.weight));
      }

      // 2. Fetch static height from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('height')
        .eq('id', user.id)
        .single();

      if (profileData?.height) {
        setHeight(profileData.height);
        setInputHeight(String(profileData.height));
      }
    } catch (err) {
      console.error('Exception in fetchData:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived current metrics
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const previousMetric = metrics.length > 1 ? metrics[metrics.length - 2] : null;
  const weightChange = latestMetric && previousMetric ? latestMetric.weight - previousMetric.weight : 0;

  // Calculate BMI: weight (kg) / [height (m)]^2
  const bmi = useMemo(() => {
    if (!latestMetric || !height) return null;
    const heightInMeters = height / 100;
    const val = latestMetric.weight / (heightInMeters * heightInMeters);
    return Math.round(val * 10) / 10;
  }, [latestMetric, height]);

  // Recharts formatted chart data
  const chartData = useMemo(() => {
    return metrics.map((m) => {
      const d = new Date(m.logged_at);
      return {
        id: m.id,
        weight: m.weight,
        date: m.logged_at,
        displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });
  }, [metrics]);

  // Insert a new weight log row with current timestamp
  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsedWeight = parseFloat(inputWeight);
    const parsedHeight = parseFloat(inputHeight);

    if (!parsedWeight || parsedWeight <= 20 || parsedWeight >= 400) {
      setErrorMsg('Please enter a realistic weight (20kg - 400kg).');
      return;
    }

    setErrorMsg(null);

    const nowIso = new Date().toISOString();
    const newMetric: BodyMetric = {
      id: generateUUID(),
      user_id: user.id,
      weight: Math.round(parsedWeight * 10) / 10,
      logged_at: nowIso,
      created_at: nowIso,
    };

    const prevMetrics = metrics;
    const prevHeight = height;

    // Optimistic UI updates (instant response)
    setMetrics((prev) => [...prev, newMetric]);
    if (parsedHeight) setHeight(parsedHeight);
    setIsModalOpen(false);
    showToast(`Logged ${newMetric.weight} kg`, 'success');

    // LocalStorage backup
    const updatedMetrics = [...prevMetrics, newMetric];
    localStorage.setItem('gymtracker_body_metrics', JSON.stringify(updatedMetrics));
    if (parsedHeight) {
      localStorage.setItem('gymtracker_user_height', String(parsedHeight));
    }

    // Background sync to Supabase with rollback
    if (isSupabaseConfigured) {
      (async () => {
        try {
          const { error: insertError } = await supabase.from('body_metrics').upsert(
            {
              id: newMetric.id,
              user_id: user.id,
              weight: newMetric.weight,
              logged_at: newMetric.logged_at,
            },
            { onConflict: 'id' }
          );

          if (insertError) throw insertError;

          if (parsedHeight && parsedHeight !== prevHeight) {
            await supabase
              .from('profiles')
              .update({ height: parsedHeight })
              .eq('id', user.id);
          }
        } catch (err: any) {
          console.error('Failed to log weight in Supabase:', err);
          // Rollback on failure
          setMetrics(prevMetrics);
          setHeight(prevHeight);
          localStorage.setItem('gymtracker_body_metrics', JSON.stringify(prevMetrics));
          showToast('Failed to save weight to cloud', 'error');
        }
      })();
    }
  };

  const adjustWeight = (delta: number) => {
    const current = parseFloat(inputWeight) || 75;
    const updated = Math.round((current + delta) * 10) / 10;
    setInputWeight(String(updated));
  };

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider">
            Body Metrics
          </h3>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active-press"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Log Weight</span>
        </button>
      </div>

      {/* STATS CARDS: WEIGHT & HEIGHT */}
      <div className="grid grid-cols-2 gap-3">
        {/* Latest Weight Card */}
        <div className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Latest Weight</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {isLoading ? (
                <span className="inline-block w-20 h-7 bg-zinc-800 rounded-lg animate-pulse" />
              ) : latestMetric ? (
                `${latestMetric.weight} kg`
              ) : (
                '-- kg'
              )}
            </div>

            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono">
              {isLoading ? (
                <span className="inline-block w-16 h-3.5 bg-zinc-800/80 rounded animate-pulse" />
              ) : weightChange !== 0 ? (
                <span
                  className={`inline-flex items-center gap-0.5 font-bold ${
                    weightChange < 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {weightChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1)} kg
                </span>
              ) : (
                <span className="text-zinc-500 font-medium flex items-center gap-1">
                  <Minus className="w-3 h-3" /> Same as last
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Static Height & BMI Card */}
        <div className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Height & BMI</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Ruler className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-zinc-800 rounded-lg animate-pulse" />
              ) : (
                `${height} cm`
              )}
            </div>

            <div className="mt-1 text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
              <span>BMI: <strong className="text-zinc-200 font-mono">{bmi ?? '--'}</strong></span>
              {bmi && (
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-emerald-400 font-semibold">
                  {bmi < 18.5 ? 'Lean' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Athletic' : 'High'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECHARTS MINIMALIST TRENDLINE (Hidden X/Y axes for ultra clean mobile look) */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Weight Progression Trend
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            {chartData.length} logs
          </span>
        </div>

        {chartData.length >= 2 ? (
          <div className="h-32 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                {/* Custom touch-friendly tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div className="bg-black/95 border border-zinc-800 p-2.5 rounded-xl shadow-2xl backdrop-blur-md">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {dataPoint.formattedDate}
                          </div>
                          <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                            {dataPoint.weight} kg
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#c5f600"
                  strokeWidth={3}
                  dot={{ fill: '#c5f600', r: 4, stroke: '#0b0e0b', strokeWidth: 2 }}
                  activeDot={{ fill: '#d8ff5e', r: 6, stroke: '#f2f5ef', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500">
            Log at least 2 weigh-ins to generate your trendline.
          </div>
        )}
      </div>

      {/* PROMINENT "LOG TODAY'S WEIGHT" BUTTON (Oversized 56px touch target) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 active-press shadow-xl shadow-emerald-950/60 transition-all"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span>Log Today's Weight</span>
      </button>

      {/* DATA LOGGING BOTTOM-SHEET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            ref={sheetRef}
            className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-w-md w-full mx-auto p-5 pt-2 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] space-y-5 shadow-2xl will-change-transform"
          >
            <SheetHandle handleProps={handleProps} />
            {/* Modal Header */}
            <div {...handleProps} className="flex items-center justify-between cursor-grab">
              <div>
                <h3 className="text-lg font-black text-white">Log Body Weight</h3>
                <p className="text-xs text-zinc-400">Quick, one-handed metric entry</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 active-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogWeight} className="space-y-4">
              {/* Massive Numeric Input (64px tall, text-3xl font-black font-mono) */}
              <div className="space-y-1.5 text-center">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    required
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-full h-18 text-center font-mono font-black text-3xl bg-zinc-900 border-2 border-zinc-800 focus:border-emerald-500 rounded-2xl text-emerald-400 focus:outline-none shadow-inner"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                    kg
                  </span>
                </div>
              </div>

              {/* Quick Stepper Adjustment Chips */}
              <div className="grid grid-cols-4 gap-2">
                {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => adjustWeight(delta)}
                    className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold font-mono text-zinc-200 active-press"
                  >
                    {delta > 0 ? `+${delta}` : delta} kg
                  </button>
                ))}
              </div>

              {/* Static Height Input */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Height (cm)
                  </label>
                  <span className="text-[10px] text-zinc-500">Static / Profile</span>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={inputHeight}
                  onChange={(e) => setInputHeight(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white font-mono font-bold text-sm focus:outline-none"
                />
              </div>

              {/* Save Button (56px) */}
              <button
                type="submit"

                className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 active-press shadow-xl shadow-emerald-950/60 transition-all mt-2"
              >




                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Weight Log</span>


              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
