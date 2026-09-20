import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App.js';
import './index.css';

// Dynamic manifest URL matching the current domain (e.g. Cloudflare tunnel or localhost)
const manifestUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : 'https://flyer-humor-membrane-caroline.trycloudflare.com/tonconnect-manifest.json';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Sfida Arena ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080a10] text-slate-100 p-6 flex flex-col items-center justify-center font-mono">
          <div className="border border-red-500/50 bg-red-950/30 p-5 rounded-2xl max-w-sm w-full text-center">
            <h2 className="text-red-400 font-bold text-base mb-2">ARENA RUNTIME ALERT</h2>
            <p className="text-xs text-slate-300 break-words mb-4">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#00f0ff] text-black font-bold text-xs rounded-xl uppercase tracking-wider"
            >
              RELOAD ARENA
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <App />
      </TonConnectUIProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
