import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8FAFC] dark:bg-slate-950">
          <div className="max-w-md w-full flex flex-col items-center text-center">
            {/* Icon Wrapper */}
            <div className="w-20 h-20 rounded-[40px] bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-5 shrink-0">
               <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>

            <h1 className="text-[22px] font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              The app encountered an unexpected error.
            </p>

            {/* Error Box */}
            <div className="max-h-[120px] w-full bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl mb-7 p-3 text-left overflow-y-auto">
              <code className="text-[12px] text-rose-600 dark:text-rose-400 font-mono leading-tight block break-all">
                {this.state.error}
              </code>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full h-14 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-2xl text-[15px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 active:scale-95 transition-transform"
            >
              <Home className="w-5 h-5" />
              Go Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
