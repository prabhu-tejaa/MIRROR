import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { NavController, AnimationController } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff, alertCircleOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';
import { getCrossfadeAnimation } from '../../../../shared/utils/animations';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private cdr = inject(ChangeDetectorRef);
  private authSvc = inject(AuthService);
  private translationSvc = inject(TranslationService);

  public resetForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public errorMessage: string = '';
  public readonly eye = eye;
  public readonly eyeOff = eyeOff;
  public readonly alertCircleOutline = alertCircleOutline;

  private email: string = '';

  constructor() {
    addIcons({ eye, eyeOff, alertCircleOutline });
    this.route.queryParams.subscribe((params: Params) => {
      this.email = (params['email'] as string) || '';
    });
  }

  public ngOnInit(): void {
    if (!this.email) {
      this.navCtrl.navigateRoot('/forgot-password');
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

      const { password } = this.resetForm.value;

      this.authSvc.resetPassword(this.email, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.navCtrl.navigateRoot('/login', { 
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
    this.navCtrl.navigateRoot('/login', { 
      animation: getCrossfadeAnimation(this.animationCtrl) 
    });
  }
}
