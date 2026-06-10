import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, inject, ErrorHandler, Injectable, Injector } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { apiInterceptor } from './app/core/interceptors/api.interceptor';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
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

  public handleError(error: unknown): void {
    const errMessage: string = this.getErrorMessage(error);
    
    if (this.isChunkError(errMessage)) {
      window.location.reload();
      return;
    }

    // Ignore HTTP errors here because the error.interceptor already shows a toast for them
    if (errMessage.includes('Http failure response')) {
      return;
    }

    this.showToast(errMessage);
  }
}

if (environment.production) {
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.error = () => {};
  window.console.info = () => {};
}

void bootstrapApplication(AppComponent, {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      scrollPadding: true,
      scrollAssist: true
    }),
    provideAnimationsAsync(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([cancelInterceptor, errorInterceptor, mockInterceptor, authInterceptor, apiInterceptor])),
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