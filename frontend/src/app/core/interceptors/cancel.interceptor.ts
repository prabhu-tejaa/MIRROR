import { HttpInterceptorFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { HttpCancelService } from '../services/http-cancel.service';

export const SKIP_CANCEL = new HttpContextToken<boolean>(() => false);

export const cancelInterceptor: HttpInterceptorFn = (req, next) => {
  const httpCancelService = inject(HttpCancelService);

  if (req.context.get(SKIP_CANCEL)) {
    return next(req);
  }

  return next(req).pipe(
    takeUntil(httpCancelService.cancelPendingRequests$)
  );
};
