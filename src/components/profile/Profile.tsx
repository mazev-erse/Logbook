import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, User as UserIcon, Check, Loader2, AlertCircle, Sparkles, Mail, Calendar, Database, ChevronRight, Shield, Smartphone, Download, LogOut } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../auth/ProtectedRoute';
import { isAdminUser } from '../../utils/admin';
import type { UserProfile } from '../../types/database';
import { profileSchema, avatarFileSchema, type ProfileFormData } from '../../lib/validationSchemas';
import { FormFieldError } from '../common/FormFieldError';
import { DataManagementModal } from './DataManagementModal';
import { TrophyCabinet } from './TrophyCabinet';

interface ProfileProps {
  onNavigateToAdmin?: () => void;
  onNavigateToLanding?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigateToAdmin, onNavigateToLanding }) => {
  const { user, requireAuth, signOut } = useAuth();
  const isAdmin = isAdminUser(user?.email);
  const { isInstalled, canInstall, installApp } = usePWA();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('gymtracker_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.avatar_url || null;
      }
    } catch {}
    return null;
  });

  // Loading & Feedback states
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Selected new image file pending upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      displayName: 'Majedul Islam Refat',
      bio: 'Gym enthusiast focusing on progressive overload and powerbuilding.',
    },
  });

  const bioValue = watch('bio') || '';

  // Fetch existing profile on mount
  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setIsFetching(false);
        return;
      }

      if (!isSupabaseConfigured) {
        // Load local profile if present
        const saved = localStorage.getItem('gymtracker_user_profile');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            reset({
              displayName: data.display_name || 'Majedul Islam Refat',
              bio: data.bio || '',
            });
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
          } catch (e) {
            console.error('Error parsing local profile:', e);
          }
        }
        setIsFetching(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error.message);
        } else if (data) {
          const profile = data as UserProfile;
          reset({
            displayName: profile.display_name || '',
            bio: profile.bio || '',
          });
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        } else {
          // Check user metadata if profile row isn't yet created
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          reset({
            displayName: metaName || 'Majedul Islam Refat',
            bio: '',
          });
          if (metaAvatar) setAvatarUrl(metaAvatar);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsFetching(false);
      }
    }

    fetchProfile();
  }, [user, reset]);

  // Handle file selection with Zod schema validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Zod file validation for MIME type (JPEG/PNG/WebP) and 8MB limit
    const validation = avatarFileSchema.safeParse(file);
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Invalid image file.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Upload image to Supabase Storage: avatars/${userId}/profile.${ext} with upsert
  const uploadAvatar = async (): Promise<string | null> => {
    if (!selectedFile || !user) return avatarUrl;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Retrieve public URL with cache-busting timestamp
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrlWithTimestamp);
      return publicUrlWithTimestamp;
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      throw new Error(`Avatar upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Save profile changes using validated Zod form data
  const onSaveProfile = (formData: ProfileFormData) => {
    requireAuth(async () => {
      if (!user) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. Upload image if a new file was selected
      if (selectedFile && isSupabaseConfigured) {
        finalAvatarUrl = await uploadAvatar();
      } else if (selectedFile && !isSupabaseConfigured) {
        // In local mode, previewUrl serves as avatar
        finalAvatarUrl = previewUrl;
        setAvatarUrl(previewUrl);
      }

      // 2. Update profiles table
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: formData.displayName.trim(),
            bio: formData.bio ? formData.bio.trim() : null,
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }
      }

      // 3. Save to localStorage as well
      localStorage.setItem(
        'gymtracker_user_profile',
        JSON.stringify({
          display_name: formData.displayName.trim(),
          bio: formData.bio ? formData.bio.trim() : '',
          avatar_url: finalAvatarUrl,
        })
      );

      setSelectedFile(null);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
    });
  };

  const displayImage = previewUrl || avatarUrl;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-5 sm:px-6 lg:px-10">
      {/* Title */}
      <div className="px-1">
        <h2 className="text-xl font-black text-white tracking-tight">Your Profile</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Manage your personal display name, bio, and avatar
        </p>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex items-start gap-2.5 text-emerald-300 text-xs animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 stroke-[3]" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-6" noValidate>
        {/* Avatar Display & Upload Section */}
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
          <div className="relative group">
            {/* Avatar Circle (Oversized 112px touch target) */}
            <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-950 border-2 border-emerald-400/80 shadow-xl shadow-black/80 flex items-center justify-center relative">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-600/30 to-teal-600/30 flex items-center justify-center text-emerald-400">
                  <UserIcon className="w-12 h-12 stroke-[1.5]" />
                </div>
              )}

              {/* Uploading overlay spinner */}
              {(isUploading || isFetching) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              )}
            </div>

            {/* Camera Badge Overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-400 text-black flex items-center justify-center shadow-lg active-press border-2 border-black"
              aria-label="Upload profile picture"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Button */}
          <div className="text-center space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 active-press border border-zinc-700 transition-colors"
            >
              Upload Picture
            </button>
            <p className="text-[10px] text-zinc-500">
              JPG, PNG or WebP (max 8MB)
            </p>
          </div>
        </div>

        {/* Text Inputs */}
        <div className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1.5">
              Display Name
            </label>
            <input
              {...register('displayName')}
              type="text"
              placeholder="e.g. Majedul Islam Refat"
              className={`w-full h-14 px-4 rounded-2xl bg-zinc-900 border text-white font-semibold text-sm focus:outline-none transition-colors ${
                errors.displayName
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
            />
            <FormFieldError error={errors.displayName?.message} />
          </div>

          {/* Bio Textarea */}
          <div>
            <div className="flex justify-between items-center px-1 mb-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Bio
              </label>
              <span className={`text-[10px] font-mono ${bioValue.length > 150 ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                {bioValue.length}/160
              </span>
            </div>
            <textarea
              {...register('bio')}
              rows={3}
              maxLength={160}
              placeholder="Tell us about your fitness goals..."
              className={`w-full p-4 rounded-2xl bg-zinc-900 border text-white text-sm focus:outline-none transition-colors resize-none ${
                errors.bio
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
            />
            <FormFieldError error={errors.bio?.message} />
          </div>

          {/* Account Metadata Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              <span>{user?.email || 'guest@logbook.local'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>
                Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM-HEAVY "SAVE PROFILE" BUTTON (Oversized 56px touch target) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || isUploading || isSubmitting}
            className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 active-press shadow-xl shadow-emerald-950/60 disabled:opacity-50 transition-all"
          >
            {isSaving || isUploading || isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-black" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      <section aria-label="Account actions" className="grid gap-3 sm:grid-cols-2">
        {isAdmin && onNavigateToAdmin && <button type="button" onClick={onNavigateToAdmin} className="flex min-h-14 items-center justify-between rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 text-sm font-semibold text-sky-200 hover:bg-sky-950/50">
          <span className="flex items-center gap-2"><Shield className="h-4 w-4" />Admin dashboard</span><ChevronRight className="h-4 w-4" />
        </button>}
        <button type="button" onClick={() => void signOut()} className="flex min-h-14 items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 text-sm font-semibold text-zinc-200 hover:border-rose-900/70 hover:text-rose-300">
          <span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Sign out</span><ChevronRight className="h-4 w-4" />
        </button>
      </section>

      {/* Trophy Cabinet & Achievements Section */}
      <div className="pt-2">
        <TrophyCabinet />
      </div>

      {/* Data Ownership & Migration Section */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsDataModalOpen(true)}
          className="w-full p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all active-press flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Data & Backups</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Export CSV/JSON or import from Strong / Hevy
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
        </button>
      </div>

            {/* Product Overview & Landing Page */}
      {onNavigateToLanding && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateToLanding}
            className="w-full p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all active-press flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Product Overview & Guide</h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Landing
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Features, gym ergonomics philosophy & plate calculator
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
          </button>
        </div>
      )}

      {/* PWA & App Installation Card */}
      <div className="pt-2">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Smartphone className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">App Experience</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isInstalled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {isInstalled ? 'Installed PWA' : 'Web Browser'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isInstalled
                  ? 'Running in standalone native mode with 0ms caching'
                  : 'Install to Home Screen for fullscreen & offline access'}
              </p>
            </div>
          </div>
          {canInstall && (
            <button
              type="button"
              onClick={installApp}
              className="py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press transition-colors shadow-md shadow-emerald-950/50 flex items-center gap-1 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
        </div>
      </div>

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
      />
    </div>
  );
};

export default Profile;

