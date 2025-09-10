import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-4">
            <div className="card p-8 text-center">
              <div className="mb-6">
                <div className="size-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground">
                  We're sorry, but something unexpected happened. Please try refreshing the page.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto">
                    <div className="text-destructive font-semibold mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </div>
                    <pre className="whitespace-pre-wrap text-xs">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="font-semibold mb-1">Component Stack:</div>
                        <pre className="whitespace-pre-wrap text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  className="btn btn-ghost"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="btn btn-primary"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    // You can add additional error reporting here
  };
}
