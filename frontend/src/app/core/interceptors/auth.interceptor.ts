import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { StorageKeys } from '../constants/storage.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageSvc = inject(StorageService);
  const token = storageSvc.get(StorageKeys.ACCESS_TOKEN);

  // Skip adding the token for auth routes if needed, or just let the gateway handle it.
  // Generally, adding it to all API routes is fine, the gateway will validate it if required.
  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};
