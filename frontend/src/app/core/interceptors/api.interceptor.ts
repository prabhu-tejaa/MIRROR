import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../domains/auth/data-access/auth.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const actualPrefix: "/api/" = '/api/';

  if (!req.url.startsWith(actualPrefix)) {
    return next(req);
  }

  const baseUrl: string = environment.apiUrl || 'http://localhost:8060';
  let headers = req.headers;
  
  try {
    const authService = injector.get(AuthService);
    const accessToken = authService.getAccessToken();
    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }
  } catch {
    // Ignore injection errors if AuthService is not yet available
  }

  const apiReq = req.clone({
    url: `${baseUrl}${req.url}`,
    headers,
    withCredentials: true
  });
  
  return next(apiReq);
};
