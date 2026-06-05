import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { ApiService } from '../services/api.service';
import { handleAdminRoutes } from './mock-data/mock-admin';
import { handleAuthRoutes } from './mock-data/mock-auth';
import { handleGatewayRoutes } from './mock-data/mock-gateway';
import { handleMemoryRoutes } from './mock-data/mock-memory';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mock) {
    return next(req);
  }

  const apiSvc: ApiService = inject(ApiService);
  const url: string = req.url;

  const authResponse = handleAuthRoutes(req, url, apiSvc);
  if (authResponse) return authResponse;

  const memoryResponse = handleMemoryRoutes(req, url, apiSvc);
  if (memoryResponse) return memoryResponse;

  const adminResponse = handleAdminRoutes(req, url);
  if (adminResponse) return adminResponse;

  const gatewayResponse = handleGatewayRoutes(req, url);
  if (gatewayResponse) return gatewayResponse;

  return next(req);
};
