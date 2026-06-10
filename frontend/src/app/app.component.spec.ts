import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AppComponent } from './app.component';
import { AnalyticsService } from './core/services/analytics.service';
import { ConnectionService } from './core/services/connection.service';
import { HttpCancelService } from './core/services/http-cancel.service';
import { PresenceService } from './core/services/presence.service';

describe('AppComponent', () => {
  it('should create the app', async () => {
    const connectionSvcStub = {
      isOnline$: new BehaviorSubject<boolean>(true).asObservable()
    };
    const analyticsSvcStub: { logEvent: jasmine.Spy<jasmine.Func>; } = { logEvent: jasmine.createSpy('logEvent') };
    const httpCancelSvcStub: { cancelPendingRequests: jasmine.Spy<jasmine.Func>; } = { cancelPendingRequests: jasmine.createSpy() };
    const presenceSvcStub: Record<string, never> = {};

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConnectionService, useValue: connectionSvcStub },
        { provide: AnalyticsService, useValue: analyticsSvcStub },
        { provide: HttpCancelService, useValue: httpCancelSvcStub },
        { provide: PresenceService, useValue: presenceSvcStub },
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const app: AppComponent = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
