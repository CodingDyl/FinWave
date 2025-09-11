/**
 * Enhanced toast provider with comprehensive error handling and logging.
 * Integrates with the error handling system for structured error display.
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { 
  FinwaveError, 
  handleApiError, 
  formatErrorForDisplay, 
  logError,
  isRetryableError,
  getRetryDelay
} from '../../lib/errorHandler';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  duration?: number;
  retryable?: boolean;
  onRetry?: () => void;
  timestamp: Date;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  showSuccess: (title: string, message: string, details?: string) => void;
  showError: (error: FinwaveError | Error | string, context?: Record<string, any>) => void;
  showWarning: (title: string, message: string, details?: string) => void;
  showInfo: (title: string, message: string, details?: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function EnhancedToastProvider({ 
  children, 
  maxToasts = 5, 
  defaultDuration = 5000 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      timestamp: new Date(),
      duration: toast.duration ?? defaultDuration
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, [generateId, maxToasts, defaultDuration]);

  const showSuccess = useCallback((title: string, message: string, details?: string) => {
    showToast({
      type: 'success',
      title,
      message,
      details
    });
  }, [showToast]);

  const showError = useCallback((error: FinwaveError | Error | string, context?: Record<string, any>) => {
    let finwaveError: FinwaveError;
    
    if (typeof error === 'string') {
      finwaveError = new FinwaveError(error);
    } else if (error instanceof FinwaveError) {
      finwaveError = error;
    } else {
      // Convert regular Error to FinwaveError
      finwaveError = new FinwaveError(error.message, 'UNKNOWN_ERROR');
    }

    // Log the error
    logError(finwaveError, context);

    // Extract context for better error messages
    const errorContext = context?.operation || context?.context || undefined;

    // Format for display
    const formatted = formatErrorForDisplay(finwaveError, errorContext);
    
    // Create retry function if applicable
    const onRetry = formatted.retryable ? () => {
      // This would need to be implemented based on the specific context
      console.log('Retry requested for error:', finwaveError);
    } : undefined;

    showToast({
      type: 'error',
      title: formatted.title,
      message: formatted.message,
      details: formatted.details,
      retryable: formatted.retryable,
      onRetry,
      duration: 8000 // Longer duration for errors
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, message: string, details?: string) => {
    showToast({
      type: 'warning',
      title,
      message,
      details,
      duration: 6000
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, message: string, details?: string) => {
    showToast({
      type: 'info',
      title,
      message,
      details
    });
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <div className={`p-4 rounded-lg border shadow-lg ${getToastStyles(toast.type)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-lg font-semibold">
              {getIcon(toast.type)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">{toast.title}</h4>
            <p className="text-sm mt-1">{toast.message}</p>
            {toast.details && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer hover:underline">
                  Show Details
                </summary>
                <pre className="text-xs mt-1 whitespace-pre-wrap bg-white/50 p-2 rounded">
                  {toast.details}
                </pre>
              </details>
            )}
            {toast.retryable && toast.onRetry && (
              <button
                onClick={toast.onRetry}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Dismiss</span>
          <span className="text-lg">×</span>
        </button>
      </div>
    </div>
  );
}
