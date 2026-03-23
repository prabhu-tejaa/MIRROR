import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';

export function passwordsMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;
  
  if (confirmPassword.errors && !confirmPassword.errors['mismatch']) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ mismatch: true });
    return { mismatch: true };
  } else {
    confirmPassword.setErrors(null);
    return null;
  }
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, IonIcon]
})
export class ResetPasswordPage implements OnInit {
  resetForm!: FormGroup;
  isSubmitted = false;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private animationCtrl: AnimationController
  ) {
    addIcons({ eye, eyeOff });
  }

  ngOnInit() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: passwordsMatchValidator 
    });
  }

  get f() { return this.resetForm.controls; }

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
    if (this.resetForm.valid) {
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false;
        // Password fully reset! Boot immediately back into Login 
        this.navCtrl.navigateRoot('/login', { 
          animation: this.getCrossfadeAnimation()
        });
      }, 1500);
    }
  }

  goToLogin() {
    this.navCtrl.navigateRoot('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
