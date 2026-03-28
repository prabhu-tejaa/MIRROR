import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { StarfieldService } from '../../shared/starfield/starfield.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner]
})
export class OtpPage implements OnInit, OnDestroy {
  @ViewChild('hiddenInput') hiddenInput!: IonInput;
  otpForm!: FormGroup;
  isSubmitted = false;
  isLoading = false;
  
  resendTimer = 30;
  private timerInterval: any;
  flowContext: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private animationCtrl: AnimationController,
    private starfieldSvc: StarfieldService
  ) {
    this.route.queryParams.subscribe(params => {
      this.flowContext = params['flow'] || 'signup';
    });
  }

  ngOnInit() {
    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });
  }

  ionViewWillEnter() {
    const card = document.querySelector('.glassy-card') as HTMLElement;
    const header = document.querySelector('.branding-header') as HTMLElement;
    if (card) { card.style.opacity = '1'; card.style.transition = 'none'; }
    if (header) { header.style.opacity = '1'; header.style.transition = 'none'; }
    this.isLoading = false;
    this.isSubmitted = false;
    this.otpForm.reset();
    
    this.startResendTimer();
  }

  focusInput() {
    if (this.hiddenInput) {
      this.hiddenInput.setFocus();
    }
  }

  startResendTimer() {
    this.resendTimer = 30;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  resendCode() {
    if (this.resendTimer === 0) {

this.startResendTimer();
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  get f() { return this.otpForm.controls; }

  get currentLength(): number {
    const val = this.otpForm.get('code')?.value;
    return val ? val.toString().length : 0;
  }

  getDigit(index: number): string {
    const val = this.otpForm.get('code')?.value;
    if (!val) return '';
    return val.toString()[index] || '';
  }

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

  onVerify() {
    this.isSubmitted = true;
    if (this.otpForm.valid) {
      this.isLoading = true;
      setTimeout(() => {
        const card = document.querySelector('.glassy-card') as HTMLElement;
        const header = document.querySelector('.branding-header') as HTMLElement;
        if (card) { card.style.transition = 'opacity 1s'; card.style.opacity = '0'; }
        if (header) { header.style.transition = 'opacity 1s'; header.style.opacity = '0'; }
        
        if (this.flowContext === 'reset') {
          
          this.navCtrl.navigateRoot('/reset-password', {
            animation: this.getCrossfadeAnimation()
          });
        } else {
          
          this.starfieldSvc.formHeart();
          
          setTimeout(() => {
            this.starfieldSvc.disperse();
            
            this.navCtrl.navigateRoot('/tabs/tab1', { 
              animation: this.getCrossfadeAnimation()
            });
          }, 3000);
        }
      }, 1000);
    }
  }

  goToLogin() {
    this.navCtrl.navigateRoot('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
