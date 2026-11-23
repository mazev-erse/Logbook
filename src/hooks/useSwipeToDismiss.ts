import { useRef, useCallback, useEffect } from 'react';

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
  isOpen?: boolean;
}

/**
 * Extracts live in-flight translateY from computed transform matrix,
 * allowing touch/pointer interactions to interrupt in-flight animations seamlessly.
 */
function getInFlightTranslateY(el: HTMLElement): number {
  if (typeof window === 'undefined') return 0;
  const style = window.getComputedStyle(el);
  const transform = style.transform || (style as any).webkitTransform;
  if (!transform || transform === 'none') return 0;

  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return matrix.m42;
  } catch {
    const match = transform.match(/matrix.*\((.+)\)/);
    if (match) {
      const values = match[1].split(',').map((v: string) => parseFloat(v.trim()));
      if (values.length === 6) return values[5];
      if (values.length === 16) return values[13];
    }
    return 0;
  }
}

export function useSwipeToDismiss({ onDismiss, threshold = 90, isOpen = true }: UseSwipeToDismissOptions) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetPosition = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      sheetRef.current.style.transform = 'translateY(0px)';
    }
    startYRef.current = null;
    currentYRef.current = 0;
    isDraggingRef.current = false;
  }, []);

  const handleDragStart = useCallback((clientY: number) => {
    // Interrupt any active exit or rebound animation immediately
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    isDraggingRef.current = true;

    if (sheetRef.current) {
      // Sample the live in-flight translation to prevent visual jumping on interrupt
      const inFlightY = Math.max(0, getInFlightTranslateY(sheetRef.current));
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.transform = `translateY(${inFlightY}px)`;
      startYRef.current = clientY - inFlightY;
      currentYRef.current = clientY;
    } else {
      startYRef.current = clientY;
      currentYRef.current = clientY;
    }
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current || startYRef.current === null) return;
    const deltaY = clientY - startYRef.current;

    // Only allow downwards drag
    if (deltaY > 0) {
      currentYRef.current = clientY;
      if (sheetRef.current) {
        // Elastic dampening curve past 180px
        const translateY = deltaY > 180 ? 180 + (deltaY - 180) * 0.45 : deltaY;
        sheetRef.current.style.transform = `translateY(${translateY}px)`;
      }
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current || startYRef.current === null) return;
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > threshold) {
      if (sheetRef.current) {
        // Smooth interruptible dismissal exit
        sheetRef.current.style.transition = 'transform 0.18s cubic-bezier(0.2, 0, 0, 1)';
        sheetRef.current.style.transform = 'translateY(100%)';
      }
      dismissTimerRef.current = setTimeout(() => {
        onDismissRef.current();
        dismissTimerRef.current = null;
      }, 160);
    } else {
      resetPosition();
    }
    startYRef.current = null;
    isDraggingRef.current = false;
  }, [threshold, resetPosition]);

  // Touch event listeners
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Pointer event listeners (supporting desktop mouse / stylus interrupts)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      handleDragStart(e.clientY);
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    },
    [handleDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current) {
        handleDragMove(e.clientY);
      }
    },
    [handleDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current) {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
        handleDragEnd();
      }
    },
    [handleDragEnd]
  );

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Predictive Back: Sync modal presence with browser history to close on back gesture
  useEffect(() => {
    if (isOpen === false) return;
    if (typeof window === 'undefined') return;

    let isDisposed = false;
    window.history.pushState({ modalSheet: true }, '');

    const handlePopState = () => {
      if (!isDisposed) {
        onDismissRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      isDisposed = true;
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalSheet) {
        window.history.back();
      }
    };
  }, [isOpen]);

  return {
    sheetRef,
    handleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handleDragEnd,
    },
  };
}
