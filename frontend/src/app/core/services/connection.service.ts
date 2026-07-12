import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';

import { AnalyticsService } from './analytics.service';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService implements OnDestroy {
  private ngZone: NgZone = inject(NgZone);
  private analyticsSvc: AnalyticsService = inject(AnalyticsService);

  private online$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true); 

  constructor() {
    void this.initializeNetworkListeners();
  }

  private async initializeNetworkListeners(): Promise<void> {
    const status: ConnectionStatus = await Network.getStatus();
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
      
      void this.analyticsSvc.logEvent('connectivity_change', {
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
    const status: ConnectionStatus = await Network.getStatus();
    this.updateStatus(status.connected);
    return status.connected;
  }

  public ngOnDestroy(): void {
    void Network.removeAllListeners();
  }
}
