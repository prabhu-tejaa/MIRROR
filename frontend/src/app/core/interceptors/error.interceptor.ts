import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, finalize, Observable } from 'rxjs';

import { AuthService } from '../../domains/auth/data-access/auth.service';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';
import { TranslationService } from '../services/translation.service';

let isRefreshing: boolean = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

function getBackendErrorMessage(error: HttpErrorResponse, translationSvc: TranslationService): string | null {
  if (!error.error || typeof error.error !== 'object') { return null; }
  
  const errorObj: Record<string, unknown> = error.error as Record<string, unknown>;
  if (typeof errorObj['errorCode'] !== 'string') { return null; }
  
  const lookupKey: string = `BACKEND_ERRORS.${errorObj['errorCode']}`;
  const translatedError: string = translationSvc.translate(lookupKey);
  
  return translatedError !== lookupKey ? translatedError : null;
}

function extractObjString(errObj: Record<string, unknown>, key: string): string {
  return typeof errObj[key] === 'string' ? errObj[key] : '';
}

function extractRawMessage(error: HttpErrorResponse): string {
  if (!error.error) { return ''; }
  if (typeof error.error === 'string') { return error.error; }
  
  if (typeof error.error === 'object') {
    const errObj: Record<string, unknown> = error.error as Record<string, unknown>;
    return extractObjString(errObj, 'error') || extractObjString(errObj, 'message');
  }
  return '';
}

function getRawErrorMessage(error: HttpErrorResponse, translationSvc: TranslationService): string | null {
  const rawMessage: string = extractRawMessage(error);
  if (!rawMessage) { return null; }

  const errorKey: string = rawMessage.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const lookupKey: string = `BACKEND_ERRORS.${errorKey}`;
  const translatedError: string = translationSvc.translate(lookupKey);
  
  return translatedError !== lookupKey ? translatedError : rawMessage;
}

function getHttpStatusMessage(error: HttpErrorResponse, translationSvc: TranslationService): string | null {
  if (error.status > 0) {
    const httpStatusKey: string = `HTTP_ERRORS.${error.status}`;
    const translatedHttpError: string = translationSvc.translate(httpStatusKey);
    if (translatedHttpError !== httpStatusKey) {
      return translatedHttpError;
    }
  }
  return null;
}

function getFallbackMessage(error: HttpErrorResponse, translationSvc: TranslationService, defaultMsg: string): string {
  if (error.status === 0) {
    return translationSvc.translate('ERRORS.CONNECTION_LOST') || 'Network connection lost. Please check your internet connection.';
  } else if (error.message && !error.message.includes('Http failure response')) {
    return error.message;
  }
  return defaultMsg;
}

function determineErrorMessage(error: HttpErrorResponse, translationSvc: TranslationService): string {
  const defaultErrorMessage: string = translationSvc.translate('ERRORS.UNEXPECTED');
  
  let errorMessage: string | null = getBackendErrorMessage(error, translationSvc);
  if (!errorMessage) {
    errorMessage = getRawErrorMessage(error, translationSvc);
  }
  if (!errorMessage) {
    errorMessage = getHttpStatusMessage(error, translationSvc);
  }
  if (!errorMessage) {
    errorMessage = getFallbackMessage(error, translationSvc, defaultErrorMessage);
  }
  return errorMessage || defaultErrorMessage;
}

interface AuthErrorContext {
  error: HttpErrorResponse;
  req: HttpRequest<unknown>;
  next: HttpHandlerFn;
  injector: Injector;
}

function handleAuthError(ctx: AuthErrorContext): Observable<HttpEvent<unknown>> | null {
  if (ctx.error.status !== 401) { return null; }
  
  const apiSvc: ApiService = ctx.injector.get(ApiService);
  if (!ctx.req.url.includes(apiSvc.auth.REFRESH) && !ctx.req.url.includes(apiSvc.auth.LOGIN)) {
    return handle401Error(ctx.req, ctx.next, ctx.injector);
  }
  
  const authSvc: AuthService = ctx.injector.get(AuthService);
  authSvc.clearSession();
  return null;
}

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const translationSvc: TranslationService = inject(TranslationService);
  const toastSvc: ToastService = inject(ToastService);
  const injector: Injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorMessage: string = determineErrorMessage(error, translationSvc);

      const authHandlerResult: Observable<HttpEvent<unknown>> | null = handleAuthError({ error, req, next, injector });
      if (authHandlerResult) {
        return authHandlerResult;
      }

      void toastSvc.showError(errorMessage);

      const customError: Error = new Error(errorMessage);
      (customError as Error & { status?: number }).status = error.status;
      return throwError(() => customError);
    })
  );
};

interface RefreshContext {
  authSvc: AuthService;
  request: HttpRequest<unknown>;
  next: HttpHandlerFn;
}

function performTokenRefresh(ctx: RefreshContext): Observable<HttpEvent<unknown>> {
  let completed: boolean = false;
  return ctx.authSvc.refresh().pipe(
    catchError((err: unknown) => {
      completed = true;
      isRefreshing = false;
      refreshTokenSubject.next('FAILED');
      ctx.authSvc.clearSession();
      return throwError(() => err instanceof Error ? err : new Error(String(err)));
    }),
    switchMap((token: { accessToken: string }) => {
      completed = true;
      isRefreshing = false;
      refreshTokenSubject.next(token.accessToken);
      return ctx.next(addTokenHeader(ctx.request, token.accessToken));
    }),
    finalize(() => {
      if (!completed && isRefreshing) {
        isRefreshing = false;
        refreshTokenSubject.next('FAILED');
      }
    })
  );
}

function processRefreshQueue(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  return refreshTokenSubject.pipe(
    filter((token: string | null) => token !== null),
    take(1),
    switchMap((token: string) => {
      if (token === 'FAILED') {
        return throwError(() => new Error('Token refresh failed'));
      }
      return next(addTokenHeader(request, token));
    })
  );
}

function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, injector: Injector): Observable<HttpEvent<unknown>> {
  const authSvc: AuthService = injector.get(AuthService);

  if (isRefreshing) {
    return processRefreshQueue(request, next);
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  return performTokenRefresh({ authSvc, request, next });
}

function addTokenHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
