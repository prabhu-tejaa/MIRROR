import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonTitle, 
  IonContent, 
  IonSpinner 
} from '@ionic/angular/standalone';
import { ToastService } from '../../../../core/services/toast.service';
import { forkJoin } from 'rxjs';
import { 
  AdminGatewayService, 
  ServiceHealth, 
  RouteMap, 
  BlockedIp, 
  LogEntry 
} from '../../../../core/services/admin-gateway.service';

import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, 
  refreshOutline, 
  pulseOutline, 
  gitNetworkOutline, 
  shieldOutline, 
  checkmarkCircleOutline, 
  warningOutline, 
  banOutline, 
  terminalOutline, 
  chevronForwardOutline, 
  lockOpenOutline 
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-admin-gateway',
  templateUrl: './admin-gateway.page.html',
  styleUrls: ['./admin-gateway.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonButton, 
    IonIcon, 
    IonTitle, 
    IonContent, 
    IonSpinner
  ]
})
export class AdminGatewayPage implements OnInit, OnDestroy {
  private location = inject(Location);
  private toastSvc = inject(ToastService);
  private gatewaySvc = inject(AdminGatewayService);
  private destroyRef = inject(DestroyRef);

  public services: ServiceHealth[] = [];
  public routes: RouteMap[] = [];
  public blockedIps: BlockedIp[] = [];
  public logs: LogEntry[] = [];

  public globalRateLimit = 120;
  public totalRequestsToday = 48512;
  public whitelistedCount = 4;
  public isLoading = true;

  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    addIcons({ 
      arrowBackOutline, 
      refreshOutline, 
      pulseOutline, 
      gitNetworkOutline, 
      shieldOutline, 
      checkmarkCircleOutline, 
      warningOutline, 
      banOutline, 
      terminalOutline, 
      chevronForwardOutline, 
      lockOpenOutline 
    });
  }

  public ngOnInit() {
    this.loadAllTelemetry();
    this.startLiveTelemetryPolling();
  }

  public ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  public goBack() {
    this.location.back();
  }

  public refreshAll() {
    this.loadAllTelemetry();
    this.toastSvc.showSuccess('Telemetry caches flushed and registry pings updated');
  }

  public loadAllTelemetry() {
    this.isLoading = true;
    forkJoin({
      health: this.gatewaySvc.getHealth(),
      routes: this.gatewaySvc.getRoutes(),
      blockedIps: this.gatewaySvc.getBlockedIps(),
      logs: this.gatewaySvc.getLogs(),
      stats: this.gatewaySvc.getStats()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.services = res.health;
        this.routes = res.routes;
        this.blockedIps = res.blockedIps;
        this.logs = res.logs;
        this.totalRequestsToday = res.stats.totalRequestsToday;
        this.whitelistedCount = res.stats.whitelistedCount;
        this.globalRateLimit = res.stats.globalRateLimit;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  public startLiveTelemetryPolling() {
    this.pollTimer = setInterval(() => {
      this.gatewaySvc.getLogs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.logs = data);
      
      this.gatewaySvc.getStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(stats => {
        this.totalRequestsToday = stats.totalRequestsToday;
        this.whitelistedCount = stats.whitelistedCount;
      });

      this.gatewaySvc.getHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.services = data);
    }, 15000);
  }

  public toggleRoute(route: RouteMap) {
    const nextState = !route.active;
    this.gatewaySvc.toggleRoute(route.id, nextState).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        route.active = nextState;
        const state = nextState ? 'Activated' : 'Suspended';
        this.toastSvc.showSuccess(`Route proxy targeting ${route.service} ${state}`);
        this.refreshLogsOnly();
      },
      error: () => {}
    });
  }

  public unblockIp(ip: string) {
    this.gatewaySvc.unblockIp(ip).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.blockedIps = this.blockedIps.filter(item => item.ip !== ip);
        this.whitelistedCount++;
        this.toastSvc.showSuccess(`IP address ${ip} whitelisted and unblocked`);
        this.refreshLogsOnly();
      },
      error: () => {}
    });
  }

  public testRoute(route: RouteMap) {
    if (!route.active) {
      this.toastSvc.showError(`Cannot ping route map targeting ${route.service}: Proxy has been suspended.`);
      return;
    }
    const targetService = this.services.find(s => s.name.toLowerCase().includes(route.service.split('-')[0]));
    if (targetService && targetService.status === 'OFFLINE') {
      this.toastSvc.showError(`Gateway timeout (504): Target service ${route.service} is unreachable.`);
      return;
    }
    this.gatewaySvc.getHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(healths => {
      this.services = healths;
      const probed = healths.find(h => h.name.toLowerCase().includes(route.service.split('-')[0]));
      if (probed && probed.status === 'ONLINE') {
        this.toastSvc.showSuccess(`Gateway proxy to ${route.service} verified successfully. [Status: 200 OK, Latency: ${probed.latency}ms]`);
      } else {
        this.toastSvc.showError(`Gateway Timeout (504): Ping failed for target service ${route.service}.`);
      }
      this.refreshLogsOnly();
    });
  }

  public onRateLimitChange() {
    this.gatewaySvc.updateRateLimit(this.globalRateLimit).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastSvc.showSuccess(`Dynamic threshold updated: firewall lock triggers at ${this.globalRateLimit} req/min`);
      },
      error: () => {}
    });
  }

  private refreshLogsOnly() {
    this.gatewaySvc.getLogs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.logs = data);
    this.gatewaySvc.getStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(stats => {
      this.totalRequestsToday = stats.totalRequestsToday;
      this.whitelistedCount = stats.whitelistedCount;
    });
  }
}
