export interface DynamicStreakResult {
  streakDays: number;
  isGracePeriodActive: boolean;
  hoursRemaining: number;
  lastWorkoutTimestamp: string | null;
  status: 'active' | 'in_danger' | 'broken';
  workedOutToday: boolean;
  workedOutYesterday: boolean;
}

/**
 * Helper to convert a Date or ISO string to local calendar date YYYY-MM-DD
 */
export function toLocalDateString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date to datetime-local format: YYYY-MM-DDTHH:mm
 */
export function toDateTimeLocalString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Dynamic Streak Calculation with 36-Hour Grace Period & Streak Protection
 *
 * Requirements:
 * 1. If the gap between the last logged workout_timestamp and now() is greater than 36 hours,
 *    the active streak must render as 0.
 * 2. If the user missed logging a workout yesterday, but is still within the 36-hour window,
 *    the streak remains conditionally active until the window closes.
 * 3. If in the grace period, calculates hoursRemaining before the 36-hour window expires.
 */
export function calculateDynamicStreak(
  sessions: { startedAt: string; completedAt?: string | null }[],
  now = new Date()
): DynamicStreakResult {
  if (!sessions || sessions.length === 0) {
    return {
      streakDays: 0,
      isGracePeriodActive: false,
      hoursRemaining: 0,
      lastWorkoutTimestamp: null,
      status: 'broken',
      workedOutToday: false,
      workedOutYesterday: false,
    };
  }

  // Find the most recent workout timestamp
  let latestMs = 0;
  let latestIso: string | null = null;

  for (const s of sessions) {
    const rawTime = s.completedAt || s.startedAt;
    const t = new Date(rawTime).getTime();
    if (!isNaN(t) && t > latestMs) {
      latestMs = t;
      latestIso = rawTime;
    }
  }

  if (latestMs === 0 || !latestIso) {
    return {
      streakDays: 0,
      isGracePeriodActive: false,
      hoursRemaining: 0,
      lastWorkoutTimestamp: null,
      status: 'broken',
      workedOutToday: false,
      workedOutYesterday: false,
    };
  }

  const nowMs = now.getTime();
  const gapMs = Math.max(0, nowMs - latestMs);
  const gapHours = gapMs / (1000 * 60 * 60);

  // RULE 1: If gap > 36 hours, active streak MUST render as 0
  if (gapHours > 36) {
    return {
      streakDays: 0,
      isGracePeriodActive: false,
      hoursRemaining: 0,
      lastWorkoutTimestamp: latestIso,
      status: 'broken',
      workedOutToday: false,
      workedOutYesterday: false,
    };
  }

  // Hours left until the 36-hour grace period window closes
  const hoursRemaining = Math.max(1, Math.ceil(36 - gapHours));

  // Build calendar dates set
  const workoutDates = new Set<string>();
  for (const s of sessions) {
    const dStr = toLocalDateString(s.completedAt || s.startedAt);
    if (dStr) workoutDates.add(dStr);
  }

  const todayStr = toLocalDateString(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  const workedOutToday = workoutDates.has(todayStr);
  const workedOutYesterday = workoutDates.has(yesterdayStr);

  let streakDays = 0;

  if (workedOutToday) {
    // Healthy streak ending today
    const checkDate = new Date(now);
    while (workoutDates.has(toLocalDateString(checkDate))) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return {
      streakDays,
      isGracePeriodActive: false,
      hoursRemaining,
      lastWorkoutTimestamp: latestIso,
      status: 'active',
      workedOutToday: true,
      workedOutYesterday,
    };
  }

  if (workedOutYesterday) {
    // Worked out yesterday, but not yet today
    const checkDate = new Date(yesterday);
    while (workoutDates.has(toLocalDateString(checkDate))) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // If gapHours >= 24, they are in the final 12-hour grace period before the 36h window expires!
    const isGracePeriodActive = gapHours >= 24;

    return {
      streakDays,
      isGracePeriodActive,
      hoursRemaining,
      lastWorkoutTimestamp: latestIso,
      status: isGracePeriodActive ? 'in_danger' : 'active',
      workedOutToday: false,
      workedOutYesterday: true,
    };
  }

  // RULE 2: User missed logging a workout yesterday, but is still within the 36-hour window!
  // The streak remains conditionally active until the window closes.
  // Count consecutive days ending on the day of the last workout
  const lastWorkoutDate = new Date(latestMs);
  const checkDate = new Date(lastWorkoutDate);

  while (workoutDates.has(toLocalDateString(checkDate))) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    streakDays,
    isGracePeriodActive: true,
    hoursRemaining,
    lastWorkoutTimestamp: latestIso,
    status: 'in_danger',
    workedOutToday: false,
    workedOutYesterday: false,
  };
}
