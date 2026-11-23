import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Dumbbell,
  Utensils,
  Footprints,
  Search,
  Download,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ChevronRight,
  X,
  KeyRound,
  Trash2,
  Layers,
  BarChart3,
  Megaphone,
  Wrench,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { useAuth } from '../auth/ProtectedRoute';
import { useToast } from '../../context/ToastContext';
import { useExercises } from '../../hooks/useExercises';
import { useRoutines } from '../../hooks/useRoutines';
import type {
  AdminUserSummary,
  AdminUserWorkout,
} from '../../types/admin';
import type { ExerciseCategory, EquipmentType } from '../../types/database';
import { BlurImage } from '../common/BlurImage';

interface AdminDashboardProps {
  onBack: () => void;
}

type AdminTab = 'users' | 'catalog' | 'analytics' | 'announcements' | 'hygiene';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    isAuthorized,
    users,
    metrics,
    announcement,
    isLoading,
    error,
    refresh,
    exportUsersCsv,
    saveAnnouncement,
    fetchUserWorkouts,
    sendPasswordReset,
    deleteUser,
    addGlobalExercise,
    deleteGlobalExercise,
    addSystemRoutine,
    deleteSystemRoutine,
    cleanupEmptyWorkouts,
  } = useAdminData();

  const { allExercises, addCustomExercise } = useExercises();
  const { systemTemplates } = useRoutines();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Users tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'workouts' | 'name'>('newest');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [userWorkouts, setUserWorkouts] = useState<AdminUserWorkout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Catalog tab state
  const [catalogSubTab, setCatalogSubTab] = useState<'exercises' | 'routines'>('exercises');
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState<ExerciseCategory>('chest');
  const [newExEquipment, setNewExEquipment] = useState<EquipmentType>('barbell');
  const [newExNotes, setNewExNotes] = useState('');
  const [isSavingExercise, setIsSavingExercise] = useState(false);

  // System Routine modal state
  const [isAddRoutineOpen, setIsAddRoutineOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [routineExercises, setRoutineExercises] = useState<
    { name: string; sets: number; reps: number }[]
  >([{ name: 'Barbell Bench Press', sets: 3, reps: 10 }]);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);

  // Announcement tab state
  const [annMessage, setAnnMessage] = useState(announcement?.message || '');
  const [annTitle, setAnnTitle] = useState(announcement?.title || 'System Notice');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'success'>(
    announcement?.type || 'info'
  );
  const [annActive, setAnnActive] = useState<boolean>(announcement?.is_active ?? false);
  const [isSavingAnn, setIsSavingAnn] = useState(false);

  // Hygiene tab state
  const [isCleaningWorkouts, setIsCleaningWorkouts] = useState(false);

  // Keep announcement form in sync with loaded data
  useEffect(() => {
    if (announcement) {
      setAnnMessage(announcement.message || '');
      setAnnTitle(announcement.title || 'System Notice');
      setAnnType(announcement.type || 'info');
      setAnnActive(Boolean(announcement.is_active));
    }
  }, [announcement]);

  // Load user workouts when a user is selected
  useEffect(() => {
    if (selectedUser) {
      setIsLoadingWorkouts(true);
      setIsConfirmingDelete(false);
      fetchUserWorkouts(selectedUser.id).then((workouts) => {
        setUserWorkouts(workouts);
        setIsLoadingWorkouts(false);
      });
    } else {
      setUserWorkouts([]);
    }
  }, [selectedUser, fetchUserWorkouts]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort Users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = users.filter((u) => {
      const nameMatch = (u.display_name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = u.id.toLowerCase().includes(q);
      return nameMatch || emailMatch || idMatch;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'workouts') {
      result.sort((a, b) => (b.workout_count || 0) - (a.workout_count || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
    }

    return result;
  }, [users, searchQuery, sortBy]);

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!selectedUser?.email) {
      showToast('No email address registered for this user.', 'warning');
      return;
    }
    setIsSendingReset(true);
    const res = await sendPasswordReset(selectedUser.email);
    setIsSendingReset(false);
    if (res.success) {
      showToast(`Password reset link sent to ${selectedUser.email}`, 'success');
    } else {
      showToast(res.error || 'Failed to send password reset.', 'error');
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsDeletingUser(true);
    const res = await deleteUser(selectedUser.id);
    setIsDeletingUser(false);
    if (res.success) {
      showToast('User account removed.', 'success');
      setSelectedUser(null);
    } else {
      showToast(res.error || 'Failed to delete user.', 'error');
    }
  };

  // Handle save global exercise
  const handleAddGlobalExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;
    setIsSavingExercise(true);
    const res = await addGlobalExercise(newExName, newExCategory, newExEquipment, newExNotes);
    setIsSavingExercise(false);
    if (res.success) {
      showToast(`Added "${newExName}" to global exercises`, 'success');
      setIsAddExerciseOpen(false);
      setNewExName('');
      setNewExNotes('');
    } else {
      // Fallback: save through standard exercise hook
      await addCustomExercise(newExName, newExCategory, newExEquipment);
      showToast(`Added "${newExName}" locally`, 'info');
      setIsAddExerciseOpen(false);
      setNewExName('');
    }
  };

  // Handle delete global exercise
  const handleDeleteGlobalExercise = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the exercise "${name}"?`)) return;
    const res = await deleteGlobalExercise(id);
    if (res.success) {
      showToast(`Deleted exercise "${name}"`, 'success');
    } else {
      showToast(res.error || 'Failed to delete exercise.', 'error');
    }
  };

  // Handle save system routine
  const handleAddSystemRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;
    setIsSavingRoutine(true);
    const res = await addSystemRoutine(newRoutineName, newRoutineDesc, routineExercises);
    setIsSavingRoutine(false);
    if (res.success) {
      showToast(`Published official template "${newRoutineName}"`, 'success');
      setIsAddRoutineOpen(false);
      setNewRoutineName('');
      setNewRoutineDesc('');
    } else {
      showToast(res.error || 'Failed to publish routine template.', 'error');
    }
  };

  // Handle delete system routine
  const handleDeleteSystemRoutine = async (id: string, name: string) => {
    if (!window.confirm(`Delete system routine "${name}"?`)) return;
    const res = await deleteSystemRoutine(id);
    if (res.success) {
      showToast(`Routine "${name}" removed.`, 'success');
    } else {
      showToast(res.error || 'Failed to delete routine.', 'error');
    }
  };

  // Handle save announcement
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnn(true);
    await saveAnnouncement({
      title: annTitle.trim() || 'Notice',
      message: annMessage.trim(),
      type: annType,
      is_active: annActive,
    });
    setIsSavingAnn(false);
    showToast(annActive ? 'System announcement broadcast activated' : 'Announcement deactivated', 'success');
  };

  // Handle cleanup empty workouts
  const handleCleanupWorkouts = async () => {
    if (!window.confirm('Delete all abandoned workout sessions with zero completed sets?')) return;
    setIsCleaningWorkouts(true);
    const res = await cleanupEmptyWorkouts();
    setIsCleaningWorkouts(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Purged ${res.cleanedCount} empty workout session(s)`, 'success');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 shadow-xl">
          <ShieldAlert className="w-8 h-8 stroke-[2]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-zinc-400 max-w-xs">
            This dashboard is restricted to the verified system administrator.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold active-press hover:bg-zinc-850"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="pb-36 px-4 pt-3 max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center active-press transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-white tracking-tight truncate">
              Admin Suite
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-950/80 text-sky-300 border border-sky-800/60">
              Root
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            {user?.email || 'Administrator'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            title="Refresh statistics"
            className="w-10 h-10 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-emerald-400 flex items-center justify-center active-press disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {activeTab === 'users' && (
            <button
              onClick={exportUsersCsv}
              disabled={users.length === 0}
              title="Export all users to CSV"
              className="w-10 h-10 rounded-2xl bg-emerald-400 text-black flex items-center justify-center active-press shadow-lg shadow-emerald-950/50 hover:bg-emerald-300 disabled:opacity-50 transition-all font-bold"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Admin Module Navigation Bar */}
      <div className="flex items-center gap-1 p-1 bg-zinc-950/90 border border-zinc-800 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'users'
              ? 'bg-zinc-850 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lifters ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'catalog'
              ? 'bg-zinc-850 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'analytics'
              ? 'bg-zinc-850 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'announcements'
              ? 'bg-zinc-850 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-sky-400" />
          <span>Banner</span>
        </button>

        <button
          onClick={() => setActiveTab('hygiene')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'hygiene'
              ? 'bg-zinc-850 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-rose-400" />
          <span>Hygiene</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-900/80 text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* =========================================================================
          TAB 1: USERS & LIFTER DIRECTORY
      ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* High-Level Metric Tiles (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Users</span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-white">
                {isLoading ? '...' : metrics.total_users}
              </div>
              <div className="text-[10px] text-zinc-500">Registered accounts</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workouts</span>
                <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl font-black text-white">
                {isLoading ? '...' : metrics.total_workouts}
              </div>
              <div className="text-[10px] text-zinc-500">Completed sessions</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Diet Logs</span>
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white">
                {isLoading ? '...' : metrics.total_diet_logs}
              </div>
              <div className="text-[10px] text-zinc-500">Meals & snacks</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Recovery</span>
                <Footprints className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl font-black text-white">
                {isLoading ? '...' : metrics.total_recovery_logs}
              </div>
              <div className="text-[10px] text-zinc-500">Walks & sports</div>
            </div>
          </div>

          {/* User Directory Filter & Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                User Directory ({filteredUsers.length})
              </h2>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="workouts">Most Workouts</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lifter by name, email, or UID..."
                className="w-full h-11 pl-10 pr-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* User List */}
            {isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">
                Loading lifter directory...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                <Users className="w-6 h-6 text-zinc-600 mx-auto" />
                <div className="text-xs font-bold text-white">No lifters found</div>
                <p className="text-[11px] text-zinc-500">Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isCurrentUser = u.id === user?.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-all active-press cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          {u.avatar_url ? (
                            <BlurImage src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-emerald-600/30 to-teal-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                              {(u.display_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white truncate">
                              {u.display_name || 'Lifter'}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-400 text-black">
                                You
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                            {u.email || `ID: ${u.id.slice(0, 8)}...`}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-zinc-400 font-medium">
                            <span className="flex items-center gap-1 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800/80">
                              <Dumbbell className="w-2.5 h-2.5 text-sky-400" />
                              <span>{u.workout_count || 0}</span>
                            </span>
                            <span className="flex items-center gap-1 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800/80">
                              <Utensils className="w-2.5 h-2.5 text-amber-400" />
                              <span>{u.diet_count || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(u.id, e)}
                          title="Copy User UID"
                          className="w-7 h-7 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                        >
                          {copiedId === u.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CATALOG (GLOBAL EXERCISES & SYSTEM ROUTINES)
      ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setCatalogSubTab('exercises')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  catalogSubTab === 'exercises' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                Exercises ({allExercises.length})
              </button>
              <button
                onClick={() => setCatalogSubTab('routines')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  catalogSubTab === 'routines' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                Routines ({systemTemplates.length})
              </button>
            </div>

            {catalogSubTab === 'exercises' ? (
              <button
                onClick={() => setIsAddExerciseOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black shadow-lg shadow-emerald-950/40 active-press transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New Exercise</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAddRoutineOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-black text-xs font-black shadow-lg shadow-sky-950/40 active-press transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New Routine</span>
              </button>
            )}
          </div>

          {/* Exercises Sub-tab */}
          {catalogSubTab === 'exercises' && (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-400">
                Exercises marked <span className="text-emerald-400 font-bold">Global</span> are visible to all users across the app.
              </p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {allExercises.map((ex) => {
                  const isGlobal = ex.user_id === null;
                  return (
                    <div
                      key={ex.id}
                      className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{ex.name}</span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              isGlobal
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {isGlobal ? 'Global' : 'Custom'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                          <span className="capitalize">{ex.category}</span>
                          <span>•</span>
                          <span className="capitalize">{ex.equipment.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteGlobalExercise(ex.id, ex.name)}
                        className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
                        title="Delete Exercise"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Routines Sub-tab */}
          {catalogSubTab === 'routines' && (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-400">
                System routine templates appear automatically in the Browse Routines tab for all lifters.
              </p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {systemTemplates.map((rt) => (
                  <div
                    key={rt.id}
                    className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white">{rt.name}</span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            System
                          </span>
                        </div>
                        {rt.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">{rt.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteSystemRoutine(rt.id, rt.name)}
                        className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {rt.exercises.map((e, idx) => (
                        <span
                          key={e.id || idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium"
                        >
                          {e.exercise_name} ({e.target_sets}×{e.target_reps})
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

      {/* =========================================================================
          TAB 3: ANALYTICS & RETENTION
      ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                User Activity & Retention
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-500">7-Day Active</div>
                <div className="text-xl font-black text-emerald-400">
                  {metrics.analytics?.active_7d ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500">Lifters active this week</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-500">30-Day Active</div>
                <div className="text-xl font-black text-sky-400">
                  {metrics.analytics?.active_30d ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500">Monthly active users</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-500">Avg Sessions</div>
                <div className="text-xl font-black text-white">
                  {metrics.analytics?.avg_workouts_per_user ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500">Workouts per user</div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="text-[10px] font-bold uppercase text-zinc-500">Empty Sessions</div>
                <div className="text-xl font-black text-amber-400">
                  {metrics.analytics?.empty_workouts_count ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500">Abandoned sessions</div>
              </div>
            </div>
          </div>

          {/* Top Logged Exercises */}
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Most Logged Exercises
            </h2>
            {metrics.analytics?.top_exercises && metrics.analytics.top_exercises.length > 0 ? (
              <div className="space-y-2">
                {metrics.analytics.top_exercises.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white">{item.name}</span>
                    </div>
                    <span className="font-mono text-emerald-400 text-xs font-black">
                      {item.count} sets
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-3 text-center">
                Top exercise statistics will populate as users complete sets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SYSTEM ANNOUNCEMENTS & BROADCAST BANNER
      ========================================================================= */}
      {activeTab === 'announcements' && (
        <form onSubmit={handleSaveAnnouncement} className="space-y-4">
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white">Broadcast Announcement</h2>
                <p className="text-xs text-zinc-400">
                  Displays a persistent or dismissible banner to all lifters.
                </p>
              </div>

              {/* Active Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={annActive}
                  onChange={(e) => setAnnActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Banner Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['info', 'warning', 'success'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAnnType(t)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        annType === t
                          ? 'bg-zinc-800 border-emerald-500 text-white shadow'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Badge Title
                </label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g., Scheduled Maintenance, New Feature"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Announcement Message
                </label>
                <textarea
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter message for all lifters..."
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Live Preview */}
              <div className="pt-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Live Preview:
                </span>
                <div
                  className={`p-3 rounded-2xl border text-xs ${
                    annType === 'warning'
                      ? 'bg-amber-950/60 border-amber-800/80 text-amber-200'
                      : annType === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                      : 'bg-sky-950/60 border-sky-800/80 text-sky-200'
                  }`}
                >
                  <div className="font-black text-[10px] uppercase tracking-wider mb-0.5">
                    {annTitle || 'Notice'}
                  </div>
                  <div className="font-medium">{annMessage || 'Message preview will appear here.'}</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingAnn}
              className="w-full h-11 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs shadow-lg shadow-emerald-950/40 active-press transition-all flex items-center justify-center gap-2"
            >
              {isSavingAnn ? 'Saving...' : 'Apply Announcement'}
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 5: DATABASE & CACHE HYGIENE
      ========================================================================= */}
      {activeTab === 'hygiene' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <div>
              <h2 className="text-sm font-black text-white">Database & Storage Hygiene</h2>
              <p className="text-xs text-zinc-400">
                Maintain database performance and purge orphaned or incomplete records.
              </p>
            </div>

            <div className="space-y-3">
              {/* Clean Empty Workouts */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <div className="text-xs font-bold text-white">Purge Abandoned Workouts</div>
                  <p className="text-[11px] text-zinc-400">
                    Removes sessions where 0 sets were logged or completed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCleanupWorkouts}
                  disabled={isCleaningWorkouts}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold shrink-0 transition-colors"
                >
                  {isCleaningWorkouts ? 'Cleaning...' : 'Purge'}
                </button>
              </div>

              {/* Flush Client Caches */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <div className="text-xs font-bold text-white">Reset Local Client Cache</div>
                  <p className="text-[11px] text-zinc-400">
                    Clears cached exercises and routine templates to force fresh network sync.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('gymtracker_exercises_cache');
                    localStorage.removeItem('gymtracker_routines_v1');
                    showToast('Client caches cleared. Revalidating...', 'info');
                    refresh();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold shrink-0 transition-colors"
                >
                  Clear Cache
                </button>
              </div>

              {/* RPC Server Status */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${metrics.is_rpc_active ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-xs font-bold text-zinc-300">Superadmin RPC Engine</span>
                </div>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    metrics.is_rpc_active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {metrics.is_rpc_active ? 'Active' : 'Fallback'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: USER DETAIL & MODERATION ACTIONS
      ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[88vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {selectedUser.avatar_url ? (
                    <BlurImage src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black text-lg">
                      {(selectedUser.display_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedUser.display_name || 'Lifter'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedUser.email || 'Email not loaded'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User UID */}
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-zinc-300 truncate select-all">
                {selectedUser.id}
              </code>
              <button
                onClick={(e) => handleCopyId(selectedUser.id, e)}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 flex items-center gap-1 shrink-0"
              >
                {copiedId === selectedUser.id ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>

            {/* Moderation Actions Banner */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Account Moderation
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isSendingReset || !selectedUser.email}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-200 disabled:opacity-40 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSendingReset ? 'Sending...' : 'Reset Password'}</span>
                </button>

                {isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={handleDeleteUser}
                    disabled={isDeletingUser}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingUser ? 'Deleting...' : 'Confirm Purge'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/60 text-xs font-bold text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge User</span>
                  </button>
                )}
              </div>
            </div>

            {/* User Activity / Recent Workouts Inspection */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Recent Training Sessions
              </span>

              {isLoadingWorkouts ? (
                <div className="py-4 text-center text-xs text-zinc-500 animate-pulse">
                  Loading workouts...
                </div>
              ) : userWorkouts.length === 0 ? (
                <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500 text-center">
                  No workout history recorded for this user yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {userWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{w.name}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {new Date(w.started_at).toLocaleDateString()} • {w.total_sets} sets
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {w.completed_at ? 'Finished' : 'In Progress'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full h-11 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs active-press transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD GLOBAL EXERCISE
      ========================================================================= */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <form
            onSubmit={handleAddGlobalExercise}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Add Global Exercise</h3>
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="e.g. Romanian Deadlift"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newExCategory}
                    onChange={(e) => setNewExCategory(e.target.value as any)}
                    className="w-full h-10 px-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none"
                  >
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="legs">Legs</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="arms">Arms</option>
                    <option value="core">Core</option>
                    <option value="olympic">Olympic</option>
                    <option value="cardio">Cardio</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Equipment
                  </label>
                  <select
                    value={newExEquipment}
                    onChange={(e) => setNewExEquipment(e.target.value as any)}
                    className="w-full h-10 px-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none"
                  >
                    <option value="barbell">Barbell</option>
                    <option value="dumbbell">Dumbbell</option>
                    <option value="machine">Machine</option>
                    <option value="cable">Cable</option>
                    <option value="bodyweight">Bodyweight</option>
                    <option value="smith_machine">Smith Machine</option>
                    <option value="band">Resistance Band</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={newExNotes}
                  onChange={(e) => setNewExNotes(e.target.value)}
                  placeholder="e.g. Focus on hamstring stretch"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddExerciseOpen(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 text-zinc-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingExercise || !newExName.trim()}
                className="flex-1 h-10 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs transition-colors"
              >
                {isSavingExercise ? 'Saving...' : 'Add Exercise'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD SYSTEM ROUTINE TEMPLATE
      ========================================================================= */}
      {isAddRoutineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <form
            onSubmit={handleAddSystemRoutine}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Publish Official Template</h3>
              <button
                type="button"
                onClick={() => setIsAddRoutineOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  placeholder="e.g. Upper Body Strength"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newRoutineDesc}
                  onChange={(e) => setNewRoutineDesc(e.target.value)}
                  placeholder="e.g. Hypertrophy focus on Chest & Back"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-zinc-400">
                    Exercises ({routineExercises.length})
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setRoutineExercises((prev) => [
                        ...prev,
                        { name: 'Barbell Squat', sets: 3, reps: 8 },
                      ])
                    }
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300"
                  >
                    + Add Exercise
                  </button>
                </div>

                {routineExercises.map((re, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={re.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoutineExercises((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                        className="flex-1 h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs"
                      >
                        {allExercises.map((ex) => (
                          <option key={ex.id} value={ex.name}>
                            {ex.name}
                          </option>
                        ))}
                      </select>

                      {routineExercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setRoutineExercises((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="w-6 h-6 rounded text-zinc-500 hover:text-rose-400 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[10px] text-zinc-500">Sets:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={re.sets}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 3;
                            setRoutineExercises((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, sets: val } : item))
                            );
                          }}
                          className="w-14 h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-white text-xs text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-[10px] text-zinc-500">Reps:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={re.reps}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 10;
                            setRoutineExercises((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, reps: val } : item))
                            );
                          }}
                          className="w-14 h-7 px-2 rounded bg-zinc-950 border border-zinc-800 text-white text-xs text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddRoutineOpen(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 text-zinc-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRoutine || !newRoutineName.trim()}
                className="flex-1 h-10 rounded-xl bg-sky-400 hover:bg-sky-300 text-black font-black text-xs transition-colors"
              >
                {isSavingRoutine ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
