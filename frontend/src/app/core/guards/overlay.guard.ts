import { inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { AlertController, ModalController, PopoverController, ActionSheetController } from '@ionic/angular/standalone';

export const overlayGuard: CanDeactivateFn<unknown> = async () => {
  const router = inject(Router);
  const navigation = router.getCurrentNavigation();
  
  // Only intercept browser back button presses (popstate). 
  // Allow programmatic navigations (like logout) to proceed.
  if (navigation?.trigger !== 'popstate') {
    return true;
  }

  const alertCtrl = inject(AlertController);
  const modalCtrl = inject(ModalController);
  const popoverCtrl = inject(PopoverController);
  const actionSheetCtrl = inject(ActionSheetController);
  
  const alert = await alertCtrl.getTop();
  const modal = await modalCtrl.getTop();
  const popover = await popoverCtrl.getTop();
  const actionSheet = await actionSheetCtrl.getTop();
  
  const topOverlay = alert || modal || popover || actionSheet;
  
  if (topOverlay) {
    await topOverlay.dismiss();
    // Prevent route navigation so the user stays on the current page
    return false; 
  }
  
  return true;
};
