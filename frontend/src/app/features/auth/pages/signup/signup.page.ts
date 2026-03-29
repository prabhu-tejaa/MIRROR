import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation, AnimationBuilder } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner, IonCheckbox, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, closeOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { AnalyticsService } from '../../../../core/services/analytics.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, IonIcon, IonCheckbox, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private cdr = inject(ChangeDetectorRef);
  private analyticsSvc = inject(AnalyticsService);

  public signupForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public readonly eye = eye;
  public readonly eyeOff = eyeOff;
  public readonly closeOutline = closeOutline;

  constructor() {
    addIcons({ eye, eyeOff, closeOutline });
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

  private getCrossfadeAnimation(): AnimationBuilder {
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

  public onSignup(): void {
    this.isSubmitted = true;
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        // Track User Identity on successful signup
        const email = this.signupForm.get('email')?.value as string;
        if (email) {
          this.analyticsSvc.setUserId(email);
        }

        this.isLoading = false;
        this.cdr.markForCheck();
        this.navCtrl.navigateRoot('/otp', { 
          queryParams: { flow: 'signup' },
          animation: this.getCrossfadeAnimation()
        });
      }, 1500);
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
