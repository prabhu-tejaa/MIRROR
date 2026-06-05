import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, alertCircleOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { AuthService } from '../../data-access/auth.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private navCtrl: NavController = inject(NavController);
  private animationCtrl: AnimationController = inject(AnimationController);
  private starfieldSvc: StarfieldService = inject(StarfieldService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private analyticsSvc: AnalyticsService = inject(AnalyticsService);
  private authSvc: AuthService = inject(AuthService);
  private translationSvc: TranslationService = inject(TranslationService);
  private el: ElementRef<any> = inject(ElementRef);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public loginForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public errorMessage: string = '';
  private loginSub?: Subscription;
  public readonly eye: string = eye;
  public readonly eyeOff: string = eyeOff;
  public readonly alertCircleOutline: string = alertCircleOutline;

  public showHeartUsername: boolean = false;
  public username: string = '';

  constructor() {
    addIcons({ eye, eyeOff, alertCircleOutline });
  }

  public ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'), Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]]
    });
  }

  public ionViewWillEnter(): void {
    const card: HTMLElement = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
    const header: HTMLElement = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;
    if (card) { card.style.opacity = '1'; card.style.transition = 'none'; }
    if (header) { header.style.opacity = '1'; header.style.transition = 'none'; }
    this.isLoading = false;
    this.isSubmitted = false;
    this.errorMessage = '';
    this.showHeartUsername = false;
    this.username = '';
    this.loginForm.reset();
    this.cdr.markForCheck();
  }

  public ionViewWillLeave(): void {
    if (this.loginSub) {
      this.loginSub.unsubscribe();
      this.loginSub = undefined;
    }
  }

  public get f(): { [key: string]: AbstractControl } {
    return this.loginForm.controls;
  }

  public onLogin(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.loginForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      if (this.loginSub) {
        this.loginSub.unsubscribe();
      }

      const { email, password }: any = this.loginForm.value;

      this.loginSub = this.authSvc.loginUser({ email, password }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          void this.analyticsSvc.setUserId(email);
          this.username = res.username || this.authSvc.getUserId() || '';
          this.showHeartUsername = true;
          this.cdr.markForCheck();

          const card: HTMLElement = this.el.nativeElement.querySelector('.glassy-card') as HTMLElement;
          const header: HTMLElement = this.el.nativeElement.querySelector('.branding-header') as HTMLElement;

          if (card) {
            card.style.transition = 'opacity 1s';
            card.style.opacity = '0';
          }
          if (header) {
            header.style.transition = 'opacity 1s';
            header.style.opacity = '0';
          }

          this.starfieldSvc.setShape('heart');

          setTimeout(() => {
            this.starfieldSvc.setShape('none');
            this.isLoading = false;
            this.cdr.markForCheck();
            void this.navCtrl.navigateRoot('/tabs/chat', {
                            animation: getCrossfadeAnimation(this.animationCtrl)
                          });
          }, 3000);
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMessage = err.message || this.translationSvc.translate('LOGIN.ERROR_DEFAULT');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.cdr.markForCheck();
    }
  }

  public goToSignup(): void {
    void this.navCtrl.navigateForward('/signup', {
            animation: getCrossfadeAnimation(this.animationCtrl)
          });
  }

  public goToForgot(): void {
    void this.navCtrl.navigateForward('/forgot-password', {
            animation: getCrossfadeAnimation(this.animationCtrl)
          });
  }
}
