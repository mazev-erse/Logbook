import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { SystemAnnouncement } from '../../types/admin';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

const ANNOUNCEMENT_STORAGE_KEY = 'gymtracker_system_announcement';
const DISMISSED_SESSION_KEY = 'gymtracker_dismissed_announcement_id';

export const SystemAnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(() => {
    try {
      const stored = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check session dismissal
    const dismissedId = sessionStorage.getItem(DISMISSED_SESSION_KEY);
    if (announcement && (announcement.id || announcement.message) === dismissedId) {
      setIsDismissed(true);
    }

    if (!isSupabaseConfigured) return;

    // Fetch live announcement
    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from('system_announcements')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error) {
          if (data) {
            setAnnouncement(data as SystemAnnouncement);
            localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(data));
            const currentDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY);
            if (data.id === currentDismissed) {
              setIsDismissed(true);
            }
          } else {
            setAnnouncement(null);
            localStorage.removeItem(ANNOUNCEMENT_STORAGE_KEY);
          }
        }
      } catch {
        // Fallback silently
      }
    };

    fetchLatest();
  }, []);

  // Informational and positive updates live in the notification center; keep the banner for warnings.
  if (!announcement || !announcement.is_active || isDismissed || announcement.type !== 'warning') {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(
      DISMISSED_SESSION_KEY,
      announcement.id || announcement.message
    );
  };

  const getStyle = () => {
    switch (announcement.type) {
      case 'warning':
        return {
          wrapper: 'bg-amber-950/60 border-amber-800/80 text-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'success':
        return {
          wrapper: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-sky-950/60 border-sky-800/80 text-sky-200',
          icon: <Megaphone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`mx-3 mb-2 p-3 rounded-2xl border backdrop-blur-md flex items-start gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${style.wrapper}`}
      role="alert"
    >
      {style.icon}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${style.badge}`}>
            {announcement.title || 'Broadcast'}
          </span>
        </div>
        <p className="text-xs font-medium leading-relaxed select-text">
          {announcement.message}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-6 h-6 rounded-lg bg-black/30 hover:bg-black/50 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default SystemAnnouncementBanner;
