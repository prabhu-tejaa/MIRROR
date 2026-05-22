import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private cdr = inject(ChangeDetectorRef);
  private authSvc = inject(AuthService);
  private translationSvc = inject(TranslationService);

  public forgotForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public errorMessage: string = '';
  public readonly alertCircleOutline = alertCircleOutline;

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

  private getCrossfadeAnimation(): (baseEl: HTMLElement, opts?: { enteringEl?: HTMLElement, leavingEl?: HTMLElement }) => Animation {
    return (_baseEl: HTMLElement, opts?: { enteringEl?: HTMLElement, leavingEl?: HTMLElement }): Animation => {
      const rootTransition = this.animationCtrl.create()
        .duration(400)
        .easing('ease-in-out');

      if (opts?.enteringEl) {
        const enteringAnimation = this.animationCtrl.create()
          .addElement(opts.enteringEl)
          .fromTo('opacity', 0, 1);
        rootTransition.addAnimation(enteringAnimation);
      }

      if (opts?.leavingEl) {
        const leavingAnimation = this.animationCtrl.create()
          .addElement(opts.leavingEl)
          .fromTo('opacity', 1, 0);
        rootTransition.addAnimation(leavingAnimation);
      }

      return rootTransition;
    };
  }

  public onReset(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      
      const emailValue = this.forgotForm.value.email as string;

      this.authSvc.requestForgotPasswordOtp(emailValue).subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.navCtrl.navigateForward('/otp', {
            queryParams: { flow: 'reset', email: emailValue },
            animation: this.getCrossfadeAnimation()
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
    this.navCtrl.navigateBack('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
