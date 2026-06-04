import { Routes } from '@angular/router';
import { authGuard } from './domains/auth/data-access/auth.guard';
import { guestGuard } from './domains/auth/data-access/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { overlayGuard } from './core/guards/overlay.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./domains/auth/feature/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./shell/tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./domains/auth/feature/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'otp',
    canActivate: [guestGuard],
    loadComponent: () => import('./domains/auth/feature/otp/otp.page').then(m => m.OtpPage)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./domains/auth/feature/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./domains/auth/feature/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    canDeactivate: [overlayGuard],
    loadComponent: () => import('./domains/admin/feature/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage)
  },
  {
    path: 'admin/auth-service',
    canActivate: [authGuard, adminGuard],
    canDeactivate: [overlayGuard],
    loadComponent: () => import('./domains/admin/feature/admin-auth/admin-auth.page').then(m => m.AdminAuthPage)
  },
  {
    path: 'admin/memory-service',
    canActivate: [authGuard, adminGuard],
    canDeactivate: [overlayGuard],
    loadComponent: () => import('./domains/admin/feature/admin-memory/admin-memory.page').then(m => m.AdminMemoryPage)
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
