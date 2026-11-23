# Logbook: Design System, UI/UX Specifications & Ergonomics Manual

> **Product**: Logbook Gym Tracker PWA  
> **Target Form Factor**: Mobile-First (OLED smartphones, iOS Safari / Android Chrome PWA)  
> **Aesthetic Archetype**: Matte Charcoal, Energetic Chartreuse, restrained high-contrast status colors
> **Core Objective**: Frictionless, one-handed, sweat-resistant gym logging under harsh fluorescent lighting.

---

## 1. Executive Philosophy & Ergonomic Axioms

Logging heavy lifts with chalk on hands and sweaty thumbs while resting between sets is an extreme operating environment. Logbook uses touch-first controls on phones and a wider navigation rail on desktop:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          GYM ERGONOMIC AXIOMS                          │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. 56px Minimum Touch Target   │ Fat, shaky, or chalky fingers cannot  │
│                                │ miss critical interactive targets.    │
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. Bottom-Heavy Thumb Zone     │ All primary navigation, inputs, and   │
│                                │ drawers sit in the lower 40% screen.  │
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. Matte Charcoal Palette      │ Maintains comfortable contrast with   │
│    (#0b0e0b)                   │ quiet surfaces and clear hierarchy.   │
├────────────────────────────────┼───────────────────────────────────────┤
│ 4. Multi-Modal Sensory Cues    │ Haptic vibration + acoustic chime for │
│                                │ hands-free rest timer expiration.     │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Design Tokens & Foundations

### 2.1 Color Palette

Logbook uses a charcoal canvas (`#0b0e0b`) with matte green-charcoal surfaces. Energetic chartreuse (`#b8e62e`) marks primary actions and the active state; amber, sky, and rose remain reserved for their semantic statuses.

| Token | Hex / Class | Semantic Role |
| :--- | :--- | :--- |
| **Canvas Background** | `#0b0e0b` | Root dark canvas |
| **Card / Surface Base** | `zinc-950` (`#0b0e0b`) | Primary card elevation, drawers, modals |
| **Elevated Surface** | `zinc-900` (`#151a15`) | Steppers, secondary buttons, input fields |
| **Border / Divider** | `zinc-800/80` (`#272e27`) | Structural boundaries and separators |
| **Primary Accent (Chartreuse)** | `emerald-400` (`#b8e62e`) | Primary CTAs, active sets, selected navigation |
| **Analytics / Volume (Sky)** | `sky-400` (`#38bdf8`) | Volume metrics, routines, trendlines |
| **Recovery / Admin (Electric Sky)** | `sky-400` (`#38bdf8`) | Sports recovery, administrator root badge |
| **Warning / Rest Alert (Amber)** | `amber-400` (`#fbbf24`) | Rest timer countdown, 36h streak rescue |
| **Destructive / Deficit (Rose)** | `rose-400` (`#fb7185`) | Delete set, cancel workout, high caloric deficit |
| **Typography Primary** | `zinc-100` (`#f2f5ef`) | Headings, numerical data, active labels |
| **Typography Secondary** | `zinc-400` (`#aeb6a9`) | Subtitles, target reps, unit labels |
| **Typography Muted** | `zinc-500` / `zinc-600` | Inactive hints, historical reference stamps |

### 2.2 Typography Hierarchy

- **System Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Data & Numeric Font**: Strict `font-mono` on numbers, weights, reps, timers, and timestamps for tabular alignment and immediate glancing legibility.
- **Font Weight Tiers**:
  - `font-black` (900): Big numerical readouts, CTAs, modal headers.
  - `font-bold` (700): Section headers, active tab labels, exercise names.
  - `font-medium` (500): Form labels, descriptions, micro badges.

```
Display Numbers:  32px / 2rem       font-black  font-mono  (Timer, 1RM, Streak)
Section Headings: 18px / 1.125rem   font-black  tracking-tight
Subtitles:        11px / 0.6875rem  font-bold   uppercase  tracking-wider text-zinc-400
Set Grid Data:    16px / 1rem       font-black  font-mono  (Weight & Reps)
Micro Badges:     10px / 0.625rem   font-bold   uppercase  tracking-widest
```

### 2.3 Tactile Physics & Micro-Interactions

1. **Chunky Active Press (`.active-press`)**:
   Every clickable element implements an immediate physics bounce:
   ```css
   .active-press {
     transition: transform 0.08s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.08s ease;
   }
   .active-press:active {
     transform: scale(0.95);
     opacity: 0.85;
   }
   ```
2. **Confetti Celebrations**:
   Triggered on workout completion and milestone achievements via `canvas-confetti` (`confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })`).
3. **Web Audio Chime**:
   Uses the Web Audio API to synthesize a pleasant, high-penetration bell chime at rest-timer zero without loading external audio assets.
4. **Haptic Vibration**:
   Dual vibration cue (`navigator.vibrate([200, 100, 200])`) fires on mobile devices when the rest timer concludes.

---

## 3. Shell & Navigation Architecture

The shell fills the viewport and honors iOS safe-area insets. It adapts navigation to the device: a six-item bottom bar on phones and a persistent left rail from the medium breakpoint up. The content canvas can grow to 1500px while individual dashboards keep a readable measure.

```
┌────────────────────────────────────────────────────────┐
│ HEADER (Sticky Top)                                   │
│ [Logbook Icon] Logbook                    [Alerts] [Me]│
├────────────────────────────────────────────────────────┤
│                                                        │
│                   VIEWPORT CONTAINER                   │
│               (responsive content canvas)             │
│                                                        │
│  - Home / Workout / Diet / History / Progress / Profile│
│                                                        │
├────────────────────────────────────────────────────────┤
│ REST TIMER BAR (Floating overlay, bottom-36)           │
│ [Timer Icon] RESTING 01:28   [-30s] [+30s] [X]         │
├────────────────────────────────────────────────────────┤
│ PHONE: bottom navigation  |  DESKTOP: left navigation  │
│ [Home] [Workout] [Diet] [History] [Progress] [Profile] │
└────────────────────────────────────────────────────────┘
```

### 3.1 Sticky Header (`Header.tsx`)
- Left: Logbook brand mark and product name.
- Right: Current notices and session/recovery status, Profile access, and an admin shortcut for authorized accounts.
- Sign-out, install, and data actions live in Profile rather than competing in the global header.

### 3.2 Responsive Navigation (`BottomNav.tsx`)
- 6 dedicated icon destinations in a grid: `Home`, `Workout`, `Diet`, `History`, `Progress`, `Profile`.
- Phone layout: fixed bottom bar with safe-area padding.
- Desktop layout: persistent left rail with readable labels and keyboard shortcut hints.
- Active Workout Indicator: status dot on `Workout` when a session is active.

### 3.3 Active Rest Timer Bar (`RestTimerBar.tsx`)
- Floating HUD placed immediately above the thumb zone.
- Real-time proportional chartreuse progress bar (`bg-emerald-500/20`).
- Oversized quick-adjust touch steppers: `-30s`, `+30s`, and `X` (dismiss).

---

## 4. Screen-by-Screen UI/UX Specifications

### 4.1 Home Dashboard (`HomeView.tsx`)
The home dashboard is built for split-second decisions before stepping onto the gym floor.

1. **Streak Flame Hero Card**:
   - Giant display of consecutive workout days with animated fire icon.
   - 36-Hour Grace Period integration: Automatically surfaces an amber `Streak Rescue` banner if 24 hours have elapsed since the last session, urging the lifter to train before the grace window shuts.
2. **Quick Workout Launcher**:
   - Single high-contrast primary CTA: `Start Empty Workout`.
   - Secondary CTA: `Browse Routines` (opens template drawer).
3. **Sports & Active Recovery Quick-Log**:
   - Compact logging buttons for Cricket, Football, Badminton, Swimming, Running, Walking, and Cycling.
   - Surfaces automated caloric burns and step estimations.
4. **Recent Activity Summary**:
   - Displays the last completed workout's volume, sets, and duration at a glance.

### 4.2 Active Workout Logger (`ActiveWorkoutView.tsx`, `WorkoutLogger.tsx`)
The centerpiece of the entire application.

```
┌────────────────────────────────────────────────────────┐
│ Bench Press (Barbell)                         [⋮ More] │
├───────┬────────────┬─────────────┬──────────┬──────────┤
│ SET   │ PREVIOUS   │ KG          │ REPS     │ DONE     │
├───────┼────────────┼─────────────┼──────────┼──────────┤
│ 1     │ 80kg × 8   │ [  82.5  ]  │ [  8  ]  │   [ ✓ ]  │
│ 2     │ 80kg × 8   │ [  82.5  ]  │ [  8  ]  │   [   ]  │
│ 3     │ 80kg × 6   │ [  85.0  ]  │ [  6  ]  │   [   ]  │
├───────┴────────────┴─────────────┴──────────┴──────────┤
│ [+ Add Set]                          [Plate Breakdown] │
└────────────────────────────────────────────────────────┘
```

1. **Elapsed Stopwatch**:
   - Millisecond-free digital timer at the top with status control buttons (`Finish Workout`, `Cancel`).
2. **Ghost Reference ("Previous")**:
   - Automatically injects the lifter's previous session weight and reps next to the input, eliminating mental math and forcing progressive overload.
3. **One-Tap Completion**:
   - Oversized green checkmark box (`w-11 h-11`). Tapping it completes the set, triggers haptic feedback, and automatically starts the 90-second countdown rest timer.
4. **Plate Calculator & Set Detail Drawer (`SetDetailDrawer.tsx`)**:
   - Tapping any set opens a bottom-sheet drawer detailing:
     - **Olympic Barbell Breakdown**: Computes exact per-side plates needed for standard 20kg bar (25kg, 20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg).
     - **RPE Selector**: 6.0 to 10.0 chips with rate-of-perceived-exertion descriptions.
     - **Quick Steppers**: Instant `-10kg`, `-5kg`, `-2.5kg`, `+2.5kg`, `+5kg`, `+10kg` buttons.
5. **Exercise Picker Modal (`ExercisePickerModal.tsx`)**:
   - Searchable exercise repository filterable by muscle category (`Chest`, `Back`, `Legs`, `Shoulders`, `Arms`, `Core`, `Cardio`).
   - Custom exercise creation tab allowing users to add unique movements with specific equipment tags.
6. **Workout Debrief Modal (`WorkoutDebriefModal.tsx`)**:
   - Triggers when completing a workout:
     - **Mood Badges**: Beast Mode (`🔥`), Felt Strong (`💪`), Solid Effort (`👍`), Pushed Through (`🥱`), Completely Crushed (`💀`).
     - **Session RPE Slider**: 1 to 10 overall fatigue score.
     - **Star Rating**: 1 to 5 stars.
     - **Summary Metrics**: Total volume lifted (kg) and total completed sets.

### 4.3 Routines & Split Templates (`Routines.tsx`, `RoutineBuilderModal.tsx`)
1. **Pre-Built Classic Splits**:
   - Built-in templates: `Push Day (Chest/Shoulders/Triceps)`, `Pull Day (Back/Biceps)`, `Leg Day (Quads/Hamstrings/Calves)`.
   - One-tap `Start Routine`: Instantly instantiates a live workout session pre-populated with prescribed exercises, target sets, and target reps.
2. **Custom Routine Builder (`RoutineBuilderModal.tsx`)**:
   - Multi-exercise sequencing with order-reindexing.
   - Per-exercise target set and target repetition controls.
   - Saved routines persist in Supabase (`routines`, `routine_exercises`) for repeatable split execution.

### 4.4 Diet & Nutrition Organizer (`DietOrganizer.tsx`, `FoodLoggingModal.tsx`)
A rapid calorie and macro tracking engine.

1. **Macronutrient Progress HUD**:
   - 4 segmented progress bars displaying Calories, Protein, Carbs, and Fats against calculated daily TDEE targets.
2. **Custom Meal Categories**:
   - Dynamic horizontally scrolling category tabs (Breakfast, Lunch, Dinner, Snack, Pre-Workout, etc.).
   - Full CRUD category manager with custom icons (`MealCategoryManagerModal.tsx`).
3. **Smart Food Logger (`FoodLoggingModal.tsx`)**:
   - Mode 1: Search engine querying both the USDA food database and local Bangladeshi foods catalog (`bangladeshi_foods`).
   - Mode 2: Custom manual entry form with Zod schema validation.
   - Gram-based auto-calculator: Entering gram weight dynamically scales calories and macronutrients before saving.
4. **Daily Supplement Checklist (`AddSupplementModal.tsx`)**:
   - One-tap daily checkboxes for Creatine, Whey Protein, Multivitamins, Fish Oil, etc.

### 4.5 History & Social Share Card Generator (`HistoryView.tsx`, `canvasCardGenerator.ts`)
Lifters love showcasing their heavy PRs on social media.

1. **Historical Session List**:
   - Expandable chronological cards summarizing volume, duration, mood, and exercises.
   - Filterable tabs between Workouts, Diet History (`DietHistoryList.tsx`), and Supplement Adherence (`SupplementHistoryList.tsx`).
2. **HTML5 Canvas Graphic Generator (`ShareWorkoutModal.tsx`, `canvasCardGenerator.ts`)**:
   - Exports pixel-perfect, high-res graphic cards:
     - **Story Ratio**: 9:16 (1080 × 1920) for Instagram Stories.
     - **Square Ratio**: 1:1 (1080 × 1080) for posts.
   - Features ambient dark carbon background, neon emerald glow orbs, mood chips, exercise tables, and tonnage titan totals.
   - Downloadable directly as PNG.

### 4.6 Progress, Analytics & 1RM Progression (`ProgressView.tsx`)
1. **Interactive Charts via Recharts**:
   - Volume progression over time.
   - Estimated 1RM trends calculated using the Epley formula:  
     $$\text{1RM} = \text{weight} \times \left(1 + \frac{\text{reps}}{30}\right)$$
2. **Goal Trajectory & Setting (`GoalTrackerCard.tsx`, `SetGoalModal.tsx`)**:
   - Goal setting modal calculating Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) via the Mifflin-St Jeor equation.
   - Visual trajectory line tracking body weight against target date and goal type (Bulking, Cutting, Maintaining).
