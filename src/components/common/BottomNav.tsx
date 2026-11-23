import React from 'react';
import { Home, Dumbbell, Utensils, History, TrendingUp, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TabType = 'home' | 'workout' | 'diet' | 'history' | 'progress' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isWorkoutActive: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isWorkoutActive }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home, shortcut: '1' },
    { id: 'workout' as TabType, label: 'Workout', icon: Dumbbell, hasBadge: isWorkoutActive, shortcut: '2' },
    { id: 'diet' as TabType, label: 'Diet', icon: Utensils, shortcut: '3' },
    { id: 'history' as TabType, label: 'History', icon: History, shortcut: '4' },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp, shortcut: '5' },
    { id: 'profile' as TabType, label: 'Profile', icon: User, shortcut: '6' },
  ];

  return (
    <nav aria-label="Main navigation" className="app-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800/80 bg-[#0b0e0b]/95 backdrop-blur-xl pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] md:static md:inset-auto md:z-20 md:w-56 md:shrink-0 md:border-t-0 md:border-r md:bg-[#101410] md:px-3 md:py-6 md:pb-6">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 md:mx-0 md:h-auto md:max-w-none md:grid-cols-1 md:gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} aria-current={isActive ? 'page' : undefined}
              aria-label={`${tab.label} (Press ${tab.shortcut})`}
              className={cn('relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl transition-colors active-press md:min-h-12 md:flex-row md:justify-start md:gap-3 md:px-3', isActive ? 'text-emerald-400 md:bg-emerald-400/10' : 'text-zinc-400 hover:text-zinc-100 md:hover:bg-zinc-900')}>
              <span className="relative"><Icon className={cn('h-5 w-5', isActive && 'scale-110 transition-transform')} />
                {tab.hasBadge && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#101410] bg-emerald-400" />}
              </span>
              <span className={cn('text-[10px] font-semibold tracking-tight md:text-sm', isActive && 'font-bold text-emerald-400')}>{tab.label}</span>
              <kbd className="kbd-hint ml-auto hidden text-[10px] opacity-60 md:inline-flex">{tab.shortcut}</kbd>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
