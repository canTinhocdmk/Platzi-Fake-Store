import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { FAKE_STORE_API_URL } from '../api/api.config';
import { AuthService } from './auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const isFakeStoreRequest = request.url.startsWith(FAKE_STORE_API_URL);
  const isRefreshRequest = request.url.includes('/auth/refresh-token');

  const authenticatedRequest =
    token && isFakeStoreRequest
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isFakeStoreRequest &&
        !isRefreshRequest &&
        auth.refreshToken()
      ) {
        return auth.refreshSession().pipe(
          switchMap((tokens) => {
            if (!tokens) {
              auth.logout();
              return throwError(() => error);
            }

            return next(
              request.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokens.access_token}`,
                },
              }),
            );
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
