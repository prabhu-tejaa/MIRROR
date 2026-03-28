import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation, AlertController } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner, IonIcon, IonCheckbox } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';


@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, IonIcon, IonCheckbox, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

  signupForm!: FormGroup;
  isSubmitted = false;
  isLoading = false;
  showPassword = false;

  constructor() {
    addIcons({ eye, eyeOff });
  }

  ngOnInit() {
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.pattern('^[a-zA-Z0-9_.-]+$')]],
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'), Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]],
      agreeTos: [false, [Validators.requiredTrue]]
    });
  }

  get f() { return this.signupForm.controls; }

  async openTerms(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const alert = await this.alertCtrl.create({
      header: 'Terms & Privacy Policy',
      message: 'By joining, you agree to our placeholder terms. Ensure you are acting legally and morally on our platform. (Edit these rules later natively here.)',
      buttons: ['I Understand'],
      cssClass: 'premium-alert'
    });
    await alert.present();
  }

  private getCrossfadeAnimation(): any {
    return (baseEl: any, opts?: any): Animation => {
      const rootTransition = this.animationCtrl.create()
        .duration(400)
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

  onSignup() {
    this.isSubmitted = true;
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      setTimeout(() => {
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

  goToLogin() {
    this.navCtrl.navigateBack('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