3. **Performance Rankings & Leaderboard (`PerformanceRankingDashboard.tsx`)**:
   - Exercise ranking cards displaying personal records, top performances, and estimated 1RM rankings.
4. **Body Metrics (`BodyMetrics.tsx`)**:
   - Rapid body weight logging with historical trend graph.

### 4.7 Sleep Tracker & Bedtime Reminders (`LogSleepModal.tsx`)
1. **Bedtime & Wake Time Picker**:
   - Real-time calculation of total sleep duration in minutes.
2. **Sleep Quality Selector**:
   - Segmented buttons: `Poor`, `Fair`, `Good`, `Excellent`.
3. **Bedtime Reminders**:
   - Custom target bedtime setting with browser notification integration.

### 4.8 Profile, Trophy Cabinet & Data Sovereignty (`Profile.tsx`, `TrophyCabinet.tsx`)
1. **Avatar Customization**:
   - Client-side compressed photo upload to Supabase storage.
2. **Trophy Cabinet (Gamification)**:
   - Badges catalog categorized into 4 visual tiers:
     - `Bronze`: Bronze border, subtle glow.
     - `Silver`: Silver border, cold white glow.
     - `Gold`: Gold border, amber glow.
     - `Platinum`: Cyan/emerald border, high-intensity neon glow.
