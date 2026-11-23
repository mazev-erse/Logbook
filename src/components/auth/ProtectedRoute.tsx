import { Capacitor } from '@capacitor/core';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Login } from './Login';
import { LandingPage } from '../landing/LandingPage';
import { Dumbbell } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  requireAuth: (action: () => void) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isGuest: false,
  requireAuth: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Purge sensitive cached health, workout, and profile data from local storage
 * to prevent unauthorized access if session expires or is manually terminated.
 */
export const clearSensitiveUserCache = () => {
  const sensitiveKeys = [
    'gymtracker_local_user',
    'gymtracker_user_profile',
    'gymtracker_active_workout',
    'gymtracker_diet_logs_v1',
    'gymtracker_supplement_logs_v1',
    'gymtracker_active_recovery_v1',
    'gymtracker_fitness_goal_v1',
    'gymtracker_history_v1',
  ];

  sensitiveKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Could not clear key ${key}:`, e);
    }
  });
};

/**
 * Validates whether a Supabase session has expired based on its expires_at timestamp
 */
const isSessionExpired = (sess: Session | null): boolean => {
  if (!sess) return true;
  if (!sess.expires_at) return false;
  // Buffer of 5 seconds to prevent edge-case race conditions
  return sess.expires_at * 1000 <= Date.now() + 5000;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Local demo mode state when Supabase credentials are not entered
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('gymtracker_local_user'));
  });

  const [authView, setAuthView] = useState<'landing' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      if (Capacitor.isNativePlatform()) return 'login';
      if (window.location.hash === '#login') return 'login';
      const isStandalone = Boolean(
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any)?.standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'))
      );
      if (isStandalone) return 'login';
    }
    return 'landing';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setAuthView('login');
      } else if (window.location.hash === '#landing' || !window.location.hash) {
        setAuthView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Strict session invalidator and redirector
  const handleSessionInvalidation = useCallback(() => {
    clearSensitiveUserCache();
    setSession(null);
    setUser(null);
    setIsDemoUser(false);

    // Update browser history/location to /login route if not already there
    if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  // Safe manual sign out
  const handleSignOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      handleSessionInvalidation();
    }
  }, [handleSessionInvalidation]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      // 1. Local demo mode check
      if (!isSupabaseConfigured) {
        if (isDemoUser) {
          setUser({
            id: 'demo-user-1',
            email: 'demo@gymtracker.app',
            app_metadata: {},
            user_metadata: { full_name: 'Demo Lifter' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as unknown as User);
        }
        setIsLoading(false);
        return;
      }

      try {
        // 2. Initial session check
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error || !initialSession || isSessionExpired(initialSession)) {
          if (error) console.error('Session retrieval error:', error.message);
          handleSessionInvalidation();
        } else {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        handleSessionInvalidation();
      } finally {
        setIsLoading(false);
      }

      // 3. Strict Active Auth State Listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (
            event === 'SIGNED_OUT' ||
            !currentSession ||
            isSessionExpired(currentSession)
          ) {
            handleSessionInvalidation();
            setIsLoading(false);
            return;
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            setSession(currentSession);
            setUser(currentSession.user);
            setIsLoading(false);
          }
        }
      );

      subscription = authListener.subscription;
    }

    initAuth();

    // 4. Foreground Tab / App Resume Guard (Crucial for mobile PWAs when waking up)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSupabaseConfigured) {
        try {
          const { data: { session: activeSession }, error } = await supabase.auth.getSession();
          if (error || !activeSession || isSessionExpired(activeSession)) {
            handleSessionInvalidation();
          } else {
            setSession(activeSession);
            setUser(activeSession.user);
          }
        } catch {
          handleSessionInvalidation();
        }
      }
    };

    // 5. Cross-tab Storage Disconnection Guard
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('auth-token') && e.newValue === null) {
        // Session was manually cleared or signed out in another tab
        handleSessionInvalidation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isDemoUser, handleSessionInvalidation]);

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      console.log('[Auth init] Capacitor.isNativePlatform():', Capacitor.isNativePlatform(), 'hostname:', window.location.hostname);
      if (Capacitor.isNativePlatform() || window.location.hostname === 'localhost') return true;
      return localStorage.getItem('gymtracker_is_guest') === 'true';
    }
    return false;
  });

  const handleGuestLogin = () => {
    localStorage.setItem('gymtracker_is_guest', 'true');
    setIsGuest(true);
  };

  const handleDemoLogin = () => {
    localStorage.setItem('gymtracker_local_user', 'true');
    setIsDemoUser(true);
    setUser({
      id: 'demo-user-1',
      email: 'demo@gymtracker.app',
      app_metadata: {},
      user_metadata: { full_name: 'Demo Lifter' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User);
  };

  const requireAuth = useCallback((action: () => void) => {
    // Allow action to proceed; unauthenticated or guest sessions will save safely to local device storage
    action();
  }, []);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0b0e0b] text-white">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse shadow-xl shadow-black/80">
          <Dumbbell className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="text-xs text-zinc-500 font-mono mt-3">Verifying secure session...</div>
      </div>
    );
  }

  // If unauthenticated or session expired, show Landing Page or Login
  if (!user && !isGuest) {
    if (authView === 'login' || Capacitor.isNativePlatform()) {
      return (
        <Login
          onDemoLogin={handleDemoLogin}
          onGuestLogin={handleGuestLogin}
          onBackToLanding={() => {
            window.location.hash = '#landing';
            setAuthView('landing');
          }}
        />
      );
    }

    return (
      <LandingPage
        isSignedIn={false}
        onLaunchApp={handleGuestLogin}
        onSignIn={() => {
          window.location.hash = '#login';
          setAuthView('login');
        }}
        onStartWorkout={handleGuestLogin}
      />
    );
  }

  // Authenticated context provider
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isGuest,
        requireAuth,
        signOut: async () => {
          setIsGuest(false);
          localStorage.removeItem('gymtracker_is_guest');
          await handleSignOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default ProtectedRoute;
