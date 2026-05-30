import { Animation, AnimationController } from '@ionic/angular';

/**
 * Creates a crossfade transition animation builder using the provided Ionic AnimationController.
 * This animation lasts 400ms with an ease-in-out curve.
 * 
 * @param animationCtrl The Ionic AnimationController instance
 * @returns An animation builder function suitable for Ionic navigation options
 */
export function getCrossfadeAnimation(
  animationCtrl: AnimationController
): (baseEl: HTMLElement, opts?: { enteringEl?: HTMLElement; leavingEl?: HTMLElement }) => Animation {
  return (_baseEl: HTMLElement, opts?: { enteringEl?: HTMLElement; leavingEl?: HTMLElement }): Animation => {
    const rootTransition = animationCtrl.create()
      .duration(400)
      .easing('ease-in-out');

    if (opts?.enteringEl) {
      const enteringAnimation = animationCtrl.create()
        .addElement(opts.enteringEl)
        .fromTo('opacity', 0, 1);
      rootTransition.addAnimation(enteringAnimation);
    }

    if (opts?.leavingEl) {
      const leavingAnimation = animationCtrl.create()
        .addElement(opts.leavingEl)
        .fromTo('opacity', 1, 0);
      rootTransition.addAnimation(leavingAnimation);
    }

    return rootTransition;
  };
}
