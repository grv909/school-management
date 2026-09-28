import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts the backend's own message from an ApiError response body
 * (com.pm.erp.common.error.ApiError: { message, status, ... }), falling back to a
 * caller-provided default when the error isn't in that shape (network failure, etc).
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return err.error.message;
  }
  return fallback;
}
