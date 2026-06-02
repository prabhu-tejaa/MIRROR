import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  public getHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>('/api/gateway/admin/health');
  }

  public getRoutes(): Observable<RouteMap[]> {
    return this.http.get<RouteMap[]>('/api/gateway/admin/routes');
  }

  public toggleRoute(id: string, active: boolean): Observable<unknown> {
    return this.http.post('/api/gateway/admin/routes/toggle', { id, active });
  }

  public getBlockedIps(): Observable<BlockedIp[]> {
    return this.http.get<BlockedIp[]>('/api/gateway/admin/blocked-ips');
  }

  public blockIp(ip: string, reason: string): Observable<unknown> {
    return this.http.post('/api/gateway/admin/blocked-ips', { ip, reason });
  }

  public unblockIp(ip: string): Observable<unknown> {
    return this.http.delete(`/api/gateway/admin/blocked-ips/${ip}`);
  }

  public getRateLimit(): Observable<{ limit: number }> {
    return this.http.get<{ limit: number }>('/api/gateway/admin/rate-limit');
  }

  public updateRateLimit(limit: number): Observable<unknown> {
    return this.http.post('/api/gateway/admin/rate-limit', { limit });
  }

  public getLogs(): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>('/api/gateway/admin/logs');
  }

  public getStats(): Observable<TelemetryStats> {
    return this.http.get<TelemetryStats>('/api/gateway/admin/stats');
  }

  public getPublicHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>('/api/gateway/public/health');
  }
}
