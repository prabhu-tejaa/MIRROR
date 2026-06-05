import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';

import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { AuthService } from '../../data-access/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPage implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private navCtrl: NavController = inject(NavController);
  private animationCtrl: AnimationController = inject(AnimationController);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private authSvc: AuthService = inject(AuthService);
  private translationSvc: TranslationService = inject(TranslationService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public forgotForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public errorMessage: string = '';
  public readonly alertCircleOutline: string = alertCircleOutline;

  constructor() {
    addIcons({ alertCircleOutline });
  }

  public ngOnInit(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'), Validators.maxLength(254)]]
    });
  }

  public get f(): { [key: string]: AbstractControl } { 
    return this.forgotForm.controls; 
  }

  public onReset(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      
      const emailValue: string = this.forgotForm.value.email as string;

      this.authSvc.requestForgotPasswordOtp(emailValue).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          void this.navCtrl.navigateForward('/otp', {
                          queryParams: { flow: 'reset', email: emailValue },
                          animation: getCrossfadeAnimation(this.animationCtrl)
                        });
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMessage = err.message || this.translationSvc.translate('FORGOT_PASSWORD.ERROR_DEFAULT');
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
