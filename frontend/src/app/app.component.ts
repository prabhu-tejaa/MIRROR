import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, ApplicationRef, HostListener } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { IonApp, IonRouterOutlet, IonContent } from '@ionic/angular/standalone';
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
      const activeElement: HTMLElement = document.activeElement as HTMLElement;
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
