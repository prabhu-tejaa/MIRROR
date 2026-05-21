import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { TranslationService } from '../services/translation.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translationSvc = inject(TranslationService);
  const defaultErrorMessage = translationSvc.translate('ERRORS.UNEXPECTED');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = defaultErrorMessage;

      const typeString = translationSvc.translate('TYPES.STRING');
      const typeObject = translationSvc.translate('TYPES.OBJECT');

      if (error.error) {
        if (typeof error.error === typeString) {
          errorMessage = error.error;
        } else if (typeof error.error === typeObject && error.error.message) {
          errorMessage = error.error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return throwError(() => new Error(errorMessage));
    })
  );
};
