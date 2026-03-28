import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'you',
        loadComponent: () =>
          import('../you/you.page').then((m) => m.YouPage),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../chat/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: '/tabs/you',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/you',
    pathMatch: 'full',
  },
];
