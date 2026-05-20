import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonNote,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonNote,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage {
  private authSvc = inject(AuthService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);

  public readonly userId = computed(() => this.authSvc.getUserId() ?? 'User');

  constructor() {
    addIcons({ logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline });
  }

  public async onLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out?',
      cssClass: 'mirror-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
        {
          text: 'Log Out',
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
}
