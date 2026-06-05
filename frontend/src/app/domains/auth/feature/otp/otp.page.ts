import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { AuthService } from '../../data-access/auth.service';


@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtpPage implements OnInit, OnDestroy {
  private fb: FormBuilder = inject(FormBuilder);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private navCtrl: NavController = inject(NavController);
  private animationCtrl: AnimationController = inject(AnimationController);
  private starfieldSvc: StarfieldService = inject(StarfieldService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private authSvc: AuthService = inject(AuthService);
  private translationSvc: TranslationService = inject(TranslationService);
  private el: ElementRef<any> = inject(ElementRef);
  private destroyRef: DestroyRef = inject(DestroyRef);

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

  public readonly alertCircleOutline: string = alertCircleOutline;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private routeSub!: Subscription;

  constructor() {
    addIcons({ alertCircleOutline });
    this.routeSub = this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      this.flowContext = (params['flow'] as string) || 'signup';
      this.email = (params['email'] as string) || '';
    });
  }

  public getMaskedEmail(): string {
    if (!this.email) {
      return '';
    }
    const parts: string[] = this.email.split('@');
    if (parts.length !== 2) {
      return this.email;
    }
    const [username, domain] = parts;
    if (username.length <= 2) {
      return `${username.charAt(0)}*@${domain}`;
    }
    const maskedUsername: string = username.charAt(0) + '*'.repeat(username.length - 2) + username.slice(-1);
    return `${maskedUsername}@${domain}`;
  }

  public getFormattedTimer(): string {
    const minutes: number = Math.floor(this.resendTimer / 60);
    const seconds: number = this.resendTimer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  public ngOnInit(): void {
    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]{6}$')]]
    });
  }

  public ionViewWillEnter(): void {
    const card: HTMLElement = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
    const header: HTMLElement = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
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
    const firstEmptyIndex: number = this.otpDigits.findIndex((d: string) => !d);
    const targetIndex: number = firstEmptyIndex !== -1 ? firstEmptyIndex : 5;
    this.focusBox(targetIndex);
  }

  public onFocus(index: number): void {
    this.focusedIndex = index;
    const inputElements: ElementRef<HTMLInputElement>[] = this.otpInputs.toArray();
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
    const input: HTMLInputElement = event.target as HTMLInputElement;
    let val: string = input.value;

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

    if (this.otpForm.valid && !this.isLoading) {
      this.onVerify();
    }
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
    const digit: string = this.otpDigits[index];
    if (!digit) {return '';}
    if (this.revealingIndex === index) {return digit;}
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
    const pastedData: string = event.clipboardData?.getData('text') || '';
    const numericData: string = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    for (let i: number = 0; i < 6; i++) {
      this.otpDigits[i] = numericData[i] || '';
    }

    this.updateFormControlValue();

    this.revealingIndex = -1;
    if (this.revealTimeout) {clearTimeout(this.revealTimeout);}

    const nextFocusIndex: number = Math.min(numericData.length, 5);
    this.focusBox(nextFocusIndex);
    this.cdr.markForCheck();

    if (this.otpForm.valid && !this.isLoading) {
      this.onVerify();
    }
  }

  private focusBox(index: number): void {
    const inputElements: ElementRef<HTMLInputElement>[] = this.otpInputs.toArray();
    if (inputElements[index]) {
      inputElements[index].nativeElement.focus();
      this.focusedIndex = index;
    }
  }

  private updateFormControlValue(): void {
    const combinedCode: string = this.otpDigits.join('');
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

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  public onVerify(): void {
    if (this.isLoading) {return;}
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.otpForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      const code: string = this.otpForm.get('code')?.value as string;

      if (this.flowContext === 'reset') {
        this.authSvc.verifyForgotPasswordOtp(this.email, code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (token: string) => {
            const card: HTMLElement = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
            const header: HTMLElement = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
            if (card) { card.style.transition = 'opacity 1s'; card.style.opacity = '0'; }
            if (header) { header.style.transition = 'opacity 1s'; header.style.opacity = '0'; }

            setTimeout(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
              void this.navCtrl.navigateRoot('/reset-password', {
                                queryParams: { email: this.email, token: token },
                                animation: getCrossfadeAnimation(this.animationCtrl)
                              });
            }, 1000);
          },
          error: (err: Error) => {
            this.isLoading = false;
            this.errorMessage = err.message || this.translationSvc.translate('OTP.ERROR_DEFAULT');
            this.cdr.markForCheck();
          }
        });
      } else {
        this.authSvc.verifyOtp(this.email, code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            const card: HTMLElement = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
            const header: HTMLElement = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
            if (card) { card.style.transition = 'opacity 1s'; card.style.opacity = '0'; }
            if (header) { header.style.transition = 'opacity 1s'; header.style.opacity = '0'; }

            setTimeout(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
              void this.navCtrl.navigateRoot('/login', {
                                animation: getCrossfadeAnimation(this.animationCtrl)
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
    void this.navCtrl.navigateRoot('/login', {
            animation: getCrossfadeAnimation(this.animationCtrl)
          });
  }

  public get maskedEmailValue() { return this.getMaskedEmail(); }
  public get formattedTimerValue() { return this.getFormattedTimer(); }
  public get displayDigitsValue() { return this.otpDigits.map((_, i) => this.getDisplayDigit(i)); }
}
