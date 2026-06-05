import { Animation, AnimationController } from '@ionic/angular';


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
