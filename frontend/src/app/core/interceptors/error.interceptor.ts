import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { TranslationService } from '../services/translation.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translationSvc = inject(TranslationService);
  const toastSvc = inject(ToastService);
  const defaultErrorMessage = translationSvc.translate('ERRORS.UNEXPECTED');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = defaultErrorMessage;

      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (typeof error.error === 'object') {
          errorMessage = error.error.error || error.error.message || defaultErrorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      const isCustomHandled = req.url.includes('/admin/users') || req.url.includes('/gateway/admin') || req.url.includes('/gateway/public');
      if (!isCustomHandled) {
        toastSvc.showError(errorMessage);
      }

      return throwError(() => new Error(errorMessage));
    })
  );
};
