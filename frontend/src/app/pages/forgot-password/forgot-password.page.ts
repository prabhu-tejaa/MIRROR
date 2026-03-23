import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner]
})
export class ForgotPasswordPage implements OnInit {
  forgotForm!: FormGroup;
  isSubmitted = false;
  isLoading = false;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private animationCtrl: AnimationController
  ) {}

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
      
      const emailValue = this.forgotForm.value.email;

      // Emulate server checking the database
      setTimeout(() => {
        this.isLoading = false;
        
        // Mocking the scenario where an account is missing entirely 
        // using our defined test condition parameters
        if (emailValue.toLowerCase() === 'none@mirror.com') {
          this.forgotForm.controls['email'].setErrors({ notFound: true });
        } else {
          this.emailSent = true;
        }
      }, 1500);
    }
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
