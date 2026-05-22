import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonNote,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline, informationCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonNote,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  private authSvc = inject(AuthService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private translationSvc = inject(TranslationService);

  public readonly userId = computed(() => this.authSvc.getUserId() ?? 'User');
  public readonly userEmail = computed(() => this.authSvc.getEmail() ?? 'Email');

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
            this.navCtrl.navigateRoot('/login');
          }
        }
      ]
    });

    await alert.present();
  }

  public async onShowAbout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translationSvc.translate('PROFILE.ABOUT_ALERT_HEADER'),
      message: this.translationSvc.translate('PROFILE.ABOUT_ALERT_MESSAGE'),
      cssClass: 'mirror-alert about-alert',
      buttons: [
        {
          text: this.translationSvc.translate('PROFILE.ABOUT_ALERT_CLOSE'),
          role: 'cancel',
          cssClass: 'alert-close-btn'
        }
      ]
    });

    await alert.present();
  }
}
