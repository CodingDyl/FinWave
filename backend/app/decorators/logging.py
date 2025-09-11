"""
Logging decorators for API endpoints to provide comprehensive request/response tracking.
"""

import time
import functools
import asyncio
from typing import Callable, Any, Optional, Dict
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

from app.services.logging_service import LoggingService, BusinessEvent
from app.core.errors import log_error

def log_endpoint(
    business_event: Optional[BusinessEvent] = None,
    log_payload: bool = True,
    log_response: bool = False,
    track_performance: bool = True
):
    """
    Decorator to add comprehensive logging to API endpoints.
    
    Args:
        business_event: Business event to log when endpoint is called
        log_payload: Whether to log request payload
        log_response: Whether to log response data
        track_performance: Whether to track performance metrics
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract request and user context
            request = None
            user_id = None
            db = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    # Extract user ID from session
                    if hasattr(request, 'session') and request.session:
                        user_id = str(request.session.get("uid", ""))
                elif isinstance(arg, Session):
                    db = arg
            
            # Extract from kwargs
            if not request:
                request = kwargs.get('request')
            if not db:
                db = kwargs.get('db')
            
            start_time = time.time()
            
            # Log business event if specified
            if business_event:
                LoggingService.log_business_event(
                    event=business_event,
                    user_id=user_id,
                    details={
                        "endpoint": func.__name__,
                        "method": request.method if request else "unknown",
                        "path": request.url.path if request else "unknown"
                    }
                )
            
            try:
                # Call the original function
                result = await func(*args, **kwargs)
                
                # Calculate execution time
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log performance metric if enabled
                if track_performance:
                    LoggingService.log_performance_metric(
                        metric_name="endpoint_execution_time",
                        value=execution_time_ms,
                        unit="ms",
                        user_id=user_id,
                        details={
                            "endpoint": func.__name__,
                            "method": request.method if request else "unknown",
                            "path": request.url.path if request else "unknown"
                        }
                    )
                
                # Log response if enabled
                if log_response and result is not None:
                    LoggingService.log_business_event(
                        event=BusinessEvent.API_RESPONSE,
                        user_id=user_id,
                        details={
                            "endpoint": func.__name__,
                            "response_type": type(result).__name__,
                            "response_size": len(str(result)) if result else 0
                        }
                    )
                
                return result
                
            except Exception as e:
                # Calculate execution time for failed requests
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log error with context
                log_error(
                    error=e,
                    context={
                        "endpoint": func.__name__,
                        "method": request.method if request else "unknown",
                        "path": request.url.path if request else "unknown",
                        "execution_time_ms": execution_time_ms,
                        "user_id": user_id
                    },
                    user_id=user_id
                )
                
                # Re-raise the exception
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Extract request and user context
            request = None
            user_id = None
            db = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    # Extract user ID from session
                    if hasattr(request, 'session') and request.session:
                        user_id = str(request.session.get("uid", ""))
                elif isinstance(arg, Session):
                    db = arg
            
            # Extract from kwargs
            if not request:
                request = kwargs.get('request')
            if not db:
                db = kwargs.get('db')
            
            start_time = time.time()
            
            # Log business event if specified
            if business_event:
                LoggingService.log_business_event(
                    event=business_event,
                    user_id=user_id,
                    details={
                        "endpoint": func.__name__,
                        "method": request.method if request else "unknown",
                        "path": request.url.path if request else "unknown"
                    }
                )
            
            try:
                # Call the original function
                result = func(*args, **kwargs)
                
                # Calculate execution time
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log performance metric if enabled
                if track_performance:
                    LoggingService.log_performance_metric(
                        metric_name="endpoint_execution_time",
                        value=execution_time_ms,
                        unit="ms",
                        user_id=user_id,
                        details={
                            "endpoint": func.__name__,
                            "method": request.method if request else "unknown",
                            "path": request.url.path if request else "unknown"
                        }
                    )
                
                # Log response if enabled
                if log_response and result is not None:
                    LoggingService.log_business_event(
                        event=BusinessEvent.API_RESPONSE,
                        user_id=user_id,
                        details={
                            "endpoint": func.__name__,
                            "response_type": type(result).__name__,
                            "response_size": len(str(result)) if result else 0
                        }
                    )
                
                return result
                
            except Exception as e:
                # Calculate execution time for failed requests
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log error with context
                log_error(
                    error=e,
                    context={
                        "endpoint": func.__name__,
                        "method": request.method if request else "unknown",
                        "path": request.url.path if request else "unknown",
                        "execution_time_ms": execution_time_ms,
                        "user_id": user_id
                    },
                    user_id=user_id
                )
                
                # Re-raise the exception
                raise
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def log_database_operation(
    operation: str,
    table: str,
    log_query: bool = False
):
    """
    Decorator to log database operations with performance metrics.
    
    Args:
        operation: Type of database operation (SELECT, INSERT, UPDATE, DELETE)
        table: Table name being operated on
        log_query: Whether to log the actual query
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            db = None
            user_id = None
            
            # Extract database session and user context
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                    break
            
            if not db:
                db = kwargs.get('db')
            
            # Extract user ID from request if available
            for arg in args:
                if hasattr(arg, 'session') and hasattr(arg.session, 'get'):
                    user_id = str(arg.session.get("uid", ""))
                    break
            
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log successful database operation
                LoggingService.log_database_operation(
                    operation=operation,
                    table=table,
                    user_id=user_id,
                    query_time_ms=execution_time_ms,
                    rows_affected=getattr(result, 'rowcount', None) if hasattr(result, 'rowcount') else None
                )
                
                return result
                
            except Exception as e:
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log failed database operation
                LoggingService.log_database_operation(
                    operation=operation,
                    table=table,
                    user_id=user_id,
                    query_time_ms=execution_time_ms,
                    error=e
                )
                
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            db = None
            user_id = None
            
            # Extract database session and user context
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                    break
            
            if not db:
                db = kwargs.get('db')
            
            # Extract user ID from request if available
            for arg in args:
                if hasattr(arg, 'session') and hasattr(arg.session, 'get'):
                    user_id = str(arg.session.get("uid", ""))
                    break
            
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log successful database operation
                LoggingService.log_database_operation(
                    operation=operation,
                    table=table,
                    user_id=user_id,
                    query_time_ms=execution_time_ms,
                    rows_affected=getattr(result, 'rowcount', None) if hasattr(result, 'rowcount') else None
                )
                
                return result
                
            except Exception as e:
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log failed database operation
                LoggingService.log_database_operation(
                    operation=operation,
                    table=table,
                    user_id=user_id,
                    query_time_ms=execution_time_ms,
                    error=e
                )
                
                raise
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def log_external_api_call(
    service: str,
    endpoint: str,
    method: str = "POST"
):
    """
    Decorator to log external API calls with performance metrics.
    
    Args:
        service: Name of the external service (e.g., 'stripe', 'google')
        endpoint: API endpoint being called
        method: HTTP method being used
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            user_id = None
            
            # Extract user ID from request if available
            for arg in args:
                if hasattr(arg, 'session') and hasattr(arg.session, 'get'):
                    user_id = str(arg.session.get("uid", ""))
                    break
            
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log successful external API call
                LoggingService.log_external_api_call(
                    service=service,
                    endpoint=endpoint,
                    method=method,
                    status_code=200,  # Assume success if no exception
                    response_time_ms=execution_time_ms,
                    user_id=user_id
                )
                
                return result
                
            except Exception as e:
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log failed external API call
                LoggingService.log_external_api_call(
                    service=service,
                    endpoint=endpoint,
                    method=method,
                    response_time_ms=execution_time_ms,
                    user_id=user_id,
                    error=e
                )
                
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            user_id = None
            
            # Extract user ID from request if available
            for arg in args:
                if hasattr(arg, 'session') and hasattr(arg.session, 'get'):
                    user_id = str(arg.session.get("uid", ""))
                    break
            
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log successful external API call
                LoggingService.log_external_api_call(
                    service=service,
                    endpoint=endpoint,
                    method=method,
                    status_code=200,  # Assume success if no exception
                    response_time_ms=execution_time_ms,
                    user_id=user_id
                )
                
                return result
                
            except Exception as e:
                execution_time_ms = (time.time() - start_time) * 1000
                
                # Log failed external API call
                LoggingService.log_external_api_call(
                    service=service,
                    endpoint=endpoint,
                    method=method,
                    response_time_ms=execution_time_ms,
                    user_id=user_id,
                    error=e
                )
                
                raise
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
