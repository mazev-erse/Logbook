import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Timer,
  Smartphone,
  ArrowRight,
  Check,
  Flame,
  Sparkles,
  ChevronDown,
  Activity,
  Utensils,
  HeartPulse,
  Download,
  Play,
  TrendingUp,
  Moon,
  Volume2,
  Layers,
  Database,
  Sliders,
} from 'lucide-react';
import { calculatePlates } from '../../lib/plateCalculator';
import { calculate1RM, cn } from '../../lib/utils';
import { usePWA } from '../../hooks/usePWA';

interface LandingPageProps {
  onLaunchApp: () => void;
  onSignIn?: () => void;
  onStartWorkout?: () => void;
  isSignedIn?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchApp,
  onSignIn,
  onStartWorkout,
  isSignedIn = false,
}) => {
  const { canInstall, installApp, isInstalled } = usePWA();

  // Interactive Plate Calculator State
  const [calcWeight, setCalcWeight] = useState<number>(100);
  const [calcReps, setCalcReps] = useState<number>(5);

  // Interactive Rest Timer Demo State
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Interactive FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Rest Timer Countdown Effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Calculate plate distribution
  const plateBreakdown = calculatePlates(calcWeight, 20);
  const estimated1RM = calculate1RM(calcWeight, calcReps);

  // Plate color styling by weight
  const getPlateColor = (weight: number) => {
    switch (weight) {
      case 25:
        return 'bg-rose-600 text-white border-rose-400';
      case 20:
        return 'bg-blue-600 text-white border-blue-400';
      case 15:
        return 'bg-amber-400 text-zinc-950 border-amber-300';
      case 10:
        return 'bg-emerald-600 text-white border-emerald-400';
      case 5:
        return 'bg-zinc-100 text-zinc-900 border-zinc-300';
      case 2.5:
        return 'bg-zinc-800 text-zinc-100 border-zinc-600';
      case 1.25:
        return 'bg-zinc-400 text-zinc-950 border-zinc-200';
      default:
        return 'bg-zinc-700 text-white border-zinc-500';
    }
  };

  const getPlateHeightClass = (weight: number) => {
    switch (weight) {
      case 25:
        return 'h-28 sm:h-32 w-5 sm:w-6';
      case 20:
        return 'h-24 sm:h-28 w-5 sm:w-6';
      case 15:
        return 'h-20 sm:h-24 w-4 sm:w-5';
      case 10:
        return 'h-16 sm:h-20 w-4 sm:w-5';
      case 5:
        return 'h-12 sm:h-14 w-3.5 sm:w-4';
      case 2.5:
        return 'h-10 sm:h-12 w-3 sm:w-3.5';
      case 1.25:
        return 'h-8 sm:h-10 w-2.5 sm:w-3';
      default:
        return 'h-10 w-3';
    }
  };

  const handleTimerToggle = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const handleTimerAdd30 = () => {
    setTimerSeconds((prev) => prev + 30);
  };

  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setTimerSeconds(90);
  };

  const faqs = [
    {
      q: 'Do I need to sign up or create an account to start tracking?',
      a: 'No. Logbook is local-first. You can open the app and log workouts immediately without entering an email or password. When you want cloud backup across devices, you can link an account anytime with zero data loss.',
    },
    {
      q: 'Does Logbook work completely offline in basement gyms?',
      a: 'Yes! Logbook is built as a Progressive Web App (PWA) with Service Worker caching. All your routines, exercises, and workout logs are stored instantly in local device storage and synced automatically once internet connectivity resumes.',
    },
    {
      q: 'What is the 36-Hour Streak Rescue feature?',
      a: 'Traditional fitness apps break your streak at midnight. If you work out late at night or cross time zones, Logbook grants a smart 36-hour grace window so your hard-earned consistency is never penalized by arbitrary calendar clocks.',
    },
    {
      q: 'Can I import my workout history from Strong or Hevy?',
      a: 'Yes. Logbook features a built-in Data Management engine in Profile settings. You can import CSV and JSON workout exports directly from apps like Strong or Hevy, and export your data anytime.',
    },
    {
      q: 'Is Logbook free?',
      a: 'Yes! Logbook is 100% free and open-source. There are no paywalled features, subscription tiers, or banner ads interrupting your gym sessions.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[400px] bg-sky-500/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[400px] bg-emerald-600/8 rounded-full blur-[150px]" />
      </div>

      {/* STICKY HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050508]/85 border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/40">
              <Dumbbell className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">Logbook</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {isInstalled ? 'Installed' : 'v2.0 PWA'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Gym Ergonomics & Overload Tracker</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400">
            <a href="#axioms" className="hover:text-emerald-400 transition-colors">Ergonomics</a>
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#calculator" className="hover:text-emerald-400 transition-colors">Plate Calculator</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-2.5">
            {canInstall && (
              <button
                onClick={installApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold active-press transition-all"
                title="Install Progressive Web App"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Install App</span>
              </button>
            )}

            {!isSignedIn && onSignIn && (
              <button
                onClick={onSignIn}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active-press"
              >
                Sign In
              </button>
            )}

            <button
              onClick={onLaunchApp}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 active-press transition-all"
            >
              <span>{isSignedIn ? 'Open Tracker' : 'Launch Free App'}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-8 text-center max-w-5xl mx-auto">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-bold mb-6 shadow-md shadow-black/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Zero Fluff • Mobile-First PWA • Built for Chalk & Sweat</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
          BRUTALLY EFFICIENT<span className="text-emerald-400">.</span><br />
          LOGGING FOR REAL LIFTERS<span className="text-emerald-400">.</span>
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Engineered for one-handed operation under harsh gym fluorescent lights.
          Oversized 56px touch targets, Olympic plate calculator, active rest chime, and local-first offline speed.
        </p>

        {/* Primary Hero Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={onLaunchApp}
            className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/80 active-press transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-black stroke-none" />
            <span>Launch Free Tracker</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          {onStartWorkout && (
            <button
              onClick={onStartWorkout}
              className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-100 font-bold text-sm flex items-center justify-center gap-2 active-press transition-all"
            >
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>Start Quick Workout</span>
            </button>
          )}

          {canInstall && (
            <button
              onClick={installApp}
              className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 active-press transition-all"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Install to Home Screen</span>
            </button>
          )}
        </div>

        {/* Feature Highlights Pills */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xl font-mono font-black text-emerald-400">0 ms</div>
            <div className="text-xs text-zinc-400 font-medium mt-0.5">Instant local-first launch</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xl font-mono font-black text-white">56 px</div>
            <div className="text-xs text-zinc-400 font-medium mt-0.5">Chalk-safe touch targets</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xl font-mono font-black text-sky-400">100%</div>
            <div className="text-xs text-zinc-400 font-medium mt-0.5">Offline PWA reliability</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-xl font-mono font-black text-amber-400">36 hrs</div>
            <div className="text-xs text-zinc-400 font-medium mt-0.5">Streak rescue grace window</div>
          </div>
        </div>
      </section>

      {/* APP INTERACTIVE SHOWCASE MOCKUP */}
      <section className="relative z-10 py-10 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 p-4 sm:p-7 shadow-2xl shadow-black/80 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-zinc-500 ml-2">Live Session Preview • Heavy Push Day</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>ACTIVE SET</span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Simulated Exercise Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Barbell Bench Press</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Chest
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Working sets with Olympic 20kg bar</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-emerald-400 font-black">Est. 1RM</span>
                  <div className="text-lg font-mono font-black text-white">122.5 kg</div>
                </div>
              </div>

              {/* Set Rows */}
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-zinc-500 px-2">
                  <div className="col-span-2">Set</div>
                  <div className="col-span-4">Weight (kg)</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm">
                  <div className="col-span-2 font-mono font-black text-zinc-400">1</div>
                  <div className="col-span-4 font-mono font-black text-white">80 kg</div>
                  <div className="col-span-3 font-mono font-black text-zinc-300">10 reps</div>
                  <div className="col-span-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      <Check className="w-3 h-3" /> Done
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/40 text-sm ring-1 ring-emerald-500/30">
                  <div className="col-span-2 font-mono font-black text-emerald-400">2</div>
                  <div className="col-span-4 font-mono font-black text-white flex items-center gap-1">
                    <span>100 kg</span>
                    <span className="text-[9px] font-mono text-zinc-500">(2 plates)</span>
                  </div>
                  <div className="col-span-3 font-mono font-black text-emerald-300">6 reps</div>
                  <div className="col-span-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-500/50">
                      <Check className="w-3.5 h-3.5" /> PR
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-sm opacity-70">
                  <div className="col-span-2 font-mono font-black text-zinc-500">3</div>
                  <div className="col-span-4 font-mono font-black text-zinc-400">100 kg</div>
                  <div className="col-span-3 font-mono font-black text-zinc-500">Target 6</div>
                  <div className="col-span-3 text-right">
                    <span className="text-[11px] font-mono text-zinc-500">Upcoming</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Active Rest Timer Bar */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-amber-500/40 flex items-center justify-between shadow-lg shadow-amber-950/20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTimerToggle}
                  className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 active-press hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title={isTimerRunning ? 'Pause timer' : 'Start countdown'}
                >
                  <Timer className={cn('w-5 h-5', isTimerRunning && 'animate-spin')} style={{ animationDuration: '6s' }} />
                </button>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Active Rest Countdown</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {isTimerRunning ? 'Running' : 'Paused (Click to Test)'}
                    </span>
                  </div>
                  <div className="text-lg font-mono font-black text-white">
                    {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')} remaining
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTimerAdd30}
                  className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 active-press transition-colors cursor-pointer"
                >
                  +30s
                </button>
                <button
                  type="button"
                  onClick={handleTimerReset}
                  className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 active-press transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE 4 ERGONOMIC AXIOMS (design.md) */}
      <section id="axioms" className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built For Real Environments</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            The 4 Physical Axioms of Logbook
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Logging heavy sets with chalk on your hands and sweaty thumbs while breathing heavily is an extreme operating environment. We designed around the human body.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Axiom 1 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <span className="text-lg font-mono font-black">56</span>
              </div>
              <h3 className="text-lg font-black text-white">1. 56px Minimum Touch Target</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Fat, shaky, or chalky fingers cannot miss critical interactive targets. Steppers, checkmarks, and routine triggers are physically enlarged to eliminate frustrating mis-clicks.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Check className="w-4 h-4" /> Zero mis-clicks between heavy sets
            </div>
          </div>

          {/* Axiom 2 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                <Smartphone className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-black text-white">2. Bottom-Heavy Thumb Zone</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                All primary navigation, inputs, finish buttons, and weight steppers sit in the lower 40% of the screen. No awkward two-handed finger gymnastics on modern tall phones.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center gap-2 text-xs font-mono text-sky-400">
              <Check className="w-4 h-4" /> 100% one-handed natural thumb ergonomics
            </div>
          </div>

          {/* Axiom 3 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 mb-4">
                <Moon className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-black text-white">3. True-Black OLED Palette (#050508)</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Rejects low-contrast gray-on-gray styling. Pure OLED pixel shutdown cuts through overhead gym halogen glare, maximizes readability, and drastically saves battery life.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center gap-2 text-xs font-mono text-zinc-300">
              <Check className="w-4 h-4" /> Glare-proof contrast + battery preservation
            </div>
          </div>

          {/* Axiom 4 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <Volume2 className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-black text-white">4. Multi-Modal Sensory Cues</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Web Audio synthesized bell chime + dual-pulse haptic vibration inform you precisely when your rest period expires — even when gym speakers are blasting loud music.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-800/70 flex items-center gap-2 text-xs font-mono text-amber-400">
              <Check className="w-4 h-4" /> Audio chime + haptic vibration alerting
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE OLYMPIC BARBELL & PLATE CALCULATOR DEMO */}
      <section id="calculator" className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-zinc-800/90 bg-zinc-950/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold mb-3 border border-emerald-500/20">
                <Sliders className="w-3.5 h-3.5" />
                <span>TRY IT LIVE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Interactive Olympic Barbell & Plate Calculator
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                No more mental gym math while oxygen-depleted. Select your target barbell weight to see the exact plate stack per side.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {[60, 100, 140, 180, 220].map((w) => (
                <button
                  key={w}
                  onClick={() => setCalcWeight(w)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl font-mono text-xs font-bold active-press transition-all',
                    calcWeight === w
                      ? 'bg-emerald-400 text-black shadow-md shadow-emerald-950/60'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  )}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Controls */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                Barbell Target Weight (20kg bar included)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="260"
                  step="2.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <span className="font-mono font-black text-2xl text-emerald-400 w-24 text-right">
                  {calcWeight} <span className="text-xs text-zinc-400">kg</span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                Reps to Calculate Est. 1RM
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={calcReps}
                  onChange={(e) => setCalcReps(Number(e.target.value))}
                  className="flex-1 accent-sky-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
                />
                <span className="font-mono font-black text-2xl text-sky-400 w-20 text-right">
                  {calcReps} <span className="text-xs text-zinc-400">reps</span>
                </span>
              </div>
            </div>
          </div>

          {/* Barbell Visual Representation */}
          <div className="mt-8 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <div className="text-center mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Barbell Plate Breakdown (Per Side: <strong className="text-white">{plateBreakdown.weightPerSide} kg</strong>)
              </span>
            </div>

            {/* Visual Barbell Stack */}
            <div className="relative flex items-center justify-center py-6 overflow-x-auto min-h-[140px]">
              {/* Left Bar Collar */}
              <div className="h-4 w-12 bg-zinc-600 rounded-l-sm border-r-2 border-zinc-500 shrink-0" />
              
              {/* Left Plates (Mirrored) */}
              <div className="flex items-center flex-row-reverse gap-1 px-1">
                {plateBreakdown.platesPerSide.flatMap(({ weight, count }) =>
                  Array.from({ length: count }).map((_, i) => (
                    <div
                      key={`l-${weight}-${i}`}
                      title={`${weight}kg plate`}
                      className={cn(
                        'rounded-sm border flex items-center justify-center font-mono font-black text-[9px] select-none shadow-md',
                        getPlateColor(weight),
                        getPlateHeightClass(weight)
                      )}
                    >
                      <span className="-rotate-90 hidden sm:inline">{weight}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Barbell Center Shaft (20kg Olympic Bar) */}
              <div className="h-6 w-32 sm:w-48 bg-gradient-to-r from-zinc-500 via-zinc-400 to-zinc-500 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold text-zinc-900 shadow-inner px-2 shrink-0">
                20KG BAR
              </div>

              {/* Right Plates */}
              <div className="flex items-center gap-1 px-1">
                {plateBreakdown.platesPerSide.flatMap(({ weight, count }) =>
                  Array.from({ length: count }).map((_, i) => (
                    <div
                      key={`r-${weight}-${i}`}
                      title={`${weight}kg plate`}
                      className={cn(
                        'rounded-sm border flex items-center justify-center font-mono font-black text-[9px] select-none shadow-md',
                        getPlateColor(weight),
                        getPlateHeightClass(weight)
                      )}
                    >
                      <span className="rotate-90 hidden sm:inline">{weight}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Right Bar Collar */}
              <div className="h-4 w-12 bg-zinc-600 rounded-r-sm border-l-2 border-zinc-500 shrink-0" />
            </div>

            {/* Numerical breakdown badges */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-2">
              {plateBreakdown.platesPerSide.length === 0 ? (
                <span className="text-xs font-mono text-zinc-500">Empty Barbell (20 kg)</span>
              ) : (
                plateBreakdown.platesPerSide.map((p) => (
                  <span
                    key={p.weight}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs font-mono font-bold text-zinc-200"
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full inline-block', getPlateColor(p.weight))} />
                    <span>{p.count} × {p.weight}kg</span>
                    <span className="text-zinc-500 text-[10px]">per side</span>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Metrics result summary */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Total Lift Weight</span>
              <div className="text-xl font-mono font-black text-white">{calcWeight} kg</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Per Barbell Sleeve</span>
              <div className="text-xl font-mono font-black text-emerald-400">{plateBreakdown.weightPerSide} kg</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-[11px] font-mono uppercase text-zinc-400">Estimated 1RM (Epley)</span>
              <div className="text-xl font-mono font-black text-sky-400">{estimated1RM} kg</div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400 font-bold mb-2">
            <Activity className="w-3.5 h-3.5" />
            <span>Engineered For Progression</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything You Need. Zero Fluff.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Most gym apps are clogged with social feeds, video paywalls, and useless clutter. Logbook stays pure: logging, progression, nutrition, and recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <TrendingUp className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">Progressive Overload Analytics</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Automated session volume tonnage, 1RM trendline charts, and personal record banners powered by Recharts. Know exactly when to add weight.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <Layers className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">Pre-Seeded Routine Splits</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Launch Push/Pull/Legs, Upper/Lower, or Arnold Splits with 1 tap. All exercises, target sets, and target reps are pre-filled so you can start immediately.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Flame className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">36-Hour Streak Protection</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Midnight shouldn't wipe your workout streak. Logbook gives you a generous 36-hour grace window to log yesterday's session and keep your fire burning.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Utensils className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">Macro & Calorie Fueling</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Log daily nutrition with built-in USDA & Bangladeshi food databases, protein targets, and dynamic BMR/TDEE calorie deficit/surplus calculators.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
              <HeartPulse className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">Sports Recovery & Sleep</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Track muscle group soreness scores, sleep duration, and active recovery steps. Prevent central nervous system burnout before it happens.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Database className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-lg font-black text-white">Data Freedom & CSV Export</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Your workout data belongs to you. Export raw CSV or JSON data anytime, or migrate your logs directly from Strong and Hevy with one click.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / 3-STEP WORKFLOW */}
      <section className="relative z-10 py-16 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/90 shadow-2xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Simple 3-Step Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              From Gym Door to Logged PR in Seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-black font-mono font-black text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="text-base font-black text-white">Pick a Split</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Choose a pre-made Push/Pull/Legs routine or start an empty quick session.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-sky-400 text-black font-mono font-black text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="text-base font-black text-white">Tap Huge Steppers</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Log weights and reps with 56px touch targets. Tap set numbers for the plate calculator.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-black font-mono font-black text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="text-base font-black text-white">Rest & Repeat</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Hear the audio chime when rest expires. Finish the workout and celebrate with confetti.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
            Answers & Clarity
          </span>
          <h2 className="text-3xl font-black text-white mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 active-press"
                >
                  <span className="text-sm sm:text-base font-bold text-white">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180 text-emerald-400'
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/40">
                    <p className="mt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL BOTTOM CALL-TO-ACTION */}
      <section className="relative z-10 py-16 px-4 sm:px-8 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-emerald-500/30 shadow-2xl shadow-emerald-950/40">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/80 mb-6">
            <Dumbbell className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Ready to Crush Your Next Session?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Ditch the bloated fitness subscriptions and clunky spreadsheets. Start logging your workouts in under 5 seconds with zero friction.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/80 active-press transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-black stroke-none" />
              <span>{isSignedIn ? 'Open Workout Log' : 'Start Free Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            {canInstall && (
              <button
                onClick={installApp}
                className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-100 font-bold text-sm flex items-center justify-center gap-2 active-press transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Add to Home Screen</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-zinc-800/80 bg-[#050508] py-10 px-4 sm:px-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-zinc-300">Logbook Gym Tracker</span>
            <span>— Mobile-First PWA</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-400">
            <button onClick={onLaunchApp} className="hover:text-emerald-400 transition-colors">
              App
            </button>
            <a href="#axioms" className="hover:text-emerald-400 transition-colors">
              Ergonomics
            </a>
            <a href="#calculator" className="hover:text-emerald-400 transition-colors">
              Calculator
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </div>

          <p className="text-[11px] text-zinc-600">
            Engineered for lifters. Local-first & privacy respectful.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
