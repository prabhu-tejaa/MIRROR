import { Component, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectionStrategy, computed } from '@angular/core';
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

import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { AdminActions } from '../../data-access/store/admin.actions';
import { 
  selectGatewayHealth, 
  selectGatewayRoutes, 
  selectGatewayBlockedIps, 
  selectGatewayLogs, 
  selectGatewayStats,
  selectGatewayLoading
} from '../../data-access/store/admin.selectors';
import { RouteMap } from '../../data-access/admin-gateway.service';

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
import { filter, take } from 'rxjs/operators';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminGatewayPage implements OnInit, OnDestroy {
  private location = inject(Location);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private toastSvc = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  public services = this.store.selectSignal(selectGatewayHealth);
  public routes = this.store.selectSignal(selectGatewayRoutes);
  public blockedIps = this.store.selectSignal(selectGatewayBlockedIps);
  public logs = this.store.selectSignal(selectGatewayLogs);
  public stats = this.store.selectSignal(selectGatewayStats);
  public isLoading = this.store.selectSignal(selectGatewayLoading);

  // local bound variable for input
  public globalRateLimit = 120;

  public totalRequestsToday = computed(() => this.stats()?.totalRequestsToday || 0);
  public whitelistedCount = computed(() => this.stats()?.whitelistedCount || 0);

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
    this.store.dispatch(AdminActions.loadAllTelemetry());
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
    this.store.dispatch(AdminActions.loadAllTelemetry());
    this.toastSvc.showSuccess('Telemetry caches flushed and registry pings updated');
  }

  public startLiveTelemetryPolling() {
    this.pollTimer = setInterval(() => {
      this.store.dispatch(AdminActions.loadGatewayLogs());
      this.store.dispatch(AdminActions.loadGatewayStats());
      this.store.dispatch(AdminActions.loadGatewayHealth());
    }, 15000);
  }

  public toggleRoute(route: RouteMap) {
    const nextState = !route.active;
    this.store.dispatch(AdminActions.toggleRoute({ id: route.id, active: nextState }));
    
    this.actions$.pipe(
      ofType(AdminActions.toggleRouteSuccess),
      filter(action => action.route.id === route.id),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const state = nextState ? 'Activated' : 'Suspended';
      this.toastSvc.showSuccess(`Route proxy targeting ${route.service} ${state}`);
    });
  }

  public unblockIp(ip: string) {
    this.store.dispatch(AdminActions.unblockIP({ ip }));
    
    this.actions$.pipe(
      ofType(AdminActions.unblockIPSuccess),
      filter(action => action.ip === ip),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.toastSvc.showSuccess(`IP address ${ip} whitelisted and unblocked`);
    });
  }

  public testRoute(route: RouteMap) {
    if (!route.active) {
      this.toastSvc.showError(`Cannot ping route map targeting ${route.service}: Proxy has been suspended.`);
      return;
    }
    const currentServices = this.services();
    const targetService = (currentServices || []).find(s => s.name.toLowerCase().includes(route.service.split('-')[0]));
    if (targetService && targetService.status === 'OFFLINE') {
      this.toastSvc.showError(`Gateway timeout (504): Target service ${route.service} is unreachable.`);
      return;
    }
    
    this.store.dispatch(AdminActions.loadGatewayHealth());
    
    this.actions$.pipe(
      ofType(AdminActions.loadGatewayHealthSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ health }) => {
      const probed = health.find(h => h.name.toLowerCase().includes(route.service.split('-')[0]));
      if (probed && probed.status === 'ONLINE') {
        this.toastSvc.showSuccess(`Gateway proxy to ${route.service} verified successfully. [Status: 200 OK, Latency: ${probed.latency}ms]`);
      } else {
        this.toastSvc.showError(`Gateway Timeout (504): Ping failed for target service ${route.service}.`);
      }
    });
  }

  public onRateLimitChange() {
    this.store.dispatch(AdminActions.updateRateLimit({ limit: this.globalRateLimit }));
    
    this.actions$.pipe(
      ofType(AdminActions.updateRateLimitSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.toastSvc.showSuccess(`Dynamic threshold updated: firewall lock triggers at ${this.globalRateLimit} req/min`);
    });
  }
}
