import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtpPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private starfieldSvc = inject(StarfieldService);
  private cdr = inject(ChangeDetectorRef);
  private authSvc = inject(AuthService);
  private translationSvc = inject(TranslationService);
  private el = inject(ElementRef);

  @ViewChildren('otpInput') private otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  public otpForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public resendTimer: number = 300;
  public flowContext: string = '';
  private email: string = '';
  public errorMessage: string = '';

  public otpDigits: string[] = ['', '', '', '', '', ''];
  public focusedIndex: number = -1;
  private revealingIndex: number = -1;
  private revealTimeout: ReturnType<typeof setTimeout> | null = null;

  public readonly alertCircleOutline = alertCircleOutline;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private routeSub!: Subscription;

  constructor() {
    addIcons({ alertCircleOutline });
    this.routeSub = this.route.queryParams.subscribe((params: Params) => {
      this.flowContext = (params['flow'] as string) || 'signup';
      this.email = (params['email'] as string) || '';
    });
  }

  public getMaskedEmail(): string {
    if (!this.email) {
      return '';
    }
    const parts = this.email.split('@');
    if (parts.length !== 2) {
      return this.email;
    }
    const [username, domain] = parts;
    if (username.length <= 2) {
      return `${username.charAt(0)}*@${domain}`;
    }
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.slice(-1);
    return `${maskedUsername}@${domain}`;
  }

  public getFormattedTimer(): string {
    const minutes = Math.floor(this.resendTimer / 60);
    const seconds = this.resendTimer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  public ngOnInit(): void {
    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]{6}$')]]
    });
  }

  public ionViewWillEnter(): void {
    const card = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
    const header = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
    if (card) { card.style.opacity = '1'; card.style.transition = 'none'; }
    if (header) { header.style.opacity = '1'; header.style.transition = 'none'; }
    this.isLoading = false;
    this.isSubmitted = false;
    this.otpForm.reset();

    this.otpDigits = ['', '', '', '', '', ''];
    this.cdr.markForCheck();

    this.startResendTimer();

    setTimeout(() => {
      this.focusBox(0);
    }, 400);
  }

  public focusInput(event?: Event): void {
    if (event && event.target !== event.currentTarget) {
      return;
    }
    const firstEmptyIndex = this.otpDigits.findIndex(d => !d);
    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 5;
    this.focusBox(targetIndex);
  }

  public onFocus(index: number): void {
    this.focusedIndex = index;
    const inputElements = this.otpInputs.toArray();
    if (inputElements[index]) {
      inputElements[index].nativeElement.select();
    }
  }

  public onBlur(): void {
    setTimeout(() => {
      if (this.focusedIndex === -1) {
        this.cdr.markForCheck();
      }
    }, 50);
  }

  public onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    val = val.replace(/[^0-9]/g, '');

    if (val.length > 1) {
      val = val.charAt(val.length - 1);
    }

    this.otpDigits[index] = val;
    input.value = val;

    this.updateFormControlValue();

    if (val) {
      this.revealDigit(index);
    }

    if (val && index < 5) {
      this.focusBox(index + 1);
    }
    this.cdr.markForCheck();
  }

  private revealDigit(index: number): void {
    if (this.revealTimeout) {
      clearTimeout(this.revealTimeout);
    }
    this.revealingIndex = index;
    this.cdr.markForCheck();

    this.revealTimeout = setTimeout(() => {
      this.revealingIndex = -1;
      this.cdr.markForCheck();
    }, 300);
  }

  public getDisplayDigit(index: number): string {
    const digit = this.otpDigits[index];
    if (!digit) return '';
    if (this.revealingIndex === index) return digit;
    return '•';
  }

  public onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        this.otpDigits[index - 1] = '';
        this.updateFormControlValue();
        this.focusBox(index - 1);
        event.preventDefault();
      } else {
        this.otpDigits[index] = '';
        this.updateFormControlValue();
      }
      this.cdr.markForCheck();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusBox(index - 1);
      event.preventDefault();
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.focusBox(index + 1);
      event.preventDefault();
    }
  }

  public onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const numericData = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = numericData[i] || '';
    }

    this.updateFormControlValue();

    this.revealingIndex = -1;
    if (this.revealTimeout) clearTimeout(this.revealTimeout);

    const nextFocusIndex = Math.min(numericData.length, 5);
    this.focusBox(nextFocusIndex);
    this.cdr.markForCheck();
  }

  private focusBox(index: number): void {
    const inputElements = this.otpInputs.toArray();
    if (inputElements[index]) {
      inputElements[index].nativeElement.focus();
      this.focusedIndex = index;
    }
  }

  private updateFormControlValue(): void {
    const combinedCode = this.otpDigits.join('');
    this.otpForm.get('code')?.setValue(combinedCode);
    this.otpForm.get('code')?.markAsDirty();
  }

  private startResendTimer(): void {
    this.resendTimer = 300;
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
      this.errorMessage = '';
      this.cdr.markForCheck();

      const request$ = this.flowContext === 'reset'
        ? this.authSvc.requestForgotPasswordOtp(this.email)
        : this.authSvc.requestOtp(this.email);

      request$.subscribe({
        next: () => {
          this.startResendTimer();
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.errorMessage = err.message || this.translationSvc.translate('OTP.ERROR_DEFAULT');
          this.cdr.markForCheck();
        }
      });
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
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.otpForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      const code = this.otpForm.get('code')?.value as string;

      if (this.flowContext === 'reset') {
        this.authSvc.verifyForgotPasswordOtp(this.email, code).subscribe({
          next: () => {
            this.isLoading = false;
            this.cdr.markForCheck();

            const card = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
            const header = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
            if (card) { card.style.transition = 'opacity 1s'; card.style.opacity = '0'; }
            if (header) { header.style.transition = 'opacity 1s'; header.style.opacity = '0'; }

            this.navCtrl.navigateRoot('/reset-password', {
              queryParams: { email: this.email, code: code },
              animation: this.getCrossfadeAnimation()
            });
          },
          error: (err: Error) => {
            this.isLoading = false;
            this.errorMessage = err.message || this.translationSvc.translate('OTP.ERROR_DEFAULT');
            this.cdr.markForCheck();
          }
        });
      } else {
        this.authSvc.verifyOtp(this.email, code).subscribe({
          next: () => {
            this.isLoading = false;
            this.cdr.markForCheck();

            const card = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
            const header = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
            if (card) { card.style.transition = 'opacity 1s'; card.style.opacity = '0'; }
            if (header) { header.style.transition = 'opacity 1s'; header.style.opacity = '0'; }

            setTimeout(() => {
              this.navCtrl.navigateRoot('/login', {
                animation: this.getCrossfadeAnimation()
              });
            }, 1000);
          },
          error: (err: Error) => {
            this.isLoading = false;
            this.errorMessage = err.message || this.translationSvc.translate('OTP.ERROR_DEFAULT');
            this.cdr.markForCheck();
          }
        });
      }
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
