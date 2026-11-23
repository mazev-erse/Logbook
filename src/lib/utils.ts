import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  // Epley Formula
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


let activeViewTransition: { skipTransition: () => void; finished: Promise<void> } | null = null;

export function transitionView(updateFn: () => void | Promise<void>) {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    // If a view transition is currently animating, interrupt and skip it immediately
    if (activeViewTransition) {
      try {
        activeViewTransition.skipTransition();
      } catch {
        // Ignored
      }
      activeViewTransition = null;
    }

    try {
      const transition = (document as any).startViewTransition(updateFn);
      activeViewTransition = transition;
      transition.finished
        .catch(() => {})
        .finally(() => {
          if (activeViewTransition === transition) {
            activeViewTransition = null;
          }
        });
    } catch {
      updateFn();
    }
  } else {
    updateFn();
  }
}
