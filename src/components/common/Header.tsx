import React from 'react';
import { Dumbbell, ShieldCheck, Zap, LogOut, Shield, Keyboard, Download } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../auth/ProtectedRoute';
import { isAdminUser } from '../../utils/admin';
import { usePWA } from '../../hooks/usePWA';
import { PWAInstallModal } from './PWAInstallModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onNavigateToAdmin?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Logbook',
  subtitle,
  onNavigateToAdmin,
  onOpenShortcuts,
}) => {
  const { user, signOut } = useAuth();
  const isAdmin = isAdminUser(user?.email);
  const { canInstall, installApp, isIOS, showIOSPrompt, setShowIOSPrompt } = usePWA();

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0b0e0b]/90 backdrop-blur-md border-b border-zinc-800/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] app-header">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Dumbbell className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>
              ) : (
                <p className="text-[10px] text-zinc-400 mt-0.5 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {user?.email ? user.email.split('@')[0] : 'Online'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                onClick={installApp}
                title="Install Logbook App (PWA)"
                className="h-9 px-2.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold flex items-center gap-1 active-press transition-all shadow-sm shadow-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {isAdmin && onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                title="Open Admin Dashboard"
                className="min-h-11 flex items-center gap-1 px-3 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-300 hover:text-white text-[11px] font-bold active-press hover:bg-sky-900/80 transition-colors shadow-sm shadow-sky-950/50"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Admin</span>
              </button>
            )}

            {isSupabaseConfigured ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-800/40 text-amber-300 text-[11px] font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Local</span>
              </div>
            )}

            {onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                aria-label="Keyboard Shortcuts"
                className="h-11 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 active-press transition-colors"
              >
                <Keyboard className="w-4 h-4 text-zinc-300" />
                <kbd className="kbd-hint hidden sm:inline-flex text-[10px]">?</kbd>
              </button>
            )}

            {user && (
              <button
                onClick={signOut}
                title="Sign Out"
                className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center active-press transition-colors"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <PWAInstallModal
        isOpen={showIOSPrompt}
        onClose={() => setShowIOSPrompt(false)}
        isIOS={isIOS}
      />
    </>
  );
};
