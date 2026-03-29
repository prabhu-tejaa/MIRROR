import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtpPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private starfieldSvc = inject(StarfieldService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('hiddenInput') private hiddenInput!: IonInput;
  
  public otpForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public resendTimer: number = 30;
  public flowContext: string = '';
  
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private routeSub!: Subscription;

  constructor() {
    this.routeSub = this.route.queryParams.subscribe((params: Params) => {
      this.flowContext = (params['flow'] as string) || 'signup';
    });
  }

  public ngOnInit(): void {
    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]{6}$')]]
    });
  }

  public ionViewWillEnter(): void {
    const card = document.querySelector('.glassy-card') as HTMLElement;
    const header = document.querySelector('.branding-header') as HTMLElement;
    if (card) { card.style.opacity = '1'; card.style.transition = 'none'; }
    if (header) { header.style.opacity = '1'; header.style.transition = 'none'; }
    this.isLoading = false;
    this.isSubmitted = false;
    this.otpForm.reset();
    this.cdr.markForCheck();
    
    this.startResendTimer();
  }

  public focusInput(): void {
    if (this.hiddenInput) {
      this.hiddenInput.setFocus();
    }
  }

  public startResendTimer(): void {
    this.resendTimer = 30;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      this.cdr.markForCheck();
      if (this.resendTimer <= 0) {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
      }
    }, 1000);
  }

  public resendCode(): void {
    if (this.resendTimer === 0) {
      this.startResendTimer();
    }
  }

  public ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  public get f(): { [key: string]: AbstractControl } { 
    return this.otpForm.controls; 
  }

  public get currentLength(): number {
    const val = this.otpForm.get('code')?.value as string;
    return val ? val.toString().length : 0;
  }

  public getDigit(index: number): string {
    const val = this.otpForm.get('code')?.value as string;
    if (!val) return '';
    return val.toString()[index] || '';
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

  public onVerify(): void {
    this.isSubmitted = true;
    if (this.otpForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
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
          this.starfieldSvc.setShape('heart');
          setTimeout(() => {
            this.starfieldSvc.setShape('none');
            this.navCtrl.navigateRoot('/tabs/you', { 
              animation: this.getCrossfadeAnimation()
            });
          }, 3000);
        }
      }, 1000);
    } else {
      this.cdr.markForCheck();
    }
  }

  public goToLogin(): void {
    this.navCtrl.navigateRoot('/login', { 
      animation: this.getCrossfadeAnimation() 
    });
  }
}
