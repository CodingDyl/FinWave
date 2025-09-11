/**
 * Example component demonstrating comprehensive error handling and logging.
 * Shows how to use the new error handling system throughout the application.
 */

import React, { useState } from 'react';
import { useErrorHandler, useApiErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../toast/EnhancedToastProvider';
import { createPayout, listPayouts } from '../../lib/enhancedApi';
import { logBusinessEvent, logUserAction, logError } from '../../lib/logging';
import { FinwaveError, ValidationError, BusinessLogicError } from '../../lib/errorHandler';

interface PayoutFormData {
  beneficiary_id: string;
  destination_id: string;
  amount: number;
  currency: string;
  memo?: string;
}

export function ErrorHandlingExample() {
  const [formData, setFormData] = useState<PayoutFormData>({
    beneficiary_id: '',
    destination_id: '',
    amount: 0,
    currency: 'ZAR',
    memo: ''
  });
  const [loading, setLoading] = useState(false);
  
  const errorHandler = useErrorHandler();
  const apiErrorHandler = useApiErrorHandler();
  const toast = useToast();

  // Example 1: Basic error handling with user feedback
  const handleBasicError = async () => {
    try {
      // Simulate an operation that might fail
      const result = await apiErrorHandler.handleApiCall(
        () => listPayouts(),
        {
          showToast: true,
          logError: true,
          context: { component: 'ErrorHandlingExample', action: 'list_payouts' }
        }
      );
      
      if (result) {
        toast.showSuccess('Success', 'Payouts loaded successfully');
        logBusinessEvent('payouts_loaded', { count: result.length });
      }
    } catch (error) {
      // Error is already handled by the error handler
      console.log('Error handled by error handler');
    }
  };

  // Example 2: Error handling with retry logic
  const handleRetryableError = async () => {
    try {
      const result = await apiErrorHandler.handleApiCallWithRetry(
        () => createPayout(formData),
        {
          showToast: true,
          logError: true,
          retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
          },
          context: { 
            component: 'ErrorHandlingExample', 
            action: 'create_payout',
            amount: formData.amount,
            currency: formData.currency
          }
        }
      );
      
      if (result) {
        toast.showSuccess('Payout Created', 'Your payout has been created successfully');
        logBusinessEvent('payout_created', { 
          payout_id: result.id,
          amount: result.amount,
          currency: result.currency
        });
      }
    } catch (error) {
      // Error is already handled by the error handler with retry logic
      console.log('Error handled with retry logic');
    }
  };

  // Example 3: Manual error handling with custom logic
  const handleManualError = async () => {
    try {
      // Simulate a validation error
      if (!formData.beneficiary_id) {
        throw new ValidationError('Beneficiary is required', 'beneficiary_id');
      }
      
      if (!formData.destination_id) {
        throw new ValidationError('Destination is required', 'destination_id');
      }
      
      if (formData.amount <= 0) {
        throw new ValidationError('Amount must be greater than 0', 'amount');
      }
      
      // Simulate a business logic error
      if (formData.amount > 10000) {
        throw new BusinessLogicError('Amount exceeds maximum limit of $10,000');
      }
      
      // If we get here, validation passed
      toast.showSuccess('Validation Passed', 'All form fields are valid');
      
    } catch (error) {
      // Handle the error with custom logic
      const structuredError = errorHandler.handleError(error, {
        showToast: true,
        logError: true,
        context: { 
          component: 'ErrorHandlingExample', 
          action: 'manual_validation',
          formData
        }
      });
      
      // Log user action for analytics
      logUserAction({
        action: 'form_validation_failed',
        component: 'ErrorHandlingExample',
        details: {
          error_code: structuredError.code,
          field: structuredError.field,
          message: structuredError.message
        }
      });
    }
  };

  // Example 4: Form submission with comprehensive error handling
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Log form submission
      logUserAction({
        action: 'form_submit',
        component: 'ErrorHandlingExample',
        details: { formData }
      });
      
      // Validate form data
      if (!formData.beneficiary_id || !formData.destination_id || formData.amount <= 0) {
        throw new ValidationError('Please fill in all required fields');
      }
      
      // Create payout with error handling
      const result = await apiErrorHandler.handleApiCallWithRetry(
        () => createPayout(formData),
        {
          showToast: true,
          logError: true,
          retryConfig: {
            maxRetries: 2,
            baseDelay: 1000,
            maxDelay: 5000
          },
          context: { 
            component: 'ErrorHandlingExample', 
            action: 'create_payout',
            formData
          }
        }
      );
      
      if (result) {
        // Success - log business event
        logBusinessEvent('payout_created_successfully', {
          payout_id: result.id,
          amount: result.amount,
          currency: result.currency,
          beneficiary_id: result.beneficiary.id,
          destination_id: result.destination.id
        });
        
        // Reset form
        setFormData({
          beneficiary_id: '',
          destination_id: '',
          amount: 0,
          currency: 'ZAR',
          memo: ''
        });
      }
      
    } catch (error) {
      // Error is already handled by the error handler
      console.log('Form submission error handled');
    } finally {
      setLoading(false);
    }
  };

  // Example 5: Error boundary demonstration
  const handleErrorBoundaryTest = () => {
    // This will trigger an error boundary if wrapped in ErrorBoundary
    throw new Error('This is a test error for error boundary demonstration');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Error Handling Examples</h1>
      
      <div className="space-y-6">
        {/* Example 1: Basic Error Handling */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">1. Basic Error Handling</h2>
          <p className="text-sm text-gray-600 mb-4">
            Demonstrates basic error handling with automatic user feedback and logging.
          </p>
          <button
            onClick={handleBasicError}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Basic Error Handling
          </button>
        </div>

        {/* Example 2: Retry Logic */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">2. Error Handling with Retry</h2>
          <p className="text-sm text-gray-600 mb-4">
            Shows how to handle errors with automatic retry logic and exponential backoff.
          </p>
          <button
            onClick={handleRetryableError}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Retry Logic
          </button>
        </div>

        {/* Example 3: Manual Error Handling */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">3. Manual Error Handling</h2>
          <p className="text-sm text-gray-600 mb-4">
            Demonstrates manual error handling with custom validation and business logic.
          </p>
          <button
            onClick={handleManualError}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Test Manual Error Handling
          </button>
        </div>

        {/* Example 4: Form Submission */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">4. Form Submission with Error Handling</h2>
          <p className="text-sm text-gray-600 mb-4">
            Complete form submission with comprehensive error handling and logging.
          </p>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Beneficiary ID</label>
              <input
                type="text"
                value={formData.beneficiary_id}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_id: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter beneficiary ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Destination ID</label>
              <input
                type="text"
                value={formData.destination_id}
                onChange={(e) => setFormData(prev => ({ ...prev, destination_id: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter destination ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Memo (Optional)</label>
              <input
                type="text"
                value={formData.memo}
                onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter memo"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? 'Creating Payout...' : 'Create Payout'}
            </button>
          </form>
        </div>

        {/* Example 5: Error Boundary Test */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">5. Error Boundary Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tests error boundary functionality (wrap this component in ErrorBoundary to see it work).
          </p>
          <button
            onClick={handleErrorBoundaryTest}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Trigger Error Boundary
          </button>
        </div>
      </div>
    </div>
  );
}
