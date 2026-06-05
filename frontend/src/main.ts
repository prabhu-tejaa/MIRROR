import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, inject , ErrorHandler } from '@angular/core';
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
import { TranslationService } from './app/core/services/translation.service';



class GlobalErrorHandler implements ErrorHandler {
  public handleError(error: unknown): void {
    const chunkFailedMessage: RegExp = /Loading chunk [\w\d\-\.]+ failed/;
    const dynamicImportFailed: RegExp = /Failed to fetch dynamically imported module/;
    const errMessage: string = error instanceof Error ? error.message : String(error);
    if (chunkFailedMessage.test(errMessage) || dynamicImportFailed.test(errMessage)) {

      window.location.reload();
    } else {

    }
  }
}

import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { AdminEffects } from './app/domains/admin/data-access/store/admin.effects';
import { adminReducer } from './app/domains/admin/data-access/store/admin.reducer';
import { AuthEffects } from './app/domains/auth/data-access/store/auth.effects';
import { authReducer } from './app/domains/auth/data-access/store/auth.reducer';
import { ChatEffects } from './app/domains/chat/data-access/store/chat.effects';
import { chatReducer } from './app/domains/chat/data-access/store/chat.reducer';
import { YouEffects } from './app/domains/you/data-access/store/you.effects';
import { youReducer } from './app/domains/you/data-access/store/you.reducer';
import { environment } from './environments/environment';

if (environment.production) {


  window.console.log = () => {};
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