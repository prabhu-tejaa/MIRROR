import { Component, inject, ChangeDetectionStrategy, ApplicationRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart } from '@angular/router';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet, IonContent } from '@ionic/angular/standalone';
import { StarfieldComponent } from './shared/starfield/starfield.component';
import { NoInternetComponent } from './shared/no-internet/no-internet.component';
import { ScrollAssistantComponent } from './shared/scroll-assistant/scroll-assistant.component';

import { ConnectionService } from './core/services/connection.service';
import { AnalyticsService } from './core/services/analytics.service';
import { HttpCancelService } from './core/services/http-cancel.service';
import { PresenceService } from './core/services/presence.service';

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
  private connectionService = inject(ConnectionService);
  private analyticsService = inject(AnalyticsService);
  private httpCancelService = inject(HttpCancelService);
  private presenceService = inject(PresenceService);
  private router = inject(Router);
  
  public isOffline$: Observable<boolean> = this.connectionService.isOnline$.pipe(
    map(online => !online)
  );

  private appRef = inject(ApplicationRef);

  @HostListener('document:visibilitychange')
  public onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.appRef.tick();
    }
  }

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
    });
  }

  public handleGlobalRefresh(_event: Event): void {
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}
