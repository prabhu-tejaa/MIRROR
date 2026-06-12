import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, ApplicationRef, HostListener, signal } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { IonApp, IonRouterOutlet, IonContent, Platform } from '@ionic/angular/standalone';
import { Observable , map, filter } from 'rxjs';



import { AnalyticsService } from './core/services/analytics.service';
import { ConnectionService } from './core/services/connection.service';
import { HttpCancelService } from './core/services/http-cancel.service';
import { PresenceService } from './core/services/presence.service';
import { NoInternetComponent } from './shared/no-internet/no-internet.component';
import { ScrollAssistantComponent } from './shared/scroll-assistant/scroll-assistant.component';
import { StarfieldComponent } from './shared/starfield/starfield.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    StarfieldComponent,
    NoInternetComponent,
    ScrollAssistantComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private connectionService: ConnectionService = inject(ConnectionService);
  private analyticsService: AnalyticsService = inject(AnalyticsService);
  private httpCancelService: HttpCancelService = inject(HttpCancelService);
  private presenceService: PresenceService = inject(PresenceService);
  private router: Router = inject(Router);
  
  public isOffline$: Observable<boolean> = this.connectionService.isOnline$.pipe(
    map((online: boolean) => !online)
  );

  private appRef: ApplicationRef = inject(ApplicationRef);
  private platform: Platform = inject(Platform);

  public isAppReady: import('@angular/core').WritableSignal<boolean> = signal<boolean>(false);

  @HostListener('document:visibilitychange')
  public onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.appRef.tick();
    }
  }

  constructor() {
    this.platform.backButton.subscribeWithPriority(9999, () => {
      // Completely restrict hardware back button across the entire app
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      const activeElement: HTMLElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
    });

    this.initializeApp();
  }

  private initializeApp(): void {
    void this.platform.ready().then(() => {
      const delay = this.platform.is('capacitor') ? 2000 : 0;
      setTimeout(() => {
        void SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {
          // Ignored
        }).then(() => {
          // Trigger the cinematic reveal animation when splash is hidden
          this.isAppReady.set(true);
          void this.checkPreviousCrashes();
        });
      }, delay);
    });
  }

  private getPreviousCrashMessage(): { time: string, message: string, stack: string } | null {
    const keys: string[] = ['mirror_last_crash_native', 'mirror_last_crash_promise', 'mirror_last_crash'];
    for (const key of keys) {
      const data: string | null = localStorage.getItem(key);
      if (data) {
        localStorage.removeItem(key);
        return JSON.parse(data) as { time: string, message: string, stack: string };
      }
    }
    return null;
  }

  private async checkPreviousCrashes(): Promise<void> {
    try {
      const crashMsg: { time: string, message: string, stack: string } | null = this.getPreviousCrashMessage();
      if (crashMsg?.message) {
        const { AlertController } = await import('@ionic/angular/standalone');
        const alertCtrl: import('@ionic/angular/standalone').AlertController = this.appRef.injector.get(AlertController);
        const formattedTime = new Date(crashMsg.time).toLocaleString();
        const alert: HTMLIonAlertElement = await alertCtrl.create({
          header: 'System Recovered',
          subHeader: `Crash occurred at ${formattedTime}`,
          message: `<div style="text-align: left; margin-bottom: 12px; font-weight: 600; font-size: 14px; color: #ff6b6b;">${crashMsg.message}</div><div style="text-align: left; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-word; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; max-height: 180px; overflow-y: auto; border: 1px solid rgba(255,107,107,0.2); opacity: 0.85;">${crashMsg.stack}</div>`,
          buttons: [{ text: 'Dismiss', role: 'cancel' }],
          cssClass: 'premium-alert'
        });
        await alert.present();
      }
    } catch {
      // Ignore
    }
  }

  public handleGlobalRefresh(_event: Event): void {
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}
