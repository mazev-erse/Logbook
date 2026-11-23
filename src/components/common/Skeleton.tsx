import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-800/60 ${className}`}
      {...props}
    />
  );
};

export const WorkoutCardSkeleton: React.FC = () => (
  <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>
      <Skeleton className="h-7 w-20 rounded-full" />
    </div>
    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/50">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  </div>
);

export const RoutineCardSkeleton: React.FC = () => (
  <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-5 w-44 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-14 rounded-lg" />
    </div>
    <div className="space-y-1.5 pt-1">
      <Skeleton className="h-3.5 w-3/4 rounded" />
      <Skeleton className="h-3.5 w-1/2 rounded" />
    </div>
    <Skeleton className="h-12 w-full rounded-2xl" />
  </div>
);

export const DietLogSkeleton: React.FC = () => (
  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3 animate-pulse">
    <div className="flex items-center gap-3 flex-1">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
    <div className="space-y-1 text-right">
      <Skeleton className="h-4 w-14 rounded ml-auto" />
      <Skeleton className="h-3 w-16 rounded ml-auto" />
    </div>
  </div>
);

export const ActivityLogSkeleton: React.FC = () => (
  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3 animate-pulse">
    <div className="flex items-center gap-3 flex-1">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
      </div>
    </div>
    <Skeleton className="h-6 w-16 rounded-lg" />
  </div>
);

export const LeaderboardSkeleton: React.FC = () => (
  <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-3 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-5 w-36 rounded-lg" />
      <Skeleton className="h-4 w-16 rounded" />
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center justify-between py-2.5 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded font-mono" />
      </div>
    ))}
  </div>
);
