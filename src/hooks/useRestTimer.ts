import { useState, useEffect, useRef, useCallback } from 'react';
import { sendNotification, requestNotificationPermission } from '../utils/sleepNotificationUtils';

// Play sound chime using Web Audio API (no external audio files needed)
function playTimerChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // 3 celebratory energetic beeps
    playBeep(880, 0, 0.12);
    playBeep(880, 0.18, 0.12);
    playBeep(1174.66, 0.36, 0.3); // High D
  } catch (err) {
    console.error('Audio chime error:', err);
  }
}

export function useRestTimer(defaultSeconds = 90) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [initialSeconds, setInitialSeconds] = useState<number>(defaultSeconds);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
        return Notification.permission || 'unsupported';
      }
    } catch {
      return 'unsupported';
    }
    return 'unsupported';
  });

  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Setup Web Worker for non-throttled background timer ticks
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      const workerBlob = new Blob(
        [
          `let intervalId = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              clearInterval(intervalId);
              intervalId = setInterval(function() {
                self.postMessage('tick');
              }, 500);
            } else if (e.data === 'stop') {
              clearInterval(intervalId);
              intervalId = null;
            }
          };`,
        ],
        { type: 'application/javascript' }
      );
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (e) {
      console.warn('Web Worker background timer fallback to standard interval:', e);
    }
  }, []);

  const finishTimer = useCallback(() => {
    setRemainingSeconds(0);
    setIsActive(false);
    endTimeRef.current = null;
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }

    playTimerChime();
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }

    // Fire background notification for lock screen / other apps
    sendNotification('Rest Completed! 🔔', {
      body: 'Time for your next set. Make it count!',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'rest-timer-finished',
      vibrate: [200, 100, 200, 100, 300],
      renotify: true,
    } as any).catch((err) => console.warn('Could not dispatch rest notification:', err));
  }, []);

  const startTimer = useCallback(
    (seconds?: number) => {
      const duration = seconds ?? initialSeconds;
      setInitialSeconds(duration);
      setRemainingSeconds(duration);
      endTimeRef.current = Date.now() + duration * 1000;
      setIsActive(true);

      // Gently request notification permission on first timer start if not yet decided
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default'
      ) {
        requestNotificationPermission().then(setNotificationPermission);
      }

      if (workerRef.current) {
        workerRef.current.postMessage('start');
      }
    },
    [initialSeconds]
  );

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
    if (workerRef.current) workerRef.current.postMessage('stop');
  }, []);

  const resumeTimer = useCallback(() => {
    if (remainingSeconds > 0) {
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
      setIsActive(true);
      if (workerRef.current) workerRef.current.postMessage('start');
    }
  }, [remainingSeconds]);

  const addTime = useCallback((additionalSeconds: number) => {
    setRemainingSeconds((prev) => {
      const updated = Math.max(0, prev + additionalSeconds);
      if (endTimeRef.current) {
        endTimeRef.current += additionalSeconds * 1000;
      }
      return updated;
    });
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setRemainingSeconds(0);
    endTimeRef.current = null;
    if (workerRef.current) workerRef.current.postMessage('stop');
  }, []);

  const enableNotifications = useCallback(async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    return perm;
  }, []);

  useEffect(() => {
    if (!isActive || !endTimeRef.current) return;

    const checkTime = () => {
      if (!endTimeRef.current) return;
      const left = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (left <= 0) {
        finishTimer();
      } else {
        setRemainingSeconds(left);
      }
    };

    // 1. Worker message handler for background tick
    if (workerRef.current) {
      workerRef.current.onmessage = () => {
        checkTime();
      };
      workerRef.current.postMessage('start');
    }

    // 2. Main thread interval fallback
    const interval = setInterval(checkTime, 500);

    // 3. Instant reconciliation when tab regains visibility (screen unlock / app switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
    };
  }, [isActive, finishTimer]);

  return {
    remainingSeconds,
    initialSeconds,
    isActive,
    notificationPermission,
    enableNotifications,
    startTimer,
    pauseTimer,
    resumeTimer,
    addTime,
    resetTimer,
  };
}
