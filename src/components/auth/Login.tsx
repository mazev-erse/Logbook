import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dumbbell, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, isSupabaseConfigured } from '../../lib/supabaseClient';
import { loginSchema, type LoginFormData } from '../../lib/validationSchemas';
import { FormFieldError } from '../common/FormFieldError';

interface LoginProps {
  onDemoLogin?: () => void;
  onGuestLogin?: () => void;
  onBackToLanding?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onDemoLogin, onGuestLogin, onBackToLanding }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(data.email, data.password);
        setSuccessMsg('Account created! Please check your email inbox to confirm your account, or sign in.');
      } else {
        await signInWithEmail(data.email, data.password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setOauthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setErrorMsg(err.message || 'Google Sign-In failed.');
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-center sm:justify-between bg-[#0b0e0b] text-zinc-100 max-w-md md:max-w-lg mx-auto w-full px-5 py-8 overflow-y-auto">
      {/* Optional Back to Landing button */}
      {onBackToLanding && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 font-bold active-press transition-colors py-1.5 px-2 rounded-lg hover:bg-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Product Overview</span>
          </button>
        </div>
      )}

      {/* Top Branding */}
      <div className="pt-4 space-y-3 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-950/60">
          <Dumbbell className="w-9 h-9 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Logbook</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isSignUp ? 'Create your account to start tracking' : 'Sign in to access your workout history'}
          </p>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="my-auto py-6 space-y-4">
        {/* Backend Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-900/80 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Backend Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-900/80 flex items-start gap-2.5 text-emerald-300 text-xs animate-in fade-in duration-200">
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Google OAuth Button (56px touch target) */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading || isSubmitting}
          className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-sm flex items-center justify-center gap-3 active-press transition-colors shadow-lg shadow-black/40 disabled:opacity-50"
        >
          {oauthLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-x-0 h-px bg-zinc-800" />
          <span className="relative bg-[#0b0e0b] px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            or with email
          </span>
        </div>

        {/* Email / Password Form with Zod Validation */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {/* Email Input */}
          <div>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                errors.email ? 'text-rose-400' : 'text-zinc-500'
              }`} />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="Email address"
                className={`w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors ${
                  errors.email
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-zinc-800 focus:border-emerald-500'
                }`}
              />
            </div>
            <FormFieldError error={errors.email?.message} />
          </div>

          {/* Password Input */}
          <div>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                errors.password ? 'text-rose-400' : 'text-zinc-500'
              }`} />
              <input
                {...register('password')}
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="Password"
                className={`w-full h-14 pl-12 pr-4 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors ${
                  errors.password
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-zinc-800 focus:border-emerald-500'
                }`}
              />
            </div>
            <FormFieldError error={errors.password?.message} />
          </div>

          {/* Submit Button (Massive 56px touch target in vibrant neon emerald) */}
          <button
            type="submit"
            disabled={isSubmitting || oauthLoading}
            className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 active-press shadow-xl shadow-emerald-950/60 disabled:opacity-50 transition-all mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Sign In & Sign Up */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
              reset();
            }}
            className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold transition-colors py-2 px-3 active-press"
          >
            {isSignUp ? (
              <>Already have an account? <span className="text-emerald-400 underline">Sign In</span></>
            ) : (
              <>Don't have an account? <span className="text-emerald-400 underline">Create one</span></>
            )}
          </button>
        </div>

        {/* Guest Mode */}
        {onGuestLogin && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onGuestLogin}
              className="w-full h-12 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-xs font-bold active-press hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              Continue as Guest (Instant Access)
            </button>
          </div>
        )}

        {/* Local Demo Fallback Notice (if unconfigured) */}
        {!isSupabaseConfigured && onDemoLogin && (
          <div className="pt-4 border-t border-zinc-900 text-center space-y-2">
            <p className="text-[11px] text-zinc-500">
              Supabase credentials not detected in .env
            </p>
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full h-12 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-bold active-press hover:text-white"
            >
              Continue in Local Demo Mode
            </button>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-zinc-600">
        By continuing, you agree to our Terms of Service & Privacy Policy.
      </div>
    </div>
  );
};

export default Login;
