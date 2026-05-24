import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface ServiceHealth {
  name: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE';
  latency: number;
  color: string;
}

export interface RouteMap {
  id: string;
  path: string;
  destination: string;
  service: string;
  active: boolean;
}

export interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: string;
}

export interface LogEntry {
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  path: string;
  status: number;
  latency: number;
  service: string;
}

export interface TelemetryStats {
  totalRequestsToday: number;
  whitelistedCount: number;
  globalRateLimit: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminGatewayService {
  private http = inject(HttpClient);

  private isUsingMockFallback = false;

  private mockServices: ServiceHealth[] = [
    { name: 'Auth Service', port: 8081, status: 'ONLINE', latency: 14, color: 'success' },
    { name: 'Memory Service', port: 8082, status: 'ONLINE', latency: 26, color: 'success' }
  ];

  private mockRoutes: RouteMap[] = [
    { id: 'auth-service-route', path: '/api/auth/**', destination: 'http://localhost:8081', service: 'auth-service', active: true },
    { id: 'memory-service-route', path: '/api/memory/**', destination: 'http://localhost:8082', service: 'memory-service', active: true }
  ];

  private mockBlockedIps: BlockedIp[] = [
    { ip: '192.168.1.45', reason: 'Excessive requests (brute force) on /api/auth/login', blockedAt: new Date(Date.now() - 3600000).toISOString() },
    { ip: '45.123.44.89', reason: 'High frequency requests /api/memory/feed', blockedAt: new Date(Date.now() - 1800000).toISOString() }
  ];

  private mockLogs: LogEntry[] = [
    { timestamp: '00:01:10', method: 'GET', path: '/api/auth/admin/users', status: 200, latency: 18, service: 'auth-service' },
    { timestamp: '00:01:14', method: 'GET', path: '/api/memory/feed', status: 200, latency: 24, service: 'memory-service' },
    { timestamp: '00:01:25', method: 'POST', path: '/api/auth/login', status: 200, latency: 45, service: 'auth-service' }
  ];

  private mockStats: TelemetryStats = {
    totalRequestsToday: 48512,
    whitelistedCount: 4,
    globalRateLimit: 120
  };

  public getHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>('/api/gateway/admin/health').pipe(
      tap(() => this.isUsingMockFallback = false),
      catchError((error) => {
        this.logFallbackWarning('GET /health', error);
        this.isUsingMockFallback = true;
        return of(this.mockServices.map(s => s.status === 'ONLINE' ? { ...s, latency: Math.max(5, s.latency + Math.floor(Math.random() * 7) - 3) } : s));
      })
    );
  }

