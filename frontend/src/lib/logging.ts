/**
 * Frontend logging service for comprehensive application monitoring.
 * Provides structured logging with user context and performance tracking.
 */

export interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARNING: 'warning';
  ERROR: 'error';
  CRITICAL: 'critical';
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  context?: LogContext;
}

export interface UserAction {
  action: string;
  component: string;
  details?: Record<string, any>;
  context?: LogContext;
}

class LoggingService {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: keyof LogLevel = 'INFO';

  constructor() {
    // Set log level from environment
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase() as keyof LogLevel;
    if (envLogLevel && LOG_LEVELS[envLogLevel]) {
      this.logLevel = envLogLevel;
    }
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: keyof LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private log(level: keyof LogLevel, message: string, context?: LogContext, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);
    
    // Log to console in development
    if (this.isDevelopment) {
      const logMethod = level === 'ERROR' || level === 'CRITICAL' ? 'error' :
                       level === 'WARNING' ? 'warn' :
                       level === 'DEBUG' ? 'debug' : 'log';
      
      console[logMethod](formattedMessage, data || '');
    }

    // In production, you might want to send to a logging service
    // this.sendToLoggingService(level, message, context, data);
  }

  debug(message: string, context?: LogContext, data?: any): void {
    this.log('DEBUG', message, context, data);
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log('INFO', message, context, data);
  }

  warning(message: string, context?: LogContext, data?: any): void {
    this.log('WARNING', message, context, data);
  }

  error(message: string, context?: LogContext, data?: any): void {
    this.log('ERROR', message, context, data);
  }

  critical(message: string, context?: LogContext, data?: any): void {
    this.log('CRITICAL', message, context, data);
  }

  // Business event logging
  logBusinessEvent(event: string, context?: LogContext, details?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      ...context,
      event,
      details
    });
  }

  // User action logging
  logUserAction(action: UserAction): void {
    this.info(`User action: ${action.action}`, {
      ...action.context,
      component: action.component,
      action: action.action,
      details: action.details
    });
  }

  // Performance metric logging
  logPerformanceMetric(metric: PerformanceMetric): void {
    this.info(`Performance metric: ${metric.name}`, {
      ...metric.context,
      metric_name: metric.name,
      value: metric.value,
      unit: metric.unit
    });
  }

  // API call logging
  logApiCall(method: string, url: string, context?: LogContext): void {
    this.debug(`API call: ${method} ${url}`, {
      ...context,
      method,
      url
    });
  }

  logApiResponse(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO';
    this.log(level, `API response: ${method} ${url}`, {
      ...context,
      method,
      url,
      status,
      duration
    });
  }

  // Error logging with stack trace
  logError(error: Error, context?: LogContext): void {
    this.error(`Error: ${error.message}`, {
      ...context,
      error_name: error.name,
      error_stack: error.stack
    });
  }

  // Security event logging
  logSecurityEvent(event: string, context?: LogContext, details?: Record<string, any>): void {
    this.warning(`Security event: ${event}`, {
      ...context,
      security_event: event,
      details
    });
  }

  // Navigation logging
  logNavigation(from: string, to: string, context?: LogContext): void {
    this.info(`Navigation: ${from} -> ${to}`, {
      ...context,
      from,
      to
    });
  }

  // Component lifecycle logging
  logComponentMount(component: string, context?: LogContext): void {
    this.debug(`Component mounted: ${component}`, {
      ...context,
      component,
      lifecycle: 'mount'
    });
  }

  logComponentUnmount(component: string, context?: LogContext): void {
    this.debug(`Component unmounted: ${component}`, {
      ...context,
      component,
      lifecycle: 'unmount'
    });
  }

  // Form interaction logging
  logFormSubmit(form: string, context?: LogContext, details?: Record<string, any>): void {
    this.info(`Form submitted: ${form}`, {
      ...context,
      form,
      details
    });
  }

  logFormValidation(form: string, field: string, error: string, context?: LogContext): void {
    this.warning(`Form validation error: ${form}.${field}`, {
      ...context,
      form,
      field,
      error
    });
  }

  // Set user context for all subsequent logs
  setUserContext(userId: string, sessionId?: string): void {
    this.info('User context set', { userId, sessionId });
  }

  // Clear user context
  clearUserContext(): void {
    this.info('User context cleared');
  }

  // Private method for sending to external logging service
  private sendToLoggingService(
    level: keyof LogLevel,
    message: string,
    context?: LogContext,
    data?: any
  ): void {
    // In production, implement sending to your logging service
    // Example: send to LogRocket, Sentry, or your own logging API
    if (import.meta.env.PROD) {
      // Example implementation:
      // fetch('/api/v1/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ level, message, context, data, timestamp: new Date().toISOString() })
      // }).catch(() => {}); // Silent fail for logging
    }
  }
}

// Create singleton instance
export const logger = new LoggingService();

// Convenience functions
export const logBusinessEvent = (event: string, context?: LogContext, details?: Record<string, any>) => {
  logger.logBusinessEvent(event, context, details);
};

export const logUserAction = (action: UserAction) => {
  logger.logUserAction(action);
};

export const logPerformanceMetric = (metric: PerformanceMetric) => {
  logger.logPerformanceMetric(metric);
};

export const logApiCall = (method: string, url: string, context?: LogContext) => {
  logger.logApiCall(method, url, context);
};

export const logApiResponse = (method: string, url: string, status: number, duration: number, context?: LogContext) => {
  logger.logApiResponse(method, url, status, duration, context);
};

export const logError = (error: Error, context?: LogContext) => {
  logger.logError(error, context);
};

export const logSecurityEvent = (event: string, context?: LogContext, details?: Record<string, any>) => {
  logger.logSecurityEvent(event, context, details);
};

export const logNavigation = (from: string, to: string, context?: LogContext) => {
  logger.logNavigation(from, to, context);
};

export const logComponentMount = (component: string, context?: LogContext) => {
  logger.logComponentMount(component, context);
};

export const logComponentUnmount = (component: string, context?: LogContext) => {
  logger.logComponentUnmount(component, context);
};

export const logFormSubmit = (form: string, context?: LogContext, details?: Record<string, any>) => {
  logger.logFormSubmit(form, context, details);
};

export const logFormValidation = (form: string, field: string, error: string, context?: LogContext) => {
  logger.logFormValidation(form, field, error, context);
};

export const setUserContext = (userId: string, sessionId?: string) => {
  logger.setUserContext(userId, sessionId);
};

export const clearUserContext = () => {
  logger.clearUserContext();
};
