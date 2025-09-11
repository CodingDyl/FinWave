# Comprehensive Error Handling and Logging Guide

This guide explains how to use the comprehensive error handling and logging system implemented in the Finwave application.

## Overview

The error handling and logging system provides:
- **Structured Error Handling**: Consistent error responses with proper HTTP status codes
- **Comprehensive Logging**: Business events, performance metrics, and error tracking
- **Idempotency Support**: Safe retry mechanisms for API operations
- **User-Friendly Messages**: Clear error messages displayed through toast notifications
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Security Logging**: Track security events and suspicious activities

## Backend Error Handling

### 1. Error Types

The system defines several error types in `backend/app/core/errors.py`:

```python
from app.core.errors import (
    ValidationError,
    BusinessLogicError,
    ResourceNotFoundError,
    StripeError,
    IdempotencyError,
    AuthenticationError,
    AuthorizationError
)

# Validation errors
raise ValidationError("Invalid input", field="email")

# Business logic errors
raise BusinessLogicError("Insufficient funds")

# Resource not found
raise ResourceNotFoundError("Payout", payout_id)

# Stripe integration errors
raise StripeError("Payment processing failed", stripe_error=stripe_exception)
```

### 2. Logging Service

Use the logging service for structured logging:

```python
from app.services.logging_service import LoggingService, BusinessEvent

# Log business events
LoggingService.log_business_event(
    event=BusinessEvent.PAYOUT_CREATED,
    user_id=str(user.id),
    resource_id=str(payout.id),
    details={"amount": 100.0, "currency": "ZAR"}
)

# Log API requests
LoggingService.log_api_request(
    method="POST",
    path="/api/v1/payouts",
    user_id=str(user.id),
    payload=payload
)

# Log performance metrics
LoggingService.log_performance_metric(
    metric_name="payout_processing_time",
    value=1500,
    unit="ms",
    user_id=str(user.id)
)
```

### 3. Logging Decorators

Use decorators to automatically log endpoint activity:

```python
from app.decorators.logging import log_endpoint, log_database_operation

@log_endpoint(business_event=BusinessEvent.PAYOUT_CREATED, log_payload=True)
def create_payout(payload: PayoutCreate, db: Session, user: User):
    # Your endpoint logic here
    pass

@log_database_operation(operation="INSERT", table="payouts")
def insert_payout(db: Session, payout_data: dict):
    # Your database operation here
    pass
```

### 4. Idempotency Service

Implement idempotency for safe retry operations:

```python
from app.services.idempotency import IdempotencyService, require_idempotency

# Manual idempotency
key = IdempotencyService.generate_key(
    user_id=str(user.id),
    operation="create_payout",
    payload=payload
)

# Decorator-based idempotency
@require_idempotency(operation="create_payout", expires_hours=24)
def create_payout(payload: PayoutCreate, db: Session, user: User):
    # Your endpoint logic here
    pass
```

## Frontend Error Handling

### 1. Error Handler Hook

Use the error handler hook for comprehensive error handling:

```typescript
import { useErrorHandler, useApiErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const errorHandler = useErrorHandler();
  const apiErrorHandler = useApiErrorHandler();

  // Basic error handling
  const handleError = async () => {
    try {
      const result = await apiErrorHandler.handleApiCall(
        () => createPayout(payload),
        {
          showToast: true,
          logError: true,
          context: { component: 'MyComponent', action: 'create_payout' }
        }
      );
    } catch (error) {
      // Error is already handled
    }
  };

  // Error handling with retry
  const handleRetryableError = async () => {
    try {
      const result = await apiErrorHandler.handleApiCallWithRetry(
        () => createPayout(payload),
        {
          showToast: true,
          logError: true,
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
          }
        }
      );
    } catch (error) {
      // Error is already handled with retry logic
    }
  };
}
```

### 2. Enhanced Toast Provider

The enhanced toast provider automatically handles error display:

```typescript
import { useToast } from '../components/toast/EnhancedToastProvider';

function MyComponent() {
  const toast = useToast();

  // Show different types of messages
  toast.showSuccess('Success', 'Operation completed successfully');
  toast.showError(error, { context: { component: 'MyComponent' } });
  toast.showWarning('Warning', 'Please check your input');
  toast.showInfo('Info', 'Processing your request');
}
```

