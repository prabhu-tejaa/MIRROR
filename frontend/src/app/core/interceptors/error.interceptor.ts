import { inject, Injector } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, finalize } from 'rxjs';
import { TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import { ApiService } from '../services/api.service';
import { StorageKeys } from '../constants/storage.constants';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translationSvc = inject(TranslationService);
  const toastSvc = inject(ToastService);
  const injector = inject(Injector);
  const defaultErrorMessage = translationSvc.translate('ERRORS.UNEXPECTED');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = defaultErrorMessage;

      // 1. Try mapping explicit errorCode
      if (error.error && error.error.errorCode) {
        const lookupKey = `BACKEND_ERRORS.${error.error.errorCode}`;
        const translatedError = translationSvc.translate(lookupKey);
        if (translatedError !== lookupKey) {
          errorMessage = translatedError;
        }
      }

      // 2. If not found, try mapping raw error message string
      if (errorMessage === defaultErrorMessage) {
        let rawMessage = '';
        if (error.error) {
          if (typeof error.error === 'string') {
            rawMessage = error.error;
          } else if (typeof error.error === 'object') {
            rawMessage = error.error.error || error.error.message || '';
          }
        }
        
        if (rawMessage && typeof rawMessage === 'string') {
          const errorKey = rawMessage.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          const lookupKey = `BACKEND_ERRORS.${errorKey}`;
          const translatedError = translationSvc.translate(lookupKey);
          
          if (translatedError !== lookupKey) {
            errorMessage = translatedError;
          } else {
            errorMessage = rawMessage;
          }
        }
      }

      // 3. Fallback to generic HTTP status code message
      if (errorMessage === defaultErrorMessage && error.status > 0) {
        const httpStatusKey = `HTTP_ERRORS.${error.status}`;
        const translatedHttpError = translationSvc.translate(httpStatusKey);
        if (translatedHttpError !== httpStatusKey) {
          errorMessage = translatedHttpError;
        }
      }

      // 4. Fallback to connection lost or default message
      if (errorMessage === defaultErrorMessage) {
        if (error.status === 0) {
          errorMessage = translationSvc.translate('ERRORS.CONNECTION_LOST') || 'Network connection lost. Please check your internet connection.';
        } else if (error.message && !error.message.includes('Http failure response')) {
          errorMessage = error.message;
        }
      }

      console.warn('[ErrorInterceptor] Caught HTTP error:', {
        url: req.url,
        status: error.status,
        message: error.message
      });

      if (error.status === 401) {
        const apiSvc = injector.get(ApiService);
        if (!req.url.includes(apiSvc.AUTH.REFRESH) && !req.url.includes(apiSvc.AUTH.LOGIN)) {
          console.log('[ErrorInterceptor] 401 on non-auth route. Attempting token refresh...');
          return handle401Error(req, next, injector);
        } else {
          console.warn('[ErrorInterceptor] 401 on refresh or login route. Clearing session!');
          // If the refresh token itself fails, clear the session locally
          const authSvc = injector.get(AuthService);
          authSvc.clearSession();
        }
      }

      toastSvc.showError(errorMessage);

      const customError = new Error(errorMessage);
      (customError as Error & { status?: number }).status = error.status;
      return throwError(() => customError);
    })
  );
};

function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, injector: Injector) {
  const authSvc = injector.get(AuthService);
  const storageSvc = injector.get(StorageService);
  const refreshToken = storageSvc.get(StorageKeys.REFRESH_TOKEN);

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    if (refreshToken) {
      let completed = false;
      console.log('[ErrorInterceptor] Refreshing access token...');
      return authSvc.refresh(refreshToken).pipe(
        catchError((err) => {
          console.error('[ErrorInterceptor] Refresh token request failed. Clearing session!', err);
          completed = true;
          isRefreshing = false;
          refreshTokenSubject.next('FAILED');
          authSvc.clearSession();
          return throwError(() => err);
        }),
        switchMap((token: { accessToken: string }) => {
          console.log('[ErrorInterceptor] Refresh token request succeeded. Retrying failed request with new access token.');
          completed = true;
          isRefreshing = false;
          refreshTokenSubject.next(token.accessToken);
          return next(addTokenHeader(request, token.accessToken));
        }),
        finalize(() => {
          if (!completed && isRefreshing) {
            isRefreshing = false;
            refreshTokenSubject.next('FAILED');
          }
        })
      );
    } else {
      console.warn('[ErrorInterceptor] No refresh token available. Clearing session!');
      isRefreshing = false;
      refreshTokenSubject.next('FAILED');
      authSvc.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        if (token === 'FAILED') {
          return throwError(() => new Error('Token refresh failed'));
        }
        return next(addTokenHeader(request, token));
      })
    );
  }
}

function addTokenHeader(request: HttpRequest<unknown>, token: string) {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
