import { useState, useEffect, useRef } from 'react';
import { Header } from './components/common/Header';
import { BottomNav, type TabType } from './components/common/BottomNav';
import { RestTimerBar } from './components/common/RestTimerBar';
import { ShortcutHintsModal } from './components/common/ShortcutHintsModal';
import { HomeView } from './components/home/HomeView';
import { WorkoutLogger } from './components/workout/WorkoutLogger';
import { HistoryView } from './components/history/HistoryView';
import { DietOrganizer } from './components/diet/DietOrganizer';
import { ProgressView } from './components/progress/ProgressView';
import { Profile } from './components/profile/Profile';
import { Routines } from './components/routines/Routines';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LandingPage } from './components/landing/LandingPage';
import { SystemAnnouncementBanner } from './components/common/SystemAnnouncementBanner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useActiveWorkout } from './hooks/useActiveWorkout';
import { useRestTimer } from './hooks/useRestTimer';
import { SEED_TEMPLATES } from './hooks/useRoutines';
import { DEFAULT_EXERCISES } from './hooks/useExercises';
import { generateUUID, transitionView } from './lib/utils';
import type { Routine } from './types/database';
import { Dumbbell, Plus, Sparkles } from 'lucide-react';
import { ToastProvider, useToast } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function GymTrackerApp() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType | 'routines' | 'admin' | 'landing'>('home');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const navigateTab = (tab: TabType | 'routines' | 'admin' | 'landing') => {
    if (tab === activeTab) return;
    window.history.pushState({ tab }, '', `#${tab}`);
    transitionView(() => {
      setActiveTab(tab);
    });
  };

  useEffect(() => {
    const validTabs = ['landing', 'home', 'workout', 'diet', 'history', 'progress', 'profile', 'routines', 'admin'];
    const initialHash = window.location.hash.replace('#', '') as TabType | 'routines' | 'admin' | 'landing';
    if (validTabs.includes(initialHash)) {
      setActiveTab(initialHash);
      window.history.replaceState({ tab: initialHash }, '', `#${initialHash}`);
    } else {
      window.history.replaceState({ tab: 'home' }, '', '#home');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modalSheet) return;
      const targetTab = (e.state?.tab || window.location.hash.replace('#', '') || 'home') as TabType | 'routines' | 'admin' | 'landing';
      if (validTabs.includes(targetTab)) {
        transitionView(() => {
          setActiveTab(targetTab);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Predictive Back edge-swipe gesture tracking
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= 28) {
      touchStartXRef.current = touch.clientX;
      if (mainRef.current) {
        mainRef.current.style.transition = 'none';
        mainRef.current.style.willChange = 'transform, opacity, border-radius';
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !mainRef.current) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (deltaX > 0) {
      const scale = Math.max(0.92, 1 - (deltaX / 800) * 0.08);
      const opacity = Math.max(0.75, 1 - (deltaX / 800) * 0.25);
      const radius = Math.min(24, (deltaX / 80) * 24);
      mainRef.current.style.transform = `translateX(${deltaX}px) scale(${scale})`;
      mainRef.current.style.opacity = `${opacity}`;
      mainRef.current.style.borderRadius = `${radius}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !mainRef.current) return;
    const deltaX = (e.changedTouches[0]?.clientX || 0) - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX > 80) {
      mainRef.current.style.transition = 'transform 0.18s cubic-bezier(0.2, 0, 0, 1), opacity 0.18s ease-out';
      mainRef.current.style.transform = 'translateX(100%)';
      mainRef.current.style.opacity = '0';
      setTimeout(() => {
        if (mainRef.current) {
          mainRef.current.style.transform = '';
          mainRef.current.style.opacity = '';
          mainRef.current.style.borderRadius = '';
          mainRef.current.style.transition = '';
        }
        window.history.back();
      }, 180);
    } else {
      mainRef.current.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, border-radius 0.22s ease';
      mainRef.current.style.transform = 'translateX(0) scale(1)';
      mainRef.current.style.opacity = '1';
      mainRef.current.style.borderRadius = '0px';
      setTimeout(() => {
        if (mainRef.current) {
          mainRef.current.style.transition = '';
          mainRef.current.style.transform = '';
          mainRef.current.style.opacity = '';
          mainRef.current.style.borderRadius = '';
        }
      }, 220);
    }
  };

  // Rest Timer Hook
  const {
    remainingSeconds,
    initialSeconds,
    isActive: isTimerActive,
    notificationPermission,
    enableNotifications,
    startTimer,
    addTime,
    resetTimer,
  } = useRestTimer(90);

  // Active Workout Hook (triggers rest timer on set completion)
  const {
    activeWorkout,
    isSaving,
    startWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleCompleteSet,
    finishWorkout,
    updateStartedAt,
    cancelWorkout,
  } = useActiveWorkout((restSeconds) => {
    startTimer(restSeconds || 90);
  });

  // Start workout from routine (pre-filling exercises, sets & reps)
  const handleStartRoutine = (routine: Routine) => {
    const prefill = routine.exercises.map((e) => {
      const matched = DEFAULT_EXERCISES.find(
        (dex) => dex.name.toLowerCase().trim() === e.exercise_name.toLowerCase().trim()
      );

      return {
        exercise: {
          id: matched ? matched.id : (e.exercise_id || generateUUID()),
          user_id: null,
          name: e.exercise_name,
          category: (matched ? matched.category : 'other') as any,
          equipment: (matched ? matched.equipment : 'other') as any,
          created_at: new Date().toISOString(),
        },
        targetSets: e.target_sets,
        targetReps: e.target_reps,
      };
    });

    startWorkout(routine.name, prefill);
    navigateTab('workout');
  };

  const handleStartWorkout = async (name = 'Workout', customStartedAt?: string) => {
    // Check if name matches a pre-seeded template
    const matchedTemplate = SEED_TEMPLATES.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );

    if (matchedTemplate) {
      handleStartRoutine(matchedTemplate);
    } else {
      await startWorkout(name, undefined, customStartedAt);
      navigateTab('workout');
    }
  };

  const handleFinishWorkout = async (debrief?: {
    notes?: string;
    mood?: import('./types/database').WorkoutMood;
    sessionRpe?: number;
    startedAt?: string;
  }) => {
    try {
      await finishWorkout(debrief);
      resetTimer();
      navigateTab('history');
    } catch (err: any) {
      if (
        err?.message?.includes('Grace period expired') ||
        err?.message?.includes('check_workout_36h_grace_period') ||
        err?.code === '23514' ||
        err?.details?.includes('36')
      ) {
        showToast('Grace period expired. This workout can no longer be logged.', 'error');
      } else {
        showToast(err?.message || 'Failed to save workout', 'error');
      }
      throw err;
    }
  };

  const handleCancelWorkout = async () => {
    await cancelWorkout();
    resetTimer();
    setActiveTab('home');
  };

  // Forward mouse wheel scrolling anywhere on desktop window to main scroll container
  useEffect(() => {
    const handleWindowWheel = (e: WheelEvent) => {
      const main = document.querySelector('main');
      if (main && e.target instanceof Node && !main.contains(e.target)) {
        main.scrollTop += e.deltaY;
      }
    };
    window.addEventListener('wheel', handleWindowWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWindowWheel);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in forms/inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Escape: Close shortcut modal or cancel rest timer
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isTimerActive) {
          resetTimer();
          return;
        }
      }

      // ? or Shift + /: Toggle keyboard shortcuts cheatsheet
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // 1-6: Direct tab switches
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        const tabMap: Record<string, TabType> = {
          '1': 'home',
          '2': 'workout',
          '3': 'diet',
          '4': 'history',
          '5': 'progress',
          '6': 'profile',
        };
        navigateTab(tabMap[e.key]);
        return;
      }

      // N: Start workout / go to active workout
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        if (activeWorkout) {
          navigateTab('workout');
        } else {
          handleStartWorkout('Workout');
        }
        return;
      }

      // R: Routines & Split templates
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        navigateTab('routines');
        return;
      }

      // Space: Add 30s to active rest timer
      if (e.code === 'Space' || e.key === ' ') {
        if (isTimerActive) {
          e.preventDefault();
          addTime(30);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isTimerActive, activeWorkout, activeTab]);

    if (activeTab === 'landing') {
    return (
      <LandingPage
        isSignedIn={true}
        onLaunchApp={() => navigateTab('home')}
        onStartWorkout={() => handleStartWorkout('Workout')}
      />
    );
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0b0e0b] text-zinc-100">
      {/* Header */}
      <Header
        onNavigateToAdmin={() => setActiveTab('admin')}
        onNavigateToProfile={() => navigateTab('profile')}
        isWorkoutActive={Boolean(activeWorkout)}
        restRemaining={remainingSeconds}
      />

      {/* Global System Announcement Banner */}
      <SystemAnnouncementBanner />

      {/* Main Content Views */}
      <div className="flex min-h-0 flex-1">
      <BottomNav
        activeTab={activeTab === 'routines' ? 'workout' : activeTab === 'admin' ? 'profile' : activeTab}
        onTabChange={navigateTab}
        isWorkoutActive={Boolean(activeWorkout)}
      />
      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="app-main-content min-h-0 min-w-0 flex-1 origin-left overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      >
        <div className="mx-auto w-full max-w-[1500px]">
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <HomeView
            activeWorkout={activeWorkout}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={() => navigateTab('workout')}
            onNavigateToProgress={() => navigateTab('progress')}
            onNavigateToRoutines={() => navigateTab('routines')}
          />
        </div>

        {activeTab === 'admin' && (
          <AdminDashboard onBack={() => navigateTab('home')} />
        )}

        <div className={activeTab === 'routines' ? 'block' : 'hidden'}>
          <Routines
            onStartRoutine={handleStartRoutine}
            onBack={() => navigateTab('home')}
          />
        </div>

        <div className={activeTab === 'workout' ? 'block' : 'hidden'}>
          {activeWorkout ? (
            <WorkoutLogger
              workout={activeWorkout}
              onAddExercise={addExercise}
              onRemoveExercise={removeExercise}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onUpdateSet={updateSet}
              onToggleCompleteSet={toggleCompleteSet}
              onFinishWorkout={handleFinishWorkout}
              onCancelWorkout={handleCancelWorkout}
              onUpdateStartedAt={updateStartedAt}
              isSaving={isSaving}
            />
          ) : (
            <div className="py-24 px-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
                <Dumbbell className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">No Workout in Progress</h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  Start an empty session or pick a routine template to start logging with pre-filled sets.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleStartWorkout('Workout')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm shadow-xl shadow-emerald-950/60 active-press transition-all"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Start Empty Workout</span>
                  <kbd className="kbd-hint hidden sm:inline-flex text-[9px] text-zinc-900 bg-emerald-300 border-emerald-500 border-b-emerald-600">N</kbd>
                </button>
                <button
                  onClick={() => navigateTab('routines')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold text-sm active-press transition-all"
                >
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Browse Routines</span>
                  <kbd className="kbd-hint hidden sm:inline-flex text-[9px]">R</kbd>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={activeTab === 'diet' ? 'block' : 'hidden'}>
          <DietOrganizer />
        </div>

        <div className={activeTab === 'history' ? 'block' : 'hidden'}>
          <HistoryView onStartWorkout={handleStartWorkout} />
        </div>

        <div className={activeTab === 'progress' ? 'block' : 'hidden'}>
          <ProgressView />
        </div>

        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <Profile onNavigateToAdmin={() => navigateTab('admin')} onNavigateToLanding={() => navigateTab('landing')} />
        </div>
        </div>
      </main>
      </div>

      {/* Floating Rest Timer Bar */}
      <RestTimerBar
        remainingSeconds={remainingSeconds}
        initialSeconds={initialSeconds}
        isActive={isTimerActive}
        notificationPermission={notificationPermission}
        onEnableNotifications={enableNotifications}
        onAddTime={addTime}
        onReset={resetTimer}
        isWorkoutActive={Boolean(activeWorkout)}
      />

      {/* Keyboard Shortcut Hints Cheatsheet Modal */}
      <ShortcutHintsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <ToastProvider>
          <GymTrackerApp />
        </ToastProvider>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

export default App;
