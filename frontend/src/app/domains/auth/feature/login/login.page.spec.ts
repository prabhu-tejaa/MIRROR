import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { AuthService } from '../../data-access/auth.service';

import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  const authSvcStub = {
    loginUser: jasmine.createSpy('loginUser'),
    getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
    getEmail: jasmine.createSpy('getEmail').and.returnValue(null),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    logout: jasmine.createSpy('logout'),
  };
  const analyticsSvcStub: { setUserId: jasmine.Spy<jasmine.Func>; logEvent: jasmine.Spy<jasmine.Func>; } = { setUserId: jasmine.createSpy('setUserId'), logEvent: jasmine.createSpy('logEvent') };
  const translationSvcStub: { translate: jasmine.Spy<jasmine.Func>; } = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const starfieldSvcStub: { setShape: jasmine.Spy<jasmine.Func>; } = { setShape: jasmine.createSpy('setShape') };
  const navCtrlStub: { navigateRoot: jasmine.Spy<jasmine.Func>; navigateForward: jasmine.Spy<jasmine.Func>; } = { navigateRoot: jasmine.createSpy('navigateRoot'), navigateForward: jasmine.createSpy('navigateForward') };
  const animCtrlStub: { create: jasmine.Spy<jasmine.Func>; } = { create: jasmine.createSpy('create') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: AnalyticsService, useValue: analyticsSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
        { provide: StarfieldService, useValue: starfieldSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AnimationController, useValue: animCtrlStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
