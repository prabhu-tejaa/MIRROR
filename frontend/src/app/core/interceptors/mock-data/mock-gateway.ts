import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of , delay } from 'rxjs';


import { MockState } from './mock-state';

export function handleGatewayRoutes(req: HttpRequest<unknown>, url: string): Observable<HttpResponse<unknown>> | null {
  if (url.includes('/api/gateway/admin/health')) {
    return of(new HttpResponse({ status: 200, body: MockState.healthStats })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/routes/toggle')) {
    const body = req.body as { id: string, active: boolean };
    const route = MockState.routes.find(r => r.id === body.id);
    if (route) {
      route.active = body.active;
    }
    return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/routes')) {
    return of(new HttpResponse({ status: 200, body: MockState.routes })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/blocked-ips/')) {
    if (req.method === 'DELETE') {
      const ip = url.substring(url.lastIndexOf('/') + 1);
      MockState.blockedIps = MockState.blockedIps.filter(item => item.ip !== ip);
      MockState.gatewayStats.whitelistedCount++;
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/blocked-ips')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: MockState.blockedIps })).pipe(delay(200));
    }
    if (req.method === 'POST') {
      const body = req.body as { ip: string, reason?: string };
      const newBlocked = {
        ip: body.ip,
        reason: body.reason || 'Manual block',
        blockedAt: new Date().toISOString()
      };
      MockState.blockedIps = [...MockState.blockedIps, newBlocked];
      MockState.gatewayStats.whitelistedCount = Math.max(0, MockState.gatewayStats.whitelistedCount - 1);
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/rate-limit')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: { limit: MockState.gatewayStats.globalRateLimit } })).pipe(delay(200));
    }
    if (req.method === 'POST') {
      const body = req.body as { limit: number };
      MockState.gatewayStats.globalRateLimit = body.limit;
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/logs')) {
    return of(new HttpResponse({ status: 200, body: MockState.logs })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/stats')) {
    return of(new HttpResponse({ status: 200, body: MockState.gatewayStats })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/public/health')) {
    return of(new HttpResponse({ status: 200, body: MockState.healthStats })).pipe(delay(200));
  }

  return null;
}