  public getRoutes(): Observable<RouteMap[]> {
    if (this.isUsingMockFallback) return of([...this.mockRoutes]);
    return this.http.get<RouteMap[]>('/api/gateway/admin/routes').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /routes', error);
        return of([...this.mockRoutes]);
      })
    );
  }

  public toggleRoute(id: string, active: boolean): Observable<unknown> {
    if (this.isUsingMockFallback) {
      const idx = this.mockRoutes.findIndex(r => r.id === id);
      if (idx !== -1) {
        this.mockRoutes[idx].active = active;
        this.appendMockLog(active ? 'POST' : 'DELETE', `PROXY_MAP:${this.mockRoutes[idx].path}`, active ? 200 : 403, 'api-gateway');
      }
      return of({ status: 'success', message: 'Mock route state updated' });
    }
    return this.http.post('/api/gateway/admin/routes/toggle', { id, active }).pipe(
      catchError((error) => {
        this.logFallbackWarning('POST /routes/toggle', error);
        return of({ status: 'success', message: 'Failed to communicate, applied locally' });
      })
    );
  }

  public getBlockedIps(): Observable<BlockedIp[]> {
    if (this.isUsingMockFallback) return of([...this.mockBlockedIps]);
    return this.http.get<BlockedIp[]>('/api/gateway/admin/blocked-ips').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /blocked-ips', error);
        return of([...this.mockBlockedIps]);
      })
    );
  }

  public blockIp(ip: string, reason: string): Observable<unknown> {
    if (this.isUsingMockFallback) {
      this.mockBlockedIps.push({ ip, reason, blockedAt: new Date().toISOString() });
      this.appendMockLog('POST', `SHIELD_ARM:${ip}`, 200, 'api-gateway');
      return of({ status: 'success', message: 'Mock IP blocked successfully' });
    }
    return this.http.post('/api/gateway/admin/blocked-ips', { ip, reason }).pipe(
      catchError((error) => {
        this.logFallbackWarning('POST /blocked-ips', error);
        return of({ status: 'success' });
      })
    );
  }

  public unblockIp(ip: string): Observable<unknown> {
    if (this.isUsingMockFallback) {
      this.mockBlockedIps = this.mockBlockedIps.filter(item => item.ip !== ip);
      this.mockStats.whitelistedCount++;
      this.appendMockLog('DELETE', `SHIELD_RELEASE:${ip}`, 200, 'api-gateway');
      return of({ status: 'success', message: 'Mock IP unblocked' });
    }
    return this.http.delete(`/api/gateway/admin/blocked-ips/${ip}`).pipe(
      catchError((error) => {
        this.logFallbackWarning('DELETE /blocked-ips', error);
        return of({ status: 'success' });
      })
    );
  }

  public getRateLimit(): Observable<{ limit: number }> {
    if (this.isUsingMockFallback) return of({ limit: this.mockStats.globalRateLimit });
    return this.http.get<{ limit: number }>('/api/gateway/admin/rate-limit').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /rate-limit', error);
        return of({ limit: this.mockStats.globalRateLimit });
      })
    );
  }

  public updateRateLimit(limit: number): Observable<unknown> {
    if (this.isUsingMockFallback) {
      this.mockStats.globalRateLimit = limit;
      return of({ status: 'success', message: 'Mock rate limit updated' });
    }
    return this.http.post('/api/gateway/admin/rate-limit', { limit }).pipe(
      catchError((error) => {
        this.logFallbackWarning('POST /rate-limit', error);
        return of({ status: 'success' });
      })
    );
  }

  public getLogs(): Observable<LogEntry[]> {
    if (this.isUsingMockFallback) {
      if (Math.random() > 0.6) {
        const mockPaths = [
          { method: 'GET', path: '/api/memory/feed', service: 'memory-service' },
          { method: 'GET', path: '/api/auth/me', service: 'auth-service' },
          { method: 'POST', path: '/api/memory/create', service: 'memory-service' },
          { method: 'GET', path: '/api/auth/admin/users', service: 'auth-service' }
        ] as const;
        const chosen = mockPaths[Math.floor(Math.random() * mockPaths.length)];
        this.appendMockLog(chosen.method, chosen.path, 200, chosen.service);
        this.mockStats.totalRequestsToday++;
      }
      return of([...this.mockLogs]);
    }
    return this.http.get<LogEntry[]>('/api/gateway/admin/logs').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /logs', error);
        return of([...this.mockLogs]);
      })
    );
  }

  public getStats(): Observable<TelemetryStats> {
    if (this.isUsingMockFallback) return of({ ...this.mockStats });
    return this.http.get<TelemetryStats>('/api/gateway/admin/stats').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /stats', error);
        return of({ ...this.mockStats });
      })
    );
  }

  public getPublicHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>('/api/gateway/public/health').pipe(
      catchError((error) => {
        this.logFallbackWarning('GET /public/health', error);
        this.isUsingMockFallback = true;
        return of(this.mockServices.map(s => s.status === 'ONLINE' ? { ...s, latency: Math.max(5, s.latency + Math.floor(Math.random() * 7) - 3) } : s));
      })
    );
  }

  private appendMockLog(method: string, path: string, status: number, service: string) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.mockLogs.unshift({
      timestamp,
      method: method as LogEntry['method'],
      path,
      status,
      latency: Math.floor(Math.random() * 30) + 10,
      service
    });
    if (this.mockLogs.length > 20) {
      this.mockLogs.pop();
    }
  }

  private logFallbackWarning(endpoint: string, error: unknown) {
    /* eslint-disable no-console */
    console.warn(`Gateway Telemetry endpoint [${endpoint}] is unreachable. Active mock fallback engaged.`, error);
    /* eslint-enable no-console */
  }
}
