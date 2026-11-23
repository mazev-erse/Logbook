import React from 'react';
import { Home, Dumbbell, Utensils, History, TrendingUp, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TabType = 'home' | 'workout' | 'diet' | 'history' | 'progress' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isWorkoutActive: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isWorkoutActive,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home, shortcut: '1' },
    { id: 'workout' as TabType, label: 'Workout', icon: Dumbbell, hasBadge: isWorkoutActive, shortcut: '2' },
    { id: 'diet' as TabType, label: 'Diet', icon: Utensils, shortcut: '3' },
    { id: 'history' as TabType, label: 'History', icon: History, shortcut: '4' },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp, shortcut: '5' },
    { id: 'profile' as TabType, label: 'Profile', icon: User, shortcut: '6' },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 z-40 bg-[#0b0e0b]/95 backdrop-blur-xl border-t border-zinc-800/80 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] app-bottom-nav">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto grid grid-cols-6 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative min-h-14 flex flex-col items-center justify-center gap-1 active-press transition-colors',
                isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
              )}
              aria-label={`${tab.label} (Press ${tab.shortcut})`}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
                {tab.hasBadge && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className={cn('text-[10px] font-semibold tracking-tight', isActive && 'font-bold text-emerald-400')}>
                  {tab.label}
                </span>
                <kbd className="kbd-hint hidden md:inline-flex text-[8px] px-1 py-0 opacity-60">
                  {tab.shortcut}
                </kbd>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
