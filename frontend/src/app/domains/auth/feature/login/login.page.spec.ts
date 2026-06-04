import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { LoginPage } from './login.page';
import { AuthService } from '../../data-access/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { NavController, AnimationController } from '@ionic/angular';

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
  const analyticsSvcStub = { setUserId: jasmine.createSpy('setUserId'), logEvent: jasmine.createSpy('logEvent') };
  const translationSvcStub = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const starfieldSvcStub = { setShape: jasmine.createSpy('setShape') };
  const navCtrlStub = { navigateRoot: jasmine.createSpy('navigateRoot'), navigateForward: jasmine.createSpy('navigateForward') };
  const animCtrlStub = { create: jasmine.createSpy('create') };

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
