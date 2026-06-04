import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { SignupPage } from './signup.page';
import { AuthService } from '../../data-access/auth.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { NavController, AnimationController } from '@ionic/angular';

describe('SignupPage', () => {
  let component: SignupPage;
  let fixture: ComponentFixture<SignupPage>;

  const authSvcStub = {
    signup: jasmine.createSpy('signup'),
    requestOtp: jasmine.createSpy('requestOtp'),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    logout: jasmine.createSpy('logout'),
  };
  const analyticsSvcStub = { setUserId: jasmine.createSpy('setUserId'), logEvent: jasmine.createSpy('logEvent') };
  const translationSvcStub = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const navCtrlStub = { navigateRoot: jasmine.createSpy('navigateRoot'), navigateBack: jasmine.createSpy('navigateBack') };
  const animCtrlStub = { create: jasmine.createSpy('create') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: AnalyticsService, useValue: analyticsSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AnimationController, useValue: animCtrlStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
