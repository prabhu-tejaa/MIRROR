import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { overlayGuard } from '../../core/guards/overlay.guard';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'you',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('./pages/you/you.page').then((m) => m.YouPage),
      },
      {
        path: 'chat',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('./pages/chat/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'profile',
        canDeactivate: [overlayGuard],
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
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
