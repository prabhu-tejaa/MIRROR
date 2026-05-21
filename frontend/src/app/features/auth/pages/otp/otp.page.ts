import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.page.html',
  styleUrls: ['./otp.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonButton, IonSpinner, TranslatePipe],
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

  @ViewChildren('otpInput') public otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  public otpForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public resendTimer: number = 30;
  public flowContext: string = '';
  public email: string = '';

  public otpDigits: string[] = ['', '', '', '', '', ''];
  public focusedIndex: number = -1;
  public revealingIndex: number = -1;
  private revealTimeout: ReturnType<typeof setTimeout> | null = null;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private routeSub!: Subscription;

  constructor() {
    this.routeSub = this.route.queryParams.subscribe((params: Params) => {
      this.flowContext = (params['flow'] as string) || 'signup';
      this.email = (params['email'] as string) || '';
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
          this.authSvc.login(this.email || 'new_user@mirror.com');
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
