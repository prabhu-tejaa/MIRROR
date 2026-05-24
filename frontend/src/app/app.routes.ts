import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./features/tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'otp',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/otp/otp.page').then(m => m.OtpPage)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.page').then(m => m.AdminDashboardPage)
  },
  {
    path: 'admin/auth-service',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/pages/admin-auth/admin-auth.page').then(m => m.AdminAuthPage)
  },
  {
    path: 'admin/api-gateway',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/pages/admin-gateway/admin-gateway.page').then(m => m.AdminGatewayPage)
  },
  {
    path: 'status',
    loadComponent: () => import('./features/status/system-status.page').then(m => m.SystemStatusPage)
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
