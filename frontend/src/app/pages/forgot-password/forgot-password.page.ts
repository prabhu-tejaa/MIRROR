import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private cdr = inject(ChangeDetectorRef);

  forgotForm!: FormGroup;
  isSubmitted = false;
  isLoading = false;
  ngOnInit() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotForm.controls; }

  private getCrossfadeAnimation(): any {
    return (baseEl: any, opts?: any): Animation => {
      const rootTransition = this.animationCtrl.create()
        .duration(800)
        .easing('ease-in-out');

      if (opts.enteringEl) {
        const enteringAnimation = this.animationCtrl.create()
          .addElement(opts.enteringEl)
          .fromTo('opacity', 0, 1);
        rootTransition.addAnimation(enteringAnimation);
      }

      if (opts.leavingEl) {
        const leavingAnimation = this.animationCtrl.create()
          .addElement(opts.leavingEl)
          .fromTo('opacity', 1, 0);
        rootTransition.addAnimation(leavingAnimation);
      }

      return rootTransition;
    };
  }

  onReset() {
    this.isSubmitted = true;
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      
      const emailValue = this.forgotForm.value.email;

      setTimeout(() => {
        this.isLoading = false;
        this.cdr.markForCheck();

        if (emailValue.toLowerCase() === 'none@mirror.com') {
          this.forgotForm.controls['email'].setErrors({ notFound: true });
        } else {
          this.navCtrl.navigateForward('/otp', {
            queryParams: { flow: 'reset' },
            animation: this.getCrossfadeAnimation()
          });
        }
      }, 1500);
    } else {
      this.cdr.markForCheck();
    }
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
