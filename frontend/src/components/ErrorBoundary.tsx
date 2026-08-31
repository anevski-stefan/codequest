import {
  Component,
  type ReactNode,
  type ComponentType
} from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{
    error: Error;
    reset: () => void;
    message: string;
  }>;
  onReset?: () => void;
  resetKey?: unknown;
}
interface ErrorBoundaryState {
  error: Error | null;
}
const DefaultFallback = ({
  message,
  reset
}: {
  error: Error;
  reset: () => void;
  message: string;
}) => {
  return <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-[#0B1222] border border-gray-200 dark:border-white/10 rounded-lg p-8 shadow-lg">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          An unexpected error interrupted this view. You can try again or reload the page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
            Reload
          </button>
        </div>
        {process.env.NODE_ENV !== 'production' && <p className="mt-4 text-xs text-left font-mono text-gray-500 dark:text-gray-500 break-words">
            {message}
          </p>}
      </div>
    </div>;
};
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error
    };
  }
  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.error) {
      this.reset();
    }
  }
  reset = () => {
    this.setState({
      error: null
    });
    this.props.onReset?.();
  };
  render() {
    const {
      error
    } = this.state;
    if (error) {
      const Fallback = this.props.fallback;
      const message = error.message || 'Something went wrong while rendering this view.';
      if (Fallback) {
        return <Fallback error={error} reset={this.reset} message={message} />;
      }
      return <DefaultFallback error={error} reset={this.reset} message={message} />;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
