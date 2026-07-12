import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../data-access/auth.service';

import { ForgotPasswordPage } from './forgot-password.page';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;

  const authSvcStub: { requestForgotPasswordOtp: jasmine.Spy<jasmine.Func>; isAuthenticated: jasmine.Spy<jasmine.Func>; } = {
    requestForgotPasswordOtp: jasmine.createSpy('requestForgotPasswordOtp'),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
  };
  const translationSvcStub: { translate: jasmine.Spy<jasmine.Func>; } = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const navCtrlStub: { navigateForward: jasmine.Spy<jasmine.Func>; navigateBack: jasmine.Spy<jasmine.Func>; } = { navigateForward: jasmine.createSpy('navigateForward'), navigateBack: jasmine.createSpy('navigateBack') };
  const animCtrlStub: { create: jasmine.Spy<jasmine.Func>; } = { create: jasmine.createSpy('create') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AnimationController, useValue: animCtrlStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
