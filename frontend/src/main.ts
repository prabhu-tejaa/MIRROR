import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, inject, ErrorHandler, Injectable, Injector, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { apiInterceptor } from './app/core/interceptors/api.interceptor';
import { cancelInterceptor } from './app/core/interceptors/cancel.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { mockInterceptor } from './app/core/interceptors/mock.interceptor';
import { ToastService } from './app/core/services/toast.service';
import { TranslationService } from './app/core/services/translation.service';
import { AdminEffects } from './app/domains/admin/data-access/store/admin.effects';
import { adminReducer } from './app/domains/admin/data-access/store/admin.reducer';
import { AuthEffects } from './app/domains/auth/data-access/store/auth.effects';
import { authReducer } from './app/domains/auth/data-access/store/auth.reducer';
import { ChatEffects } from './app/domains/chat/data-access/store/chat.effects';
import { chatReducer } from './app/domains/chat/data-access/store/chat.reducer';
import { YouEffects } from './app/domains/you/data-access/store/you.effects';
import { youReducer } from './app/domains/you/data-access/store/you.reducer';
import { environment } from './environments/environment';

@Injectable()
class GlobalErrorHandler implements ErrorHandler {
  private injector: Injector = inject(Injector);

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isChunkError(msg: string): boolean {
    return /Loading chunk [\w-.]+ failed/.test(msg) || /Failed to fetch dynamically imported module/.test(msg);
  }

  private showToast(errMessage: string): void {
    try {
      const toastSvc = this.injector.get(ToastService);
      void toastSvc.showError(errMessage || 'An unexpected error occurred.');
    } catch {
      // Ignored if ToastService is unavailable
    }
  }

  private logCrash(errMessage: string, error: unknown): void {
    try {
      const stack: string = error instanceof Error ? (error.stack || '') : '';
      localStorage.setItem('mirror_last_crash', JSON.stringify({
        time: new Date().toISOString(),
        message: errMessage,
        stack: stack.substring(0, 500)
      }));
    } catch {
      // Ignore localStorage errors
    }
  }

  public handleError(error: unknown): void {
    const errMessage: string = this.getErrorMessage(error);
    
    if (this.isChunkError(errMessage)) {
      window.location.reload();
      return;
    }

    if (errMessage.includes('Http failure response')) {
      return;
    }

    this.logCrash(errMessage, error);
    this.showToast(errMessage);
    // eslint-disable-next-line no-console
    console.error('GlobalErrorHandler caught:', error);
  }
}

if (environment.production) {
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.info = () => {};
}

window.addEventListener('error', (event: ErrorEvent) => {
  try {
    const err: unknown = event.error;
    const stack: string = err instanceof Error && err.stack ? String(err.stack).substring(0, 500) : '';
    localStorage.setItem('mirror_last_crash_native', JSON.stringify({
      time: new Date().toISOString(),
      message: String(event.message),
      source: event.filename,
      line: event.lineno,
      stack: stack
    }));
  } catch {
    // Ignore
  }
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  try {
    const reason: unknown = event.reason;
    const msg: string = reason instanceof Error ? reason.message : String(reason);
    const stack: string = reason instanceof Error && reason.stack ? reason.stack.substring(0, 500) : '';
    localStorage.setItem('mirror_last_crash_promise', JSON.stringify({
      time: new Date().toISOString(),
      message: msg,
      stack: stack
    }));
  } catch {
    // Ignore
  }
});

void bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      scrollPadding: true,
      scrollAssist: true
    }),
    provideAnimationsAsync(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([cancelInterceptor, errorInterceptor, mockInterceptor, apiInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const translationSvc: TranslationService = inject(TranslationService);
        return () => translationSvc.initTranslations('en');
      },
      multi: true
    },
    provideStore({ chat: chatReducer, auth: authReducer, you: youReducer, admin: adminReducer }),
    provideEffects([ChatEffects, AuthEffects, YouEffects, AdminEffects])
  ],
});