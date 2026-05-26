import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
    }).subscribe({
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
        this.toastSvc.showError('Failed to fetch registry and telemetry statistics');
        this.isLoading = false;
      }
    });
  }

  public startLiveTelemetryPolling() {
    this.pollTimer = setInterval(() => {
      this.gatewaySvc.getLogs().subscribe(data => this.logs = data);
      
      this.gatewaySvc.getStats().subscribe(stats => {
        this.totalRequestsToday = stats.totalRequestsToday;
        this.whitelistedCount = stats.whitelistedCount;
      });

      this.gatewaySvc.getHealth().subscribe(data => this.services = data);
    }, 3500);
  }

  public toggleRoute(route: RouteMap) {
    const nextState = !route.active;
    this.gatewaySvc.toggleRoute(route.id, nextState).subscribe({
      next: () => {
        route.active = nextState;
        const state = nextState ? 'Activated' : 'Suspended';
        this.toastSvc.showSuccess(`Route proxy targeting ${route.service} ${state}`);
        this.refreshLogsOnly();
      },
      error: () => this.toastSvc.showError('Failed to change proxy route mapping status')
    });
  }

  public unblockIp(ip: string) {
    this.gatewaySvc.unblockIp(ip).subscribe({
      next: () => {
        this.blockedIps = this.blockedIps.filter(item => item.ip !== ip);
        this.whitelistedCount++;
        this.toastSvc.showSuccess(`IP address ${ip} whitelisted and unblocked`);
        this.refreshLogsOnly();
      },
      error: () => this.toastSvc.showError('Failed to remove IP block')
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
    
    this.gatewaySvc.getHealth().subscribe(healths => {
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
    this.gatewaySvc.updateRateLimit(this.globalRateLimit).subscribe({
      next: () => {
        this.toastSvc.showSuccess(`Dynamic threshold updated: firewall lock triggers at ${this.globalRateLimit} req/min`);
      },
      error: () => this.toastSvc.showError('Failed to save rate limit threshold changes')
    });
  }

  private refreshLogsOnly() {
    this.gatewaySvc.getLogs().subscribe(data => this.logs = data);
    this.gatewaySvc.getStats().subscribe(stats => {
      this.totalRequestsToday = stats.totalRequestsToday;
      this.whitelistedCount = stats.whitelistedCount;
    });
  }
}
