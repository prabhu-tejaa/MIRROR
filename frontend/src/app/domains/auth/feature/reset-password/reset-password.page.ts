import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, alertCircleOutline } from 'ionicons/icons';

import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { AuthService } from '../../data-access/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private navCtrl: NavController = inject(NavController);
  private animationCtrl: AnimationController = inject(AnimationController);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private authSvc: AuthService = inject(AuthService);
  private translationSvc: TranslationService = inject(TranslationService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public resetForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public errorMessage: string = '';
  public readonly eye: string = eye;
  public readonly eyeOff: string = eyeOff;
  public readonly alertCircleOutline: string = alertCircleOutline;

  private email: string = '';
  private token: string = '';

  constructor() {
    addIcons({ eye, eyeOff, alertCircleOutline });
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: Params) => {
      this.email = (params['email'] as string) || '';
      this.token = (params['token'] as string) || '';
    });
  }

  public ngOnInit(): void {
    if (!this.email) {
      void this.navCtrl.navigateRoot('/forgot-password');
      return;
    }
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]]
    });
  }

  public get f(): { [key: string]: AbstractControl } { 
    return this.resetForm.controls; 
  }

  public onReset(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (this.resetForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();

      const { password }: any = this.resetForm.value;

      this.authSvc.resetPassword(this.email, password, this.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          void this.navCtrl.navigateRoot('/login', { 
                          animation: getCrossfadeAnimation(this.animationCtrl)
                        });
        },
        error: (err: Error) => {
          this.isLoading = false;
          this.errorMessage = err.message || this.translationSvc.translate('RESET_PASSWORD.ERROR_DEFAULT');
          this.cdr.markForCheck();
        }
      });
    } else {
      this.cdr.markForCheck();
    }
  }

  public goToLogin(): void {
    void this.navCtrl.navigateRoot('/login', { 
            animation: getCrossfadeAnimation(this.animationCtrl) 
          });
  }
}
