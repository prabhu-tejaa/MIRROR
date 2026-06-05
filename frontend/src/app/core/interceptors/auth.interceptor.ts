import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { StorageKeys } from '../constants/storage.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageSvc = inject(StorageService);
  const token = storageSvc.get(StorageKeys.ACCESS_TOKEN);

  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};
