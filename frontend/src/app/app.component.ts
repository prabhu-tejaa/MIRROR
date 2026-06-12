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
    IonContent,
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
    setTimeout(() => {
      void SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {
        // Ignored
      }).then(() => {
        // Trigger the cinematic reveal animation when splash is hidden
        this.isAppReady.set(true);
        void this.checkPreviousCrashes();
      });
    }, 100);
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
        const alert: HTMLIonAlertElement = await alertCtrl.create({
          header: 'Crash Detected',
          subHeader: crashMsg.time,
          message: `${crashMsg.message}\n\n${crashMsg.stack}`,
          buttons: ['OK']
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
