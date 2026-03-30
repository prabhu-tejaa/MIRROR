import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network, ConnectionStatus } from '@capacitor/network';
import { AnalyticsService } from './analytics.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private ngZone = inject(NgZone);
  private analyticsSvc = inject(AnalyticsService);

  private online$ = new BehaviorSubject<boolean>(true); 

  constructor() {
    this.initializeNetworkListeners();
  }

  private async initializeNetworkListeners(): Promise<void> {
    const status = await Network.getStatus();
    this.updateStatus(status.connected);

    await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      this.ngZone.run(() => {
        this.updateStatus(status.connected);
      });
    });
  }

  private updateStatus(connected: boolean): void {
    if (this.online$.value !== connected) {
      this.online$.next(connected);
      
      this.analyticsSvc.logEvent('connectivity_change', {
        is_online: connected
      });
    }
  }

  public get isOnline$(): Observable<boolean> {
    return this.online$.asObservable();
  }

  public get isOnline(): boolean {
    return this.online$.value;
  }

  public async checkConnection(): Promise<boolean> {
    const status = await Network.getStatus();
    this.updateStatus(status.connected);
    return status.connected;
  }

  public ngOnDestroy(): void {
    Network.removeAllListeners();
  }
}
