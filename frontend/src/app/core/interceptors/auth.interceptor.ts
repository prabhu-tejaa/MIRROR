import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { StorageKeys } from '../constants/storage.constants';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageSvc: StorageService = inject(StorageService);
  const token: string | null = storageSvc.get(StorageKeys.ACCESS_TOKEN);

  if (token && req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(authReq);
  }

  return next(req);
};
