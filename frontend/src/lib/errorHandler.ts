/**
 * Comprehensive error handling and logging utilities for the frontend.
 * Provides structured error responses, user-friendly messages, and logging.
 */

import { normalizeApiError } from './api';

export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  request_id?: string;
}

export interface StructuredError {
  status?: number;
  message: string;
  detail?: ErrorDetail;
  originalError?: any;
}

export class FinwaveError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, any>;
  public readonly field?: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status?: number,
    details?: Record<string, any>,
    field?: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'FinwaveError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.field = field;
    this.requestId = requestId;
  }
}

export class ValidationError extends FinwaveError {
  constructor(message: string, field?: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 422, details, field);
  }
}

export class BusinessLogicError extends FinwaveError {
  constructor(message: string, code: string = 'BUSINESS_LOGIC_ERROR', details?: Record<string, any>) {
    super(message, code, 400, details);
  }
}

export class NetworkError extends FinwaveError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 0, details);
  }
}

export class AuthenticationError extends FinwaveError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class AuthorizationError extends FinwaveError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ResourceNotFoundError extends FinwaveError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 'RESOURCE_NOT_FOUND', 404);
  }
}

export class StripeError extends FinwaveError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'STRIPE_ERROR', 502, details);
  }
}

export class IdempotencyError extends FinwaveError {
  constructor(message: string, existingId?: string) {
    super(message, 'IDEMPOTENCY_KEY_MISMATCH', 409, existingId ? { existing_id: existingId } : undefined);
  }
}

export class RateLimitError extends FinwaveError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ServerError extends FinwaveError {
  constructor(message: string = 'Internal server error', requestId?: string) {
    super(message, 'INTERNAL_SERVER_ERROR', 500, undefined, undefined, requestId);
  }
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Please log in to continue',
  FORBIDDEN: 'You do not have permission to perform this action',
  INVALID_CREDENTIALS: 'Invalid login credentials',
  
  // Validation Errors
  VALIDATION_ERROR: 'Please check your input and try again',
  INVALID_INPUT: 'The information you entered is invalid',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields',
  
  // Business Logic Errors
  RESOURCE_NOT_FOUND: 'The requested item was not found',
  RESOURCE_ALREADY_EXISTS: 'This item already exists',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  OPERATION_NOT_ALLOWED: 'This operation is not allowed',
  
  // Payout Specific Errors
  PAYOUT_NOT_FOUND: 'Payout not found',
  PAYOUT_ALREADY_PROCESSED: 'This payout has already been processed',
  PAYOUT_CANNOT_BE_CANCELLED: 'This payout cannot be cancelled',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this payout',
  INVALID_CURRENCY: 'Invalid currency for this operation',
  EXTERNAL_ACCOUNT_NOT_FOUND: 'Bank account not found',
  
  // Stripe Integration Errors
  STRIPE_ERROR: 'Payment processing failed. Please try again',
  STRIPE_WEBHOOK_ERROR: 'Payment webhook processing failed',
  STRIPE_ACCOUNT_ERROR: 'Payment account error',
  STRIPE_PAYOUT_ERROR: 'Payout processing failed',
  
  // Database Errors
  DATABASE_ERROR: 'Database operation failed',
  CONSTRAINT_VIOLATION: 'This operation conflicts with existing data',
  TRANSACTION_FAILED: 'Transaction failed',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR: 'External service temporarily unavailable',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  TIMEOUT_ERROR: 'Request timed out',
  
  // Idempotency Errors
  IDEMPOTENCY_KEY_MISMATCH: 'This request has already been processed',
  DUPLICATE_REQUEST: 'Duplicate request detected',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again',
  
  // Generic Errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later',
  UNKNOWN_ERROR: 'An unknown error occurred',
  NETWORK_ERROR: 'Network error. Please check your connection'
};

/**
 * Field-specific error message mappings for better UX
 */
const FIELD_ERROR_MESSAGES: Record<string, string> = {
  'beneficiary_id': 'Please select a valid beneficiary',
  'destination_id': 'Please select a valid bank account',
  'amount': 'Please enter a valid amount (minimum 0.01)',
  'currency': 'Please select a valid currency',
  'memo': 'Please enter a valid memo',
  'idempotency_key': 'Request validation failed. Please try again',
  'email': 'Please enter a valid email address',
  'phone': 'Please enter a valid phone number',
  'name': 'Please enter a valid name',
  'account_number': 'Please enter a valid account number',
  'routing_number': 'Please enter a valid routing number',
  'iban': 'Please enter a valid IBAN',
  'bic': 'Please enter a valid BIC/SWIFT code'
};

/**
 * Context-specific error message mappings
 */
const CONTEXT_ERROR_MESSAGES: Record<string, string> = {
  'payout_creation': 'Unable to create payout. Please check your details and try again',
  'beneficiary_creation': 'Unable to create beneficiary. Please check your details and try again',
  'destination_creation': 'Unable to add bank account. Please check your details and try again',
  'login': 'Unable to log in. Please check your credentials and try again',
  'registration': 'Unable to create account. Please check your details and try again',
  'profile_update': 'Unable to update profile. Please check your details and try again',
  'password_reset': 'Unable to reset password. Please try again later',
  'payment_processing': 'Payment processing failed. Please try again or contact support'
};

