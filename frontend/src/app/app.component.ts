import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StarfieldComponent } from './shared/starfield/starfield.component';
import { NoInternetComponent } from './shared/no-internet/no-internet.component';
import { ScrollAssistantComponent } from './shared/scroll-assistant/scroll-assistant.component';
import { ConnectionService } from './core/services/connection.service';
import { AnalyticsService } from './core/services/analytics.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { TranslatePipe } from './shared/pipes/translate.pipe';

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
  
  public isOffline$: Observable<boolean> = this.connectionService.isOnline$.pipe(
    map(online => !online)
  );

  constructor() {
  }
}
