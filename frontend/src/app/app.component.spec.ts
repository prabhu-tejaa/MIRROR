import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ConnectionService } from './core/services/connection.service';
import { AnalyticsService } from './core/services/analytics.service';
import { HttpCancelService } from './core/services/http-cancel.service';
import { PresenceService } from './core/services/presence.service';
import { BehaviorSubject } from 'rxjs';

describe('AppComponent', () => {
  it('should create the app', async () => {
    const connectionSvcStub = {
      isOnline$: new BehaviorSubject<boolean>(true).asObservable()
    };
    const analyticsSvcStub = { logEvent: jasmine.createSpy('logEvent') };
    const httpCancelSvcStub = { cancelPendingRequests: jasmine.createSpy() };
    const presenceSvcStub = {};

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
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
