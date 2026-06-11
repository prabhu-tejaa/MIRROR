import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const actualPrefix: "/api/" = '/api/';

  if (req.url.startsWith(actualPrefix)) {
    const baseUrl: string = environment.apiUrl || 'http://localhost:8060';
    const apiReq = req.clone({
      url: `${baseUrl}${req.url}`,
      withCredentials: true
    });
    return next(apiReq);
  }
  return next(req);
};
