import React from 'react';
import { Dumbbell, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../auth/ProtectedRoute';
import { isAdminUser } from '../../utils/admin';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  title?: string;
  onNavigateToAdmin?: () => void;
  onNavigateToProfile?: () => void;
  isWorkoutActive: boolean;
  restRemaining: number;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Logbook', onNavigateToAdmin, onNavigateToProfile, isWorkoutActive, restRemaining }) => {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user?.email);
  const initials = (user?.email?.[0] || 'U').toUpperCase();

  return <header className="app-header sticky top-0 z-30 border-b border-zinc-800/70 bg-[#0b0e0b]/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6">
    <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-[#10130d] shadow-[0_6px_24px_rgba(184,230,46,0.18)]"><Dumbbell className="h-5 w-5 stroke-[2.5]" /></div>
        <div><h1 className="text-base font-bold tracking-tight text-white">{title}</h1><p className="hidden text-[11px] text-zinc-500 sm:block">Train with intent</p></div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && onNavigateToAdmin && <button onClick={onNavigateToAdmin} title="Admin dashboard" aria-label="Admin dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-900/70 bg-sky-950/50 text-sky-300 hover:bg-sky-900/60"><Shield className="h-4 w-4" /></button>}
        <NotificationCenter isWorkoutActive={isWorkoutActive} restRemaining={restRemaining} />
        <button onClick={onNavigateToProfile} aria-label="Open profile" title="Profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 text-sm font-bold text-zinc-200 hover:border-emerald-400/60 hover:text-emerald-300">
          <span className="sr-only"><UserRound className="h-4 w-4" /></span>{initials}
        </button>
      </div>
    </div>
  </header>;
};
