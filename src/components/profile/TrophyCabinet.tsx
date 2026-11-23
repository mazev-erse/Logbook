import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Crown,
  Award,
  Zap,
  Lock,
  X,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useGamification, type BadgeWithStatus } from '../../hooks/useGamification';
import type { BadgeTier } from '../../types/database';

/**
 * Returns the corresponding Lucide icon component for a badge slug or icon string.
 */
function getBadgeIcon(iconName: string) {
  switch (iconName.toLowerCase()) {
    case 'flame':
      return Flame;
    case 'crown':
      return Crown;
    case 'award':
      return Award;
    case 'zap':
      return Zap;
    case 'trophy':
    default:
      return Trophy;
  }
}

/**
 * High-contrast semantic color styling for Gold, Silver, Bronze, and Platinum achievement tiers.
 */
function getTierStyles(tier: BadgeTier, isUnlocked: boolean) {
  if (!isUnlocked) {
    return {
      card: 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500 opacity-60',
      iconBox: 'bg-zinc-850/80 border-zinc-800 text-zinc-600',
      badgeText: 'text-zinc-500',
      tag: 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50',
      glow: '',
    };
  }

  switch (tier) {
    case 'platinum':
      return {
        card: 'bg-gradient-to-b from-cyan-950/40 via-zinc-900/80 to-zinc-950 border-cyan-400/50 text-cyan-200 shadow-lg shadow-cyan-950/30',
        iconBox: 'bg-gradient-to-tr from-cyan-500/20 to-teal-400/20 border-cyan-400/60 text-cyan-300',
        badgeText: 'text-cyan-300 font-black',
        tag: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        glow: 'text-cyan-400',
      };
    case 'gold':
      return {
        card: 'bg-gradient-to-b from-amber-950/50 via-zinc-900/90 to-zinc-950 border-amber-500/60 text-amber-200 shadow-xl shadow-amber-950/40',
        iconBox: 'bg-gradient-to-tr from-amber-500/30 to-yellow-400/20 border-amber-400/70 text-amber-300',
        badgeText: 'text-amber-300 font-black',
        tag: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        glow: 'text-amber-400',
      };
    case 'silver':
      return {
        card: 'bg-gradient-to-b from-slate-900/60 via-zinc-900/80 to-zinc-950 border-slate-400/50 text-slate-100 shadow-md shadow-black/40',
        iconBox: 'bg-gradient-to-tr from-slate-400/20 to-zinc-300/20 border-slate-400/60 text-slate-200',
        badgeText: 'text-slate-200 font-black',
        tag: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
        glow: 'text-slate-300',
      };
    case 'bronze':
    default:
      return {
        card: 'bg-gradient-to-b from-orange-950/40 via-zinc-900/80 to-zinc-950 border-orange-600/50 text-orange-200 shadow-md shadow-orange-950/20',
        iconBox: 'bg-gradient-to-tr from-orange-600/25 to-amber-700/20 border-orange-500/60 text-orange-300',
        badgeText: 'text-orange-300 font-black',
        tag: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        glow: 'text-orange-400',
      };
  }
}

export const TrophyCabinet: React.FC = () => {
  const { badges, unlockedCount, totalCount } = useGamification();
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null);

  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3.5">
      {/* Section Header with Progression Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>Trophy Cabinet</span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                {unlockedCount} / {totalCount}
              </span>
            </h3>
          </div>
        </div>

        <span className="text-[11px] font-mono text-zinc-400">
          {completionPct}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-900/90 rounded-full h-1.5 overflow-hidden border border-zinc-800">
        <div
          className="bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 h-full transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Badges Grid (Large, tactile cards >= 48px touch targets) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {badges.map((badge) => {
          const IconComp = getBadgeIcon(badge.icon);
          const styles = getTierStyles(badge.tier, badge.isUnlocked);

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] min-h-[105px] relative group ${styles.card}`}
              aria-label={`View badge: ${badge.name}`}
            >
              {/* Top Row: Icon + Tier Pill */}
              <div className="flex items-start justify-between w-full">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBox}`}
                >
                  {badge.isUnlocked ? (
                    <IconComp className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <Lock className="w-4 h-4 stroke-[2]" />
                  )}
                </div>

                <span
                  className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md border tracking-wider ${styles.tag}`}
                >
                  {badge.tier}
                </span>
              </div>

              {/* Bottom: Name & Status */}
              <div className="mt-2.5">
                <h4 className={`text-xs tracking-tight line-clamp-1 ${styles.badgeText}`}>
                  {badge.name}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                  {badge.isUnlocked ? 'Unlocked' : 'Tap to reveal'}
                </p>
              </div>

              {/* Unlocked Checkmark Dot */}
              {badge.isUnlocked && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tappable Badge Details Bottom-Sheet Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl shadow-black relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active-press"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Large Badge Icon */}
            {(() => {
              const IconComp = getBadgeIcon(selectedBadge.icon);
              const styles = getTierStyles(selectedBadge.tier, selectedBadge.isUnlocked);

              return (
                <div className="pt-2">
                  <div
                    className={`w-20 h-20 rounded-3xl border-2 mx-auto flex items-center justify-center shadow-2xl ${styles.iconBox}`}
                  >
                    {selectedBadge.isUnlocked ? (
                      <IconComp className="w-10 h-10 stroke-[2.2]" />
                    ) : (
                      <Lock className="w-9 h-9 stroke-[2]" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border tracking-widest ${styles.tag}`}
                    >
                      {selectedBadge.tier} TIER
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                      {selectedBadge.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mt-2 tracking-tight">
                    {selectedBadge.name}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed px-2">
                    {selectedBadge.description}
                  </p>

                  {/* Achievement State */}
                  <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2 text-xs">
                    {selectedBadge.isUnlocked ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Milestone Achieved!</span>
                        </div>
                        {selectedBadge.awardedAt && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-normal">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            <span>
                              Awarded on{' '}
                              {new Date(selectedBadge.awardedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {selectedBadge.metadata && Object.keys(selectedBadge.metadata).length > 0 && (
                          <div className="mt-2 w-full p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-300 font-mono text-left">
                            {selectedBadge.metadata.exercise_name && (
                              <div>
                                <span className="text-zinc-500">Exercise:</span>{' '}
                                <span className="text-white font-bold">{selectedBadge.metadata.exercise_name}</span>
                              </div>
                            )}
                            {selectedBadge.metadata.weight && (
                              <div>
                                <span className="text-zinc-500">Weight:</span>{' '}
                                <span className="text-emerald-400 font-bold">{selectedBadge.metadata.weight} kg</span>
                              </div>
                            )}
                            {selectedBadge.metadata.streak_days && (
                              <div>
                                <span className="text-zinc-500">Active Streak:</span>{' '}
                                <span className="text-amber-400 font-bold">{selectedBadge.metadata.streak_days} days</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-zinc-500">
                        <Lock className="w-4 h-4" />
                        <span>Locked • Complete this challenge to earn the badge</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs active-press transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrophyCabinet;
