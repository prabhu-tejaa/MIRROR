import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonCheckbox, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, closeOutline, alertCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { AuthService } from '../../data-access/auth.service';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, IonCheckbox, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupPage implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private navCtrl: NavController = inject(NavController);
  private animationCtrl: AnimationController = inject(AnimationController);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private analyticsSvc: AnalyticsService = inject(AnalyticsService);
  private authSvc: AuthService = inject(AuthService);
  private translationSvc: TranslationService = inject(TranslationService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public signupForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public errorMessage: string = '';
  public readonly eye: string = eye;
  public readonly eyeOff: string = eyeOff;
  public readonly closeOutline: string = closeOutline;
  public readonly alertCircleOutline: string = alertCircleOutline;
  public readonly shieldCheckmarkOutline: string = shieldCheckmarkOutline;

  constructor() {
    addIcons({ eye, eyeOff, closeOutline, alertCircleOutline, shieldCheckmarkOutline });
  }

  public ngOnInit(): void {
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.pattern('^[a-zA-Z0-9_.-]+$')]],
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'), Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]],
      agreeTos: [false, [Validators.requiredTrue]]
    });
  }

  public get f(): { [key: string]: AbstractControl } { 
    return this.signupForm.controls; 
  }

  public onSignup(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.signupForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      const { username, email, password }: any = this.signupForm.value;

      this.authSvc.signup({ username, email, password }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response: string) => {
          void this.analyticsSvc.setUserId(email);
          
          this.authSvc.requestOtp(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.isLoading = false;
              this.cdr.markForCheck();
              void this.navCtrl.navigateRoot('/otp', { 
                                  queryParams: { flow: 'signup', email: email },
                                  animation: getCrossfadeAnimation(this.animationCtrl)
                                });
            },
            error: (err: Error) => {
              this.isLoading = false;
              this.errorMessage = err.message || this.translationSvc.translate('SIGNUP.ERROR_DEFAULT');
              this.cdr.markForCheck();
            }
          });
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMessage = err.message || this.translationSvc.translate('SIGNUP.ERROR_DEFAULT');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.cdr.markForCheck();
    }
  }

  public goToLogin(): void {
    void this.navCtrl.navigateBack('/login', { 
            animation: getCrossfadeAnimation(this.animationCtrl) 
          });
  }
}
