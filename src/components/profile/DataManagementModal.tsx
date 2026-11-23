import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  exportWorkoutsToCsv,
  exportBodyMetricsToCsv,
  exportDietLogsToCsv,
  exportFullBackupToJson,
} from '../../utils/exportUtils';
import { parseWorkoutCsv, type ParsedCsvSummary } from '../../utils/csvImportParser';
import { supabase, isSupabaseConfigured, getAuthUser } from '../../lib/supabaseClient';
import { generateUUID } from '../../lib/utils';
import { useAuth } from '../auth/ProtectedRoute';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { requireAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export states
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedSummary, setParsedSummary] = useState<ParsedCsvSummary | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  if (!isOpen) return null;

  // Handle Export Actions
  const handleExport = async (type: 'workouts' | 'metrics' | 'diet' | 'json') => {
    setExportingType(type);
    setExportSuccessMsg(null);
    try {
      if (type === 'workouts') {
        const count = await exportWorkoutsToCsv();
        setExportSuccessMsg(`Exported ${count} workouts to CSV!`);
      } else if (type === 'metrics') {
        const count = await exportBodyMetricsToCsv();
        setExportSuccessMsg(`Exported ${count} body metric entries!`);
      } else if (type === 'diet') {
        const count = await exportDietLogsToCsv();
        setExportSuccessMsg(`Exported ${count} diet entries!`);
      } else if (type === 'json') {
        await exportFullBackupToJson();
        setExportSuccessMsg('Full JSON backup downloaded!');
      }
      setTimeout(() => setExportSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Export error:', err);
    } finally {
      setExportingType(null);
    }
  };

  // Handle File Selection & Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImportFile(file);
    setImportError(null);
    setImportSuccessMsg(null);
    setIsParsing(true);

    try {
      const text = await file.text();
      const summary = parseWorkoutCsv(text);
      setParsedSummary(summary);
    } catch (err: any) {
      console.error('CSV parse error:', err);
      setImportError(err.message || 'Failed to parse CSV file. Ensure it is a valid Strong or Hevy export.');
      setParsedSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute Batch Import to Supabase + Local Storage
  const handleExecuteImport = () => {
    requireAuth(async () => {
      if (!parsedSummary) return;
  
      setIsImporting(true);
      setImportError(null);
      const total = parsedSummary.workouts.length;
      setImportProgress({ current: 0, total });
  
      try {
        const user = isSupabaseConfigured ? await getAuthUser() : null;
  
        // 1. Prepare exercise lookup map from Supabase or create new exercises
      const exerciseIdMap = new Map<string, string>();

      if (isSupabaseConfigured && user) {
        // Fetch existing exercises
        const { data: existingEx } = await supabase.from('exercises').select('id, name');
        if (existingEx) {
          existingEx.forEach((ex) => exerciseIdMap.set(ex.name.toLowerCase().trim(), ex.id));
        }

        // Auto-create missing custom exercises in bulk
        const missingExercises = parsedSummary.uniqueExercises.filter(
          (name) => !exerciseIdMap.has(name.toLowerCase().trim())
        );

        if (missingExercises.length > 0) {
          const newExRows = missingExercises.map((name) => ({
            user_id: user.id,
            name: name.trim(),
            category: 'other',
            equipment: 'other',
          }));

          const { data: insertedEx } = await supabase
            .from('exercises')
            .insert(newExRows)
            .select('id, name');

          if (insertedEx) {
            insertedEx.forEach((ex) => exerciseIdMap.set(ex.name.toLowerCase().trim(), ex.id));
          }
        }
      }

      // 2. Insert Workouts in batches
      let processed = 0;
      const importedWorkoutsForCache: any[] = [];

      for (const w of parsedSummary.workouts) {
        if (isSupabaseConfigured && user) {
          // Insert workout row
          const { error: wError } = await supabase.from('workouts').upsert({
            id: w.id,
            user_id: user.id,
            name: w.name,
            started_at: w.startedAt,
            completed_at: w.completedAt,
            notes: w.notes || null,
          });

          if (!wError) {
            // Insert workout_exercises
            for (let eIdx = 0; eIdx < w.exercises.length; eIdx++) {
              const ex = w.exercises[eIdx];
              const resolvedExId =
                exerciseIdMap.get(ex.exerciseName.toLowerCase().trim()) ||
                '00000000-0000-0000-0000-000000000000';

              const weId = generateUUID();
              await supabase.from('workout_exercises').upsert({
                id: weId,
                workout_id: w.id,
                exercise_id: resolvedExId,
                user_id: user.id,
                order_index: eIdx,
              });

              // Insert sets
              const setRows = ex.sets.map((s) => ({
                id: generateUUID(),
                workout_exercise_id: weId,
                workout_id: w.id,
                user_id: user.id,
                set_number: s.setNumber,
                weight: s.weight,
                reps: s.reps,
                rpe: s.rpe,
                is_completed: true,
                completed_at: w.completedAt,
              }));

              await supabase.from('workout_sets').upsert(setRows);
            }
          }
        }

        // Cache representation
        importedWorkoutsForCache.push({
          id: w.id,
          name: w.name,
          startedAt: w.startedAt,
          completedAt: w.completedAt,
          notes: w.notes,
          exercises: w.exercises.map((e, idx) => ({
            workoutExerciseId: `local-we-${idx}`,
            exercise: { id: `ex-${idx}`, name: e.exerciseName, category: 'other' },
            sets: e.sets.map((s) => ({
              id: `local-s-${s.setNumber}`,
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              isCompleted: true,
            })),
          })),
        });

        processed += 1;
        setImportProgress({ current: processed, total });
      }

      // 3. Merge into local storage completed workouts
      try {
        const historyKey = 'gymtracker_completed_workouts';
        const existing = localStorage.getItem(historyKey);
        const history = existing ? JSON.parse(existing) : [];
        const merged = [...importedWorkoutsForCache, ...history];
        localStorage.setItem(historyKey, JSON.stringify(merged));
      } catch (e) {
        console.warn('Local storage cache update warning:', e);
      }

      // Celebration
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#10b981', '#6366f1', '#3b82f6', '#f59e0b'],
        });
      } catch {}

      setImportSuccessMsg(
        `Successfully imported ${processed} workouts and ${parsedSummary.totalSets} sets!`
      );
      setParsedSummary(null);
      setImportFile(null);

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      console.error('Import execution error:', err);
      setImportError(err.message || 'Error occurred while saving imported workouts.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Data Ownership & Portability</h2>
              <p className="text-[11px] text-zinc-400">Export your data or import from Strong / Hevy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 border-b border-zinc-900 bg-zinc-950/60">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'export'
                  ? 'bg-emerald-400 text-black shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export (Download)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'import'
                  ? 'bg-emerald-400 text-black shadow-md shadow-emerald-950/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Import History</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Feedback Alerts */}
          {exportSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-900/80 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-900/80 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-900/80 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{importError}</div>
            </div>
          )}

          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400 leading-relaxed px-1">
                Your data belongs to you. Export your workouts, body composition, and diet logs anytime in standard spreadsheet (CSV) or complete JSON backup formats.
              </div>

              {/* Workouts CSV */}
              <button
                type="button"
                onClick={() => handleExport('workouts')}
                disabled={exportingType !== null}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-left active-press transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Workouts Logbook (CSV)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      All workouts, exercises, weights, reps & RPE
                    </div>
                  </div>
                </div>
                {exportingType === 'workouts' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />
                )}
              </button>

              {/* Body Metrics CSV */}
              <button
                type="button"
                onClick={() => handleExport('metrics')}
                disabled={exportingType !== null}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-left active-press transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      Body Metrics History (CSV)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Body weight & fat percentage logs
                    </div>
                  </div>
                </div>
                {exportingType === 'metrics' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-sky-400" />
                )}
              </button>

              {/* Diet Logs CSV */}
              <button
                type="button"
                onClick={() => handleExport('diet')}
                disabled={exportingType !== null}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-left active-press transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Diet & Macros Logbook (CSV)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Daily meals, calories, and macronutrient targets
                    </div>
                  </div>
                </div>
                {exportingType === 'diet' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
                )}
              </button>

              {/* Full JSON Snapshot */}
              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={exportingType !== null}
                className="w-full p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-between text-left active-press transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                      Complete Account Backup (JSON)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Full database snapshot across all modules
                    </div>
                  </div>
                </div>
                {exportingType === 'json' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-sky-400" />
                )}
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT (STRONG / HEVY) */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-400 leading-relaxed px-1">
                Migrating from another gym app? Export your workout history from <strong>Strong</strong> or <strong>Hevy</strong> as a <code className="text-emerald-400">.csv</code> file, and import it here seamlessly.
              </div>

              {/* Hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* File Dropzone / Selector */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40 text-center cursor-pointer active-press transition-all space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                  <Upload className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {importFile ? importFile.name : 'Tap to select CSV file'}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Supports Strong App & Hevy App CSV exports
                  </p>
                </div>
              </div>

              {/* Parsing State */}
              {isParsing && (
                <div className="p-4 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  <div className="text-xs text-zinc-400 font-mono">Analyzing CSV format...</div>
                </div>
              )}

              {/* Parsed Summary Preview Card */}
              {parsedSummary && !isParsing && (
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Detected Format</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {parsedSummary.format} App Export
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Workouts</span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        {parsedSummary.totalWorkouts}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Total Sets</span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        {parsedSummary.totalSets}
                      </div>
                    </div>
                  </div>

                  {parsedSummary.dateRange.start && (
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between px-1">
                      <span>Date Span:</span>
                      <span className="font-mono text-zinc-300">
                        {parsedSummary.dateRange.start} → {parsedSummary.dateRange.end}
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-zinc-400 flex items-center justify-between px-1">
                    <span>Unique Exercises:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {parsedSummary.uniqueExercises.length} Exercises
                    </span>
                  </div>

                  {/* Progress Bar during Import */}
                  {isImporting && importProgress && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Importing sessions...</span>
                        <span className="text-emerald-400 font-bold">
                          {importProgress.current} / {importProgress.total}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-150"
                          style={{
                            width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="w-full h-13 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs flex items-center justify-center gap-2 active-press shadow-lg shadow-emerald-950/60 disabled:opacity-50 transition-all mt-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Importing Workouts...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>Import {parsedSummary.totalWorkouts} Workouts Now</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagementModal;