3. **Data Sovereignty (`DataManagementModal.tsx`)**:
   - Complete JSON backup export.
   - Complete CSV export.
   - Full CSV data restore import with validation.
   - Double-confirmed cloud data wipe.

### 4.9 Authentication & Access Controls (`Login.tsx`, `ProtectedRoute.tsx`)
1. **Local-First Frictionless Onboarding**:
   - Supports anonymous background UUID generation (`auth.uid()`) on launch. Users can log full workouts immediately with zero signup friction.
2. **Guest Mode**:
   - Instant guest exploration mode with read-only badges and demo datasets.
3. **Permanent Account Linking**:
   - Seamless email/password or Google OAuth upgrade that migrates anonymous workout logs to the permanent authenticated identity.

### 4.10 Superadmin Dashboard (`AdminDashboard.tsx`)
1. **Server Metrics Grid**:
   - Live aggregated counters for Total Users, Total Workouts, Total Diet Logs, Total Recovery Logs.
2. **User Accounts Directory**:
   - Searchable, sortable list of all registered gym-goers.
   - Displays workout counts, diet logging activity, and account creation timestamps.
   - One-click CSV export of platform users.

---

## 5. Responsive Behavior & PWA Standards

- **Touch Deadband**: Input fields disable mobile browser auto-zoom by maintaining a minimum 16px font size.
- **Scroll Containment**: Modals and drawers use `overscroll-behavior-y: none` to prevent iOS elastic bounce from scrolling the background window.
- **Offline Resilience**: Service worker precaches core application bundles. If connectivity drops mid-workout, data persists locally in `localStorage` and syncs upon reconnection.
- **Status Bar Integration**: Configured with `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />` ensuring seamless bleeding into the notch/island.

---
*Generated: 2026-11-01*  
*Document Version: 2.0 (Complete System Specification)*