### 3. Logging Service

Use the frontend logging service for application monitoring:

```typescript
import { 
  logBusinessEvent, 
  logUserAction, 
  logPerformanceMetric,
  logError 
} from '../lib/logging';

// Log business events
logBusinessEvent('payout_created', {
  userId: 'user123',
  payoutId: 'payout456',
  amount: 100.0,
  currency: 'ZAR'
});

// Log user actions
logUserAction({
  action: 'form_submit',
  component: 'CreatePayoutModal',
  details: { formData }
});

// Log performance metrics
logPerformanceMetric({
  name: 'api_response_time',
  value: 1500,
  unit: 'ms',
  context: { endpoint: '/api/v1/payouts' }
});

// Log errors
logError(error, {
  component: 'MyComponent',
  action: 'create_payout'
});
```

### 4. Enhanced API Client

The enhanced API client provides automatic error handling and retry logic:

```typescript
import { createPayout, listPayouts } from '../lib/enhancedApi';

// API calls with automatic error handling
const payout = await createPayout(payload, idempotencyKey, {
  showToast: true,
  logError: true,
  context: { component: 'MyComponent' }
});

// API calls with retry logic
const payouts = await listPayouts({
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
});
```

## Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "email",
      "validation_errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "type": "value_error.email"
        }
      ]
    },
    "request_id": "req-1234567890"
  }
}
```

## Logging Format

All logs follow a structured JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "event_type": "payout_created",
  "user_id": "user123",
  "resource_id": "payout456",
  "correlation_id": "corr-789",
  "details": {
    "amount": 100.0,
    "currency": "ZAR",
    "beneficiary_id": "ben123"
  }
}
```

## Best Practices

### 1. Error Handling

- Always use structured errors instead of generic exceptions
- Provide clear, user-friendly error messages
- Log errors with sufficient context for debugging
- Use appropriate HTTP status codes
- Implement idempotency for operations that can be safely retried

### 2. Logging

- Log business events for analytics and audit trails
- Log user actions for user behavior analysis
- Log performance metrics for optimization
- Log security events for threat detection
- Use correlation IDs to trace requests across services

### 3. Frontend Error Handling

- Use the error handler hooks for consistent error handling
- Show user-friendly error messages through toasts
- Implement retry logic for transient errors
- Log errors with context for debugging
- Handle different error types appropriately

### 4. Idempotency

- Use idempotency keys for operations that can be safely retried
- Validate idempotency key format
- Store results with expiration times
- Clean up expired keys regularly

## Configuration

### Environment Variables

```bash
# Logging level
VITE_LOG_LEVEL=INFO

# API base URL
VITE_API_BASE=http://localhost:8000

# Enable detailed logging
VITE_ENABLE_DETAILED_LOGGING=true
```

### Backend Configuration

```python
# In backend/app/core/config.py
LOG_LEVEL = "INFO"
ENABLE_STRUCTURED_LOGGING = True
IDEMPOTENCY_KEY_EXPIRY_HOURS = 24
```

## Monitoring and Alerting

The logging system provides comprehensive monitoring capabilities:

1. **Business Metrics**: Track key business events and user actions
2. **Performance Metrics**: Monitor API response times and database query performance
3. **Error Tracking**: Track error rates and types across the application
4. **Security Events**: Monitor for suspicious activities and security threats
5. **User Behavior**: Track user interactions and feature usage

## Troubleshooting

### Common Issues

1. **Error Not Displayed**: Check if the error handler is properly configured
2. **Logs Not Appearing**: Verify logging level and configuration
3. **Retry Not Working**: Check if the error is retryable and retry configuration
4. **Idempotency Issues**: Verify idempotency key format and expiration

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Frontend
VITE_LOG_LEVEL=DEBUG

# Backend
LOG_LEVEL=DEBUG
```

This comprehensive error handling and logging system provides robust error management, detailed logging, and excellent user experience throughout the Finwave application.
