import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any)?.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'))
      );
    } catch {
      return false;
    }
  });

  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const userAgent = window.navigator?.userAgent?.toLowerCase() || '';
      return /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    } catch {
      return false;
    }
  });

  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Capture Chrome / Edge / Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Detect when user completes installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // On iOS Safari, show the step-by-step Add to Home Screen instructions
      setShowIOSPrompt(true);
    }
  }, [deferredPrompt, isIOS]);

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIOS);

  return {
    isInstalled,
    canInstall,
    isIOS,
    showIOSPrompt,
    setShowIOSPrompt,
    installApp,
  };
}
