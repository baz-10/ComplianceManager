import { toast } from '@/hooks/use-toast';

// API Error response type
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    field?: string;
  };
}

// Check if error is an API error
export function isApiError(error: any): error is ApiErrorResponse {
  return error?.success === false && error?.error?.message;
}

// Extract error message from various error types
export function getErrorMessage(error: any): string {
  // API error response
  if (isApiError(error)) {
    return error.error.message;
  }

  // Error object with message
  if (error?.message) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Default message
  return 'An unexpected error occurred. Please try again.';
}

// Show error toast with proper message
export function showErrorToast(error: any, title?: string) {
  const message = getErrorMessage(error);
  
  toast({
    title: title || 'Error',
    description: message,
    variant: 'destructive',
  });
}

// Handle form validation errors
export function getFieldError(error: any, fieldName: string): string | undefined {
  if (isApiError(error) && error.error.field === fieldName) {
    return error.error.message;
  }
  return undefined;
}

// Format error for display in UI components
export function formatError(error: any): {
  title: string;
  message: string;
  isRetryable: boolean;
} {
  if (isApiError(error)) {
    const errorCode = error.error.code;
    
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return {
          title: 'Validation Error',
          message: error.error.message,
          isRetryable: false
        };
      
      case 'UNAUTHORIZED':
        return {
          title: 'Authentication Required',
          message: error.error.message,
          isRetryable: false
        };
      
      case 'FORBIDDEN':
        return {
          title: 'Access Denied',
          message: error.error.message,
          isRetryable: false
        };
      
      case 'NOT_FOUND':
        return {
          title: 'Not Found',
          message: error.error.message,
          isRetryable: false
        };
      
      case 'RATE_LIMIT':
        return {
          title: 'Too Many Requests',
          message: error.error.message,
          isRetryable: true
        };
      
      default:
        return {
          title: 'Error',
          message: error.error.message,
          isRetryable: true
        };
    }
  }

  return {
    title: 'Error',
    message: getErrorMessage(error),
    isRetryable: true
  };
}

// React Query error handler
export function handleQueryError(error: any) {
  // Don't show toast for 401s - let auth handler deal with it
  if (error?.status === 401) {
    return;
  }

  showErrorToast(error);
}