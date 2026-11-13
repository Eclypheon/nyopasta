import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded-2xl border border-red-200 shadow-sm text-center max-w-md mx-auto my-6 space-y-3">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-sm">
            {this.props.fallbackTitle || 'Something went wrong in this view'}
          </h3>
          <p className="text-xs text-gray-500">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-navy hover:bg-navy-900 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
