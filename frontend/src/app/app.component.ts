import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StarfieldComponent } from './shared/starfield/starfield.component';
import { NoInternetComponent } from './shared/no-internet/no-internet.component';
import { ScrollAssistantComponent } from './shared/scroll-assistant/scroll-assistant.component';
import { TranslatePipe } from './shared/pipes/translate.pipe';
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
    StarfieldComponent,
    NoInternetComponent,
    ScrollAssistantComponent,
    TranslatePipe
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

  constructor() {
  }
}
