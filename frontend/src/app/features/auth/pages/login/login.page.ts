import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';
import { StarfieldService } from '../../../../shared/starfield/starfield.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private starfieldSvc = inject(StarfieldService);
  private cdr = inject(ChangeDetectorRef);
  private analyticsSvc = inject(AnalyticsService);
  private authSvc = inject(AuthService);

  public loginForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public readonly eye = eye;
  public readonly eyeOff = eyeOff;

  constructor() {
    addIcons({ eye, eyeOff });
  }

  public ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'), Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]]
    });
  }

  public ionViewWillEnter(): void {
    const card = document.querySelector('.glassy-card') as HTMLElement;
    const header = document.querySelector('.branding-header') as HTMLElement;
    if (card) { card.style.opacity = '1'; card.style.transition = 'none'; }
    if (header) { header.style.opacity = '1'; header.style.transition = 'none'; }
    this.isLoading = false;
    this.isSubmitted = false;
    this.loginForm.reset();
    this.cdr.markForCheck();
  }

  public get f(): { [key: string]: AbstractControl } {
    return this.loginForm.controls;
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

  public onLogin(): void {
    this.isSubmitted = true;
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      setTimeout(() => {
        const email = this.loginForm.get('email')?.value as string;
        if (email) {
          this.analyticsSvc.setUserId(email);
          this.authSvc.login(email);
        }

        const card = document.querySelector('.glassy-card') as HTMLElement;
        const header = document.querySelector('.branding-header') as HTMLElement;

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
          this.navCtrl.navigateRoot('/tabs/you', {
            animation: this.getCrossfadeAnimation()
          });
        }, 3000);
      }, 1000);
    } else {
      this.cdr.markForCheck();
    }
  }

  public goToSignup(): void {
    this.navCtrl.navigateForward('/signup', {
      animation: this.getCrossfadeAnimation()
    });
  }

  public goToForgot(): void {
    this.navCtrl.navigateForward('/forgot-password', {
      animation: this.getCrossfadeAnimation()
    });
  }
}
