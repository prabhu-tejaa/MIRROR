import { inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { AlertController, ModalController, PopoverController, ActionSheetController } from '@ionic/angular/standalone';

export interface OverlayControllers {
  alertCtrl: AlertController;
  modalCtrl: ModalController;
  popoverCtrl: PopoverController;
  actionSheetCtrl: ActionSheetController;
}

export const overlayGuard: CanDeactivateFn<unknown> = async () => {
  const router: Router = inject(Router);
  const navigation = router.getCurrentNavigation();
  
  if (navigation?.trigger !== 'popstate') {
    return true;
  }

  const ctrls: OverlayControllers = {
    alertCtrl: inject(AlertController),
    modalCtrl: inject(ModalController),
    popoverCtrl: inject(PopoverController),
    actionSheetCtrl: inject(ActionSheetController)
  };

  const topOverlay = await getTopOverlay(ctrls);
  
  if (topOverlay) {
    await topOverlay.dismiss();
    return false; 
  }
  
  return true;
};

async function getTopOverlay(
  ctrls: OverlayControllers
): Promise<HTMLIonAlertElement | HTMLIonModalElement | HTMLIonPopoverElement | HTMLIonActionSheetElement | undefined> {
  const alert: HTMLIonAlertElement | undefined = await ctrls.alertCtrl.getTop();
  if (alert) { return alert; }
  
  const modal: HTMLIonModalElement | undefined = await ctrls.modalCtrl.getTop();
  if (modal) { return modal; }
  
  const popover: HTMLIonPopoverElement | undefined = await ctrls.popoverCtrl.getTop();
  if (popover) { return popover; }
  
  const actionSheet: HTMLIonActionSheetElement | undefined = await ctrls.actionSheetCtrl.getTop();
  return actionSheet;
}