/**
 * Convert API error to structured FinwaveError
 */
export function createStructuredError(apiError: any): FinwaveError {
  const normalized = normalizeApiError(apiError);
  
  // Extract error details from API response
  const errorDetail = normalized.detail?.error || normalized.detail;
  const code = errorDetail?.code || 'UNKNOWN_ERROR';
  const message = errorDetail?.message || normalized.message;
  const details = errorDetail?.details;
  const field = errorDetail?.field;
  const requestId = errorDetail?.request_id;
  
  // Create appropriate error type based on code
  switch (code) {
    case 'UNAUTHORIZED':
      return new AuthenticationError(message);
    
    case 'FORBIDDEN':
      return new AuthorizationError(message);
    
    case 'VALIDATION_ERROR':
      return new ValidationError(message, field, details);
    
    case 'RESOURCE_NOT_FOUND':
      return new ResourceNotFoundError(message);
    
    case 'STRIPE_ERROR':
      return new StripeError(message, details);
    
    case 'IDEMPOTENCY_KEY_MISMATCH':
      return new IdempotencyError(message, details?.existing_id);
    
    case 'RATE_LIMIT_EXCEEDED':
      return new RateLimitError(message);
    
    case 'INTERNAL_SERVER_ERROR':
      return new ServerError(message, requestId);
    
    default:
      return new FinwaveError(message, code, normalized.status, details, field, requestId);
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: FinwaveError, context?: string): string {
  // If we have a field-specific error, use that
  if (error.field && FIELD_ERROR_MESSAGES[error.field]) {
    return FIELD_ERROR_MESSAGES[error.field];
  }
  
  // If we have a context-specific error, use that
  if (context && CONTEXT_ERROR_MESSAGES[context]) {
    return CONTEXT_ERROR_MESSAGES[context];
  }
  
  // Try to get message from error code mapping
  if (ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  
  // Check if the error message itself is already user-friendly
  if (error.message && !isTechnicalMessage(error.message)) {
    return error.message;
  }
  
  // Fall back to generic message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if a message is technical (contains technical jargon)
 */
function isTechnicalMessage(message: string): boolean {
  const technicalTerms = [
    'idempotency',
    'validation',
    'constraint',
    'database',
    'sql',
    'http',
    'api',
    'endpoint',
    'request',
    'response',
    'status code',
    'error code',
    'exception',
    'traceback',
    'stack trace',
    'internal server error',
    'bad request',
    'unauthorized',
    'forbidden',
    'not found',
    'method not allowed',
    'conflict',
    'unprocessable entity',
    'too many requests',
    'service unavailable',
    'gateway timeout',
    'bad gateway'
  ];
  
  const lowerMessage = message.toLowerCase();
  return technicalTerms.some(term => lowerMessage.includes(term));
}

/**
 * Get detailed error message for debugging
 */
export function getDetailedMessage(error: FinwaveError): string {
  let message = error.message;
  
  if (error.field) {
    message = `${error.field}: ${message}`;
  }
  
  if (error.requestId) {
    message += ` (Request ID: ${error.requestId})`;
  }
  
  return message;
}

/**
 * Log error with structured data
 */
export function logError(error: FinwaveError, context?: Record<string, any>): void {
  const logData = {
    error_code: error.code,
    error_message: error.message,
    status: error.status,
    field: error.field,
    request_id: error.requestId,
    details: error.details,
    context: context,
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    url: window.location.href
  };
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Finwave Error:', logData);
  }
  
  // In production, you might want to send to a logging service
  // logToService(logData);
}

/**
 * Handle API errors and convert to structured errors
 */
export function handleApiError(error: any, context?: Record<string, any>): FinwaveError {
  const structuredError = createStructuredError(error);
  logError(structuredError, context);
  return structuredError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: FinwaveError): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT_ERROR',
    'EXTERNAL_SERVICE_ERROR',
    'INTERNAL_SERVER_ERROR'
  ];
  
  const retryableStatuses = [500, 502, 503, 504, 0];
  
  return retryableCodes.includes(error.code) || 
         (error.status !== undefined && retryableStatuses.includes(error.status));
}

/**
 * Get retry delay for retryable errors
 */
export function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: FinwaveError, context?: string): {
  title: string;
  message: string;
  details?: string;
  retryable: boolean;
} {
  return {
    title: getErrorTitle(error),
    message: getUserFriendlyMessage(error, context),
    details: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    retryable: isRetryableError(error)
  };
}

/**
 * Get error title based on error type
 */
function getErrorTitle(error: FinwaveError): string {
  switch (error.code) {
    case 'UNAUTHORIZED':
      return 'Authentication Required';
    
    case 'FORBIDDEN':
      return 'Access Denied';
    
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    
    case 'RESOURCE_NOT_FOUND':
      return 'Not Found';
    
    case 'STRIPE_ERROR':
      return 'Payment Error';
    
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too Many Requests';
    
    case 'NETWORK_ERROR':
      return 'Connection Error';
    
    case 'INTERNAL_SERVER_ERROR':
      return 'Server Error';
    
    default:
      return 'Error';
  }
}
