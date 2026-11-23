/**
 * Sleep & Recovery Notification Utilities
 * Manages browser push/local notifications for bedtime reminders 45 minutes before target bedtime.
 */

let activeReminderTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Requests browser permission for notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Sends a local push notification via Service Worker or native Notification API.
 */
export async function sendNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'sleep-reminder',
    body: 'Wind down and prepare your body for deep recovery sleep.',
    ...options,
  };

  try {
    // 1. Try Service Worker registration for PWA mobile background delivery
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }

    // 2. Direct browser Notification fallback
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.error('Error triggering notification:', err);
    return false;
  }
}

/**
 * Calculates milliseconds until 45 minutes prior to target bedtime ("HH:MM").
 */
export function getMillisecondsUntilReminder(targetBedtime: string): {
  delayMs: number;
  reminderTimeFormatted: string;
} {
  const [hourStr, minStr] = targetBedtime.split(':');
  const targetHour = parseInt(hourStr || '22', 10);
  const targetMin = parseInt(minStr || '30', 10);

  const now = new Date();

  // Create target date for today
  const reminderDate = new Date(now);
  reminderDate.setHours(targetHour, targetMin, 0, 0);

  // Subtract 45 minutes
  reminderDate.setMinutes(reminderDate.getMinutes() - 45);

  // If the 45-minute mark for today has already passed, schedule for tomorrow
  if (reminderDate.getTime() <= now.getTime()) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  const delayMs = reminderDate.getTime() - now.getTime();

  // Format 12-hour display string (e.g. "9:45 PM")
  const reminderTimeFormatted = reminderDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return { delayMs, reminderTimeFormatted };
}

/**
 * Schedules a local notification 45 minutes before the user's target bedtime.
 */
export function scheduleBedtimeReminder(targetBedtime: string, enabled: boolean): void {
  // Clear any existing active schedule
  if (activeReminderTimeout) {
    clearTimeout(activeReminderTimeout);
    activeReminderTimeout = null;
  }

  if (!enabled || !targetBedtime) return;

  const { delayMs, reminderTimeFormatted } = getMillisecondsUntilReminder(targetBedtime);

  console.log(
    `[Sleep Reminder] Scheduled wind-down alert for ${reminderTimeFormatted} (in ${Math.round(
      delayMs / 60000
    )} minutes)`
  );

  activeReminderTimeout = setTimeout(async () => {
    await sendNotification('🌙 Wind Down for Recovery', {
      body: `Your target bedtime is in 45 minutes. Dim your screens, disconnect, and prepare for quality muscle recovery!`,
    });

    // Automatically reschedule for the next day
    scheduleBedtimeReminder(targetBedtime, true);
  }, delayMs);
}
