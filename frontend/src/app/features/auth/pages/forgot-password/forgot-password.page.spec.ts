import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { ForgotPasswordPage } from './forgot-password.page';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { NavController, AnimationController } from '@ionic/angular';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;

  const authSvcStub = {
    requestForgotPasswordOtp: jasmine.createSpy('requestForgotPasswordOtp'),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
  };
  const translationSvcStub = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const navCtrlStub = { navigateForward: jasmine.createSpy('navigateForward'), navigateBack: jasmine.createSpy('navigateBack') };
  const animCtrlStub = { create: jasmine.createSpy('create') };

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
