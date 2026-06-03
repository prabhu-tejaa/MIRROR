import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { OtpPage } from './otp.page';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { NavController, AnimationController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('OtpPage', () => {
  let component: OtpPage;
  let fixture: ComponentFixture<OtpPage>;

  const authSvcStub = {
    requestOtp: jasmine.createSpy('requestOtp'),
    verifyOtp: jasmine.createSpy('verifyOtp'),
    requestForgotPasswordOtp: jasmine.createSpy('requestForgotPasswordOtp'),
    verifyForgotPasswordOtp: jasmine.createSpy('verifyForgotPasswordOtp'),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
  };
  const translationSvcStub = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const starfieldSvcStub = { setShape: jasmine.createSpy('setShape') };
  const navCtrlStub = { navigateRoot: jasmine.createSpy('navigateRoot'), navigateForward: jasmine.createSpy('navigateForward') };
  const animCtrlStub = { create: jasmine.createSpy('create') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
        { provide: StarfieldService, useValue: starfieldSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AnimationController, useValue: animCtrlStub },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ flow: 'signup', email: 'test@example.com' }) }
        },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OtpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // OTP page starts a timer — clear it to avoid leaking intervals
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
