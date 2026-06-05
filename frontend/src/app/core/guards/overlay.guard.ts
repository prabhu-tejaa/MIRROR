import { inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { AlertController, ModalController, PopoverController, ActionSheetController } from '@ionic/angular/standalone';

export const overlayGuard: CanDeactivateFn<unknown> = async () => {
  const router: Router = inject(Router);
  const navigation = router.getCurrentNavigation();
  
  if (navigation?.trigger !== 'popstate') {
    return true;
  }

  const alertCtrl: AlertController = inject(AlertController);
  const modalCtrl: ModalController = inject(ModalController);
  const popoverCtrl: PopoverController = inject(PopoverController);
  const actionSheetCtrl: ActionSheetController = inject(ActionSheetController);
  
  const alert: HTMLIonAlertElement | undefined = await alertCtrl.getTop();
  const modal: HTMLIonModalElement | undefined = await modalCtrl.getTop();
  const popover: HTMLIonPopoverElement | undefined = await popoverCtrl.getTop();
  const actionSheet: HTMLIonActionSheetElement | undefined = await actionSheetCtrl.getTop();
  
  const topOverlay = alert || modal || popover || actionSheet;
  
  if (topOverlay) {
    await topOverlay.dismiss();
    return false; 
  }
  
  return true;
};
