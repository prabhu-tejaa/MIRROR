import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, computed, Signal } from '@angular/core';
import {
  IonContent, IonFooter,
  IonList, IonItem, IonLabel, IonIcon, IonNote,
  NavController, AlertController
} from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import confetti from 'canvas-confetti';
import { addIcons } from 'ionicons';
import {
  logOutOutline, personCircleOutline, mailOutline,
  shieldCheckmarkOutline, chevronForwardOutline, informationCircleOutline
} from 'ionicons/icons';

import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthService } from '../../auth/data-access/auth.service';
import { selectUserEmail, selectUsername, selectIsAdmin } from '../../auth/data-access/store/auth.selectors';

type ConfettiOpts = Record<string, unknown>;

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
  private authSvc: AuthService = inject(AuthService);
  private store: Store<object> = inject<Store<object>>(Store);
  private navCtrl: NavController = inject(NavController);
  private alertCtrl: AlertController = inject(AlertController);
  private translationSvc: TranslationService = inject(TranslationService);

  public readonly userId: Signal<string> = computed(() => this.store.selectSignal(selectUsername)() ?? 'User');
  public readonly userEmail: Signal<string> = computed(() => this.store.selectSignal(selectUserEmail)() ?? 'Email');
  public readonly isAdmin: Signal<boolean> = this.store.selectSignal(selectIsAdmin);

  constructor() {
    addIcons({ logOutOutline, personCircleOutline, mailOutline, shieldCheckmarkOutline, chevronForwardOutline, informationCircleOutline });
  }

  public async onLogout(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
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
            void this.navCtrl.navigateRoot('/login', { animated: false });
          }
        }
      ]
    });
    await alert.present();
  }

  public navigateToAdmin(): void {
    void this.navCtrl.navigateRoot('/admin', { animated: false });
  }

  public async onShowAbout(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: this.translationSvc.translate('PROFILE.ABOUT_ALERT_HEADER'),
      message: this.translationSvc.translate('PROFILE.ABOUT_ALERT_MESSAGE'),
      cssClass: 'mirror-alert about-alert',
      buttons: [
        {
          text: this.translationSvc.translate('PROFILE.ABOUT_ALERT_AWESOME'),
          cssClass: 'alert-awesome-btn',
          handler: () => { this.fireConfetti(); }
        }
      ]
    });
    await alert.present();
  }

  private fireConfetti(): void {
    const particleCount: number = 200;
    const origin: { x: number; y: number } = { x: 0.5, y: 0.65 };

    const fire: (ratio: number, opts: ConfettiOpts) => void = (ratio: number, opts: ConfettiOpts): void => {
      void confetti({ origin, ...opts, particleCount: Math.floor(particleCount * ratio) });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }

  public get userIdValue(): string { return this.userId(); }
  public get userEmailValue(): string { return this.userEmail(); }
  public get isAdminValue(): boolean { return this.isAdmin(); }
}
