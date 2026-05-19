import { HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { LoggerService } from '../logging/logger.service';

/**
 * Attaches the access token to outgoing requests and, on 401, clears the session
 * and redirects to /login. Currently mostly idle because the app is mock-driven,
 * but it's already wired so swapping to *HttpApi services is a one-line change.
 */
export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const logger = inject(LoggerService);

  const token = auth.accessToken();
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        logger.warn('Got 401 — clearing session', { url: req.url });
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
