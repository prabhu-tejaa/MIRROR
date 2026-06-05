import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, informationCircleOutline } from 'ionicons/icons';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastCtrl: ToastController = inject(ToastController);
  private activeToast: HTMLIonToastElement | null = null;

  constructor() {
    addIcons({
      ['alert-circle-outline']: alertCircleOutline,
      ['checkmark-circle-outline']: checkmarkCircleOutline,
      ['information-circle-outline']: informationCircleOutline
    });
  }

  private async dismissActiveToast(): Promise<void> {
    if (this.activeToast) {
      try {
        await this.activeToast.dismiss();
      } catch {
      }
      this.activeToast = null;
    }
  }

  public async showError(message: string): Promise<void> {
    await this.dismissActiveToast();

    const toast: HTMLIonToastElement = await this.toastCtrl.create({
      message,
      duration: 4000,
      position: 'top',
      icon: 'alert-circle-outline',
      cssClass: 'premium-toast error-toast',
      animated: false,
      buttons: [
        {
          text: '✕',
          role: 'cancel'
        }
      ]
    });

    this.activeToast = toast;
    await toast.onDidDismiss().then(() => {
            if (this.activeToast === toast) {
              this.activeToast = null;
            }
          });

    await toast.present();
  }

  public async showSuccess(message: string): Promise<void> {
    await this.dismissActiveToast();

    const toast: HTMLIonToastElement = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      icon: 'checkmark-circle-outline',
      cssClass: 'premium-toast success-toast',
      animated: false,
      buttons: [
        {
          text: '✕',
          role: 'cancel'
        }
      ]
    });

    this.activeToast = toast;
    await toast.onDidDismiss().then(() => {
            if (this.activeToast === toast) {
              this.activeToast = null;
            }
          });

    await toast.present();
  }

  public async showInfo(message: string): Promise<void> {
    await this.dismissActiveToast();

    const toast: HTMLIonToastElement = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      icon: 'information-circle-outline',
      cssClass: 'premium-toast info-toast',
      animated: false,
      buttons: [
        {
          text: '✕',
          role: 'cancel'
        }
      ]
    });

    this.activeToast = toast;
    await toast.onDidDismiss().then(() => {
            if (this.activeToast === toast) {
              this.activeToast = null;
            }
          });

    await toast.present();
  }
}

