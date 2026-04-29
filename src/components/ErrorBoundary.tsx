import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logError } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void; errorId?: string }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo, {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ 
  error, 
  resetError, 
  errorId 
}: { 
  error?: Error; 
  resetError: () => void; 
  errorId?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        {errorId && (
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Error ID: {errorId}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={resetError}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}