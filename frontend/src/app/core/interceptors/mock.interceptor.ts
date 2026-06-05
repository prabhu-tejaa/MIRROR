import { HttpInterceptorFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiService } from '../services/api.service';
import { handleAdminRoutes } from './mock-data/mock-admin';
import { handleAuthRoutes } from './mock-data/mock-auth';
import { handleGatewayRoutes } from './mock-data/mock-gateway';
import { handleMemoryRoutes } from './mock-data/mock-memory';

function resolveRoute(req: Parameters<HttpInterceptorFn>[0], url: string, apiSvc: ApiService): Observable<HttpEvent<unknown>> | null {
  return handleAuthRoutes(req, url, apiSvc)
    ?? handleMemoryRoutes(req, url, apiSvc)
    ?? handleAdminRoutes(req, url)
    ?? handleGatewayRoutes(req, url);
}

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mock) {
    return next(req);
  }
  const apiSvc: ApiService = inject(ApiService);
  const resolved: Observable<HttpEvent<unknown>> | null = resolveRoute(req, req.url, apiSvc);
  if (resolved) {
    return resolved;
  }
  return next(req);
};
