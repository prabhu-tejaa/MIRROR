import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
  private apiSvc = inject(ApiService);

  public getHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>(this.apiSvc.ADMIN_GATEWAY.HEALTH);
  }

  public getRoutes(): Observable<RouteMap[]> {
    return this.http.get<RouteMap[]>(this.apiSvc.ADMIN_GATEWAY.ROUTES);
  }

  public toggleRoute(id: string, active: boolean): Observable<unknown> {
    return this.http.post(this.apiSvc.ADMIN_GATEWAY.ROUTES_TOGGLE, { id, active });
  }

  public getBlockedIps(): Observable<BlockedIp[]> {
    return this.http.get<BlockedIp[]>(this.apiSvc.ADMIN_GATEWAY.BLOCKED_IPS);
  }

  public blockIp(ip: string, reason: string): Observable<unknown> {
    return this.http.post(this.apiSvc.ADMIN_GATEWAY.BLOCKED_IPS, { ip, reason });
  }

  public unblockIp(ip: string): Observable<unknown> {
    return this.http.delete(this.apiSvc.ADMIN_GATEWAY.UNBLOCK_IP(ip));
  }

  public getRateLimit(): Observable<{ limit: number }> {
    return this.http.get<{ limit: number }>(this.apiSvc.ADMIN_GATEWAY.RATE_LIMIT);
  }

  public updateRateLimit(limit: number): Observable<unknown> {
    return this.http.post(this.apiSvc.ADMIN_GATEWAY.RATE_LIMIT, { limit });
  }

  public getLogs(): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(this.apiSvc.ADMIN_GATEWAY.LOGS);
  }

  public getStats(): Observable<TelemetryStats> {
    return this.http.get<TelemetryStats>(this.apiSvc.ADMIN_GATEWAY.STATS);
  }

  public getPublicHealth(): Observable<ServiceHealth[]> {
    return this.http.get<ServiceHealth[]>(this.apiSvc.ADMIN_GATEWAY.PUBLIC_HEALTH);
  }
}
