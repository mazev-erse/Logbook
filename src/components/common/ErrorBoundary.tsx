import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
    } catch (e) {
      console.warn('Error during reload cache cleanup:', e);
    }
    window.location.reload();
  };

  private handleHardReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error clearing caches:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown error occurred';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#0b0e0b] text-[#f2f5ef] text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">Something went wrong</h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-4">
            Logbook encountered an unexpected error. You can reload or reset the app cache.
          </p>

          <div className="mb-6 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-left max-w-sm w-full overflow-hidden shadow-lg">
            <div className="text-[11px] font-mono font-bold text-rose-300 break-words leading-tight">
              {errorMsg}
            </div>
            {stack && (
              <pre className="text-[9px] font-mono text-zinc-400 mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap leading-tight select-all">
                {stack.slice(0, 400)}
              </pre>
            )}
          </div>

          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-950/40"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
            <button
              onClick={this.handleHardReset}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Cache & Reload</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
