import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter , ActivatedRoute } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { TranslationService } from '../../../../core/services/translation.service';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { AuthService } from '../../data-access/auth.service';

import { OtpPage } from './otp.page';


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
  const translationSvcStub: { translate: jasmine.Spy<jasmine.Func>; } = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const starfieldSvcStub: { setShape: jasmine.Spy<jasmine.Func>; } = { setShape: jasmine.createSpy('setShape') };
  const navCtrlStub: { navigateRoot: jasmine.Spy<jasmine.Func>; navigateForward: jasmine.Spy<jasmine.Func>; } = { navigateRoot: jasmine.createSpy('navigateRoot'), navigateForward: jasmine.createSpy('navigateForward') };
  const animCtrlStub: { create: jasmine.Spy<jasmine.Func>; } = { create: jasmine.createSpy('create') };

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
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
