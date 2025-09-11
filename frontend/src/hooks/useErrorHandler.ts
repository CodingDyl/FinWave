/**
 * Custom hook for comprehensive error handling throughout the application.
 * Provides centralized error handling with logging, user feedback, and retry logic.
 */

import { useCallback, useRef } from 'react';
import { useToast } from '../components/toast/EnhancedToastProvider';
import { 
  FinwaveError, 
  handleApiError, 
  isRetryableError, 
  getRetryDelay,
  logError 
} from '../lib/errorHandler';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retryConfig?: Partial<RetryConfig>;
  context?: Record<string, any>;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

export function useErrorHandler() {
  const toast = useToast();
  const retryAttempts = useRef<Map<string, number>>(new Map());

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError: shouldLog = true,
      retryConfig = {},
      context = {}
    } = options;

    // Convert to structured error
    const structuredError = handleApiError(error, context);

    // Log error if requested
    if (shouldLog) {
      logError(structuredError, context);
    }

    // Show toast if requested
    if (showToast) {
      toast.showError(structuredError, context);
    }

    return structuredError;
  }, [toast]);

  const handleErrorWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T> => {
    const {
      showToast = true,
      logError: shouldLog = true,
      retryConfig = {},
      context = {}
    } = options;

    const config = { ...defaultRetryConfig, ...retryConfig };
    const operationKey = JSON.stringify({ operation: operation.toString(), context });
    const currentAttempts = retryAttempts.current.get(operationKey) || 0;

    try {
      const result = await operation();
      
      // Reset retry count on success
      retryAttempts.current.delete(operationKey);
      
      return result;
    } catch (error) {
      const structuredError = handleApiError(error, context);

      // Log error if requested
      if (shouldLog) {
        logError(structuredError, {
          ...context,
          retryAttempt: currentAttempts,
          maxRetries: config.maxRetries
        });
      }

      // Check if we should retry
      const shouldRetry = currentAttempts < config.maxRetries && 
                         isRetryableError(structuredError);

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, currentAttempts),
          config.maxDelay
        );

        // Update retry count
        retryAttempts.current.set(operationKey, currentAttempts + 1);

        // Show retry toast
        if (showToast) {
          toast.showWarning(
            'Retrying...',
            `Attempt ${currentAttempts + 1} of ${config.maxRetries}. Retrying in ${Math.round(delay / 1000)}s.`,
            `Error: ${structuredError.message}`
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return handleErrorWithRetry(operation, options);
      } else {
        // Max retries exceeded or non-retryable error
        retryAttempts.current.delete(operationKey);

        if (showToast) {
          toast.showError(structuredError, {
            ...context,
            retryAttempts: currentAttempts,
            maxRetries: config.maxRetries
          });
        }

        throw structuredError;
      }
    }
  }, [toast]);

  const handleAsyncError = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  const handleSyncError = useCallback(<T>(
    operation: () => T,
    options: ErrorHandlerOptions = {}
  ): T | null => {
    try {
      return operation();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  const clearRetryCount = useCallback((operationKey?: string) => {
    if (operationKey) {
      retryAttempts.current.delete(operationKey);
    } else {
      retryAttempts.current.clear();
    }
  }, []);

  const getRetryCount = useCallback((operationKey: string) => {
    return retryAttempts.current.get(operationKey) || 0;
  }, []);

  return {
    handleError,
    handleErrorWithRetry,
    handleAsyncError,
    handleSyncError,
    clearRetryCount,
    getRetryCount
  };
}

/**
 * Hook for handling API errors with automatic retry and user feedback
 */
export function useApiErrorHandler() {
  const errorHandler = useErrorHandler();

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    return errorHandler.handleAsyncError(apiCall, {
      showToast: true,
      logError: true,
      retryConfig: {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000
      },
      ...options
    });
  }, [errorHandler]);

  const handleApiCallWithRetry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await errorHandler.handleErrorWithRetry(apiCall, {
        showToast: true,
        logError: true,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 15000
        },
        ...options
      });
    } catch (error) {
      return null;
    }
  }, [errorHandler]);

  return {
    handleApiCall,
    handleApiCallWithRetry,
    ...errorHandler
  };
}

/**
 * Hook for handling form validation errors
 */
export function useFormErrorHandler() {
  const errorHandler = useErrorHandler();

  const handleValidationError = useCallback((
    error: unknown,
    field?: string,
    context?: Record<string, any>
  ) => {
    const structuredError = handleApiError(error, context);
    
    // Show field-specific error
    if (field) {
      errorHandler.handleError(structuredError, {
        showToast: true,
        logError: true,
        context: { ...context, field }
      });
    } else {
      errorHandler.handleError(structuredError, {
        showToast: true,
        logError: true,
        context
      });
    }

    return structuredError;
  }, [errorHandler]);

  return {
    handleValidationError,
    ...errorHandler
  };
}
