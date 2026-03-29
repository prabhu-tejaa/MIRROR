import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network } from '@capacitor/network';
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

  private async initializeNetworkListeners() {
    const status = await Network.getStatus();
    this.updateStatus(status.connected);

    await Network.addListener('networkStatusChange', status => {
      this.ngZone.run(() => {
        this.updateStatus(status.connected);
      });
    });
  }

  private updateStatus(connected: boolean) {
    if (this.online$.value !== connected) {
      this.online$.next(connected);
      
      // Log Connectivity Change to Analytics
      this.analyticsSvc.logEvent('connectivity_change', {
        is_online: connected
      });
    }
  }

  get isOnline$(): Observable<boolean> {
    return this.online$.asObservable();
  }

  get isOnline(): boolean {
    return this.online$.value;
  }

async checkConnection(): Promise<boolean> {
    const status = await Network.getStatus();
    this.updateStatus(status.connected);
    return status.connected;
  }

  ngOnDestroy(): void {
    Network.removeAllListeners();
  }
}
