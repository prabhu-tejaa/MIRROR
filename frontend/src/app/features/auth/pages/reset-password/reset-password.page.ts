import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NavController, AnimationController, Animation } from '@ionic/angular';
import { IonContent, IonInput, IonButton, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { strictPasswordValidator } from '../../../../shared/validators/password.validator';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, ReactiveFormsModule, IonInput, IonButton, IonSpinner, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private navCtrl = inject(NavController);
  private animationCtrl = inject(AnimationController);
  private cdr = inject(ChangeDetectorRef);

  public resetForm!: FormGroup;
  public isSubmitted: boolean = false;
  public isLoading: boolean = false;
  public showPassword: boolean = false;
  public readonly eye = eye;
  public readonly eyeOff = eyeOff;

  constructor() {
    addIcons({ eye, eyeOff });
  }

  public ngOnInit(): void {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), strictPasswordValidator]]
    });
  }

  public get f(): { [key: string]: AbstractControl } { 
    return this.resetForm.controls; 
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

  public onReset(): void {
    this.isSubmitted = true;
    if (this.resetForm.valid) {
      this.isLoading = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
        
        this.navCtrl.navigateRoot('/login', { 
          animation: this.getCrossfadeAnimation()
        });
      }, 1500);
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
