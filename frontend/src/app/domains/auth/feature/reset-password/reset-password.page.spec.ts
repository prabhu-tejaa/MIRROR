import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { TranslationService } from '../../../../core/services/translation.service';
import { AuthService } from '../../data-access/auth.service';


import { ResetPasswordPage } from './reset-password.page';

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ComponentFixture<ResetPasswordPage>;

  const navCtrlSpy: any = jasmine.createSpyObj('NavController', ['navigateRoot', 'navigateForward', 'navigateBack']);
  const animCtrlSpy: any = jasmine.createSpyObj('AnimationController', ['create']);
  const authSvcSpy: any = jasmine.createSpyObj('AuthService', ['resetPassword']);
  const translationSvcSpy: any = jasmine.createSpyObj('TranslationService', ['translate']);
  translationSvcSpy.translate.and.returnValue('');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ResetPasswordPage,
        ReactiveFormsModule
      ],
      providers: [
        provideIonicAngular(),
        { provide: NavController, useValue: navCtrlSpy },
        { provide: AnimationController, useValue: animCtrlSpy },
        { provide: AuthService, useValue: authSvcSpy },
        { provide: TranslationService, useValue: translationSvcSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ email: 'test@example.com' })
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.resetForm).toBeDefined();
  });
});