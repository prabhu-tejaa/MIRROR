import { Routes } from '@angular/router';

import { overlayGuard } from '../../core/guards/overlay.guard';

import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'you',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('../../domains/you/feature/you.page').then((m) => m.YouPage),
      },
      {
        path: 'chat',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('../../domains/chat/feature/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'profile',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('../../domains/profile/feature/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: '/tabs/chat',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/chat',
    pathMatch: 'full',
  },
];
