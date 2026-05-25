import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import {
  IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonNote, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline, informationCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { RoleService } from '../../../../core/services/role.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import confetti from 'canvas-confetti';
@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonFooter,
    IonList, IonItem, IonLabel, IonIcon, IonNote,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  private authSvc = inject(AuthService);
  private roleSvc = inject(RoleService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private translationSvc = inject(TranslationService);
  private router = inject(Router);

  public readonly userId = computed(() => this.authSvc.getUserId() ?? 'User');
  public readonly userEmail = computed(() => this.authSvc.getEmail() ?? 'Email');
  public readonly isAdmin = computed(() => this.roleSvc.hasRole('ADMIN'));

  constructor() {
    addIcons({ logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline, informationCircleOutline });
  }

  public async onLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translationSvc.translate('PROFILE.LOGOUT_ALERT_HEADER'),
      message: this.translationSvc.translate('PROFILE.LOGOUT_ALERT_MESSAGE'),
      cssClass: 'mirror-alert',
      buttons: [
        {
          text: this.translationSvc.translate('PROFILE.LOGOUT_ALERT_CANCEL'),
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: this.translationSvc.translate('PROFILE.LOGOUT'),
          role: 'destructive',
          cssClass: 'alert-logout-btn',
          handler: () => {
            this.authSvc.logout();
            this.navCtrl.navigateRoot('/login', { animated: false });
          }
        }
      ]
    });

    await alert.present();
  }

  public navigateToAdmin(): void {
    this.navCtrl.navigateRoot('/admin', { animated: false });
  }

  public async onShowAbout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translationSvc.translate('PROFILE.ABOUT_ALERT_HEADER'),
      message: this.translationSvc.translate('PROFILE.ABOUT_ALERT_MESSAGE'),
      cssClass: 'mirror-alert about-alert',
      buttons: [
        {
          text: this.translationSvc.translate('PROFILE.ABOUT_ALERT_AWESOME'),
          cssClass: 'alert-awesome-btn',
          handler: () => {
            this.fireConfetti();
          }
        }
      ]
    });

    await alert.present();
  }

  private fireConfetti(): void {
    const count = 200;
    const defaults = { origin: { x: 0.5, y: 0.65 } };

    const fire = (particleRatio: number, opts: Record<string, unknown>) => {
      confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * particleRatio) }));
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }
}
