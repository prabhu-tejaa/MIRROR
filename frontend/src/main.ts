import { APP_INITIALIZER, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockInterceptor } from './app/core/interceptors/mock.interceptor';
import { apiInterceptor } from './app/core/interceptors/api.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { cancelInterceptor } from './app/core/interceptors/cancel.interceptor';
import { TranslationService } from './app/core/services/translation.service';

import { ErrorHandler } from '@angular/core';

class GlobalErrorHandler implements ErrorHandler {
  public handleError(error: unknown): void {
    const chunkFailedMessage = /Loading chunk [\w\d\-\.]+ failed/;
    const dynamicImportFailed = /Failed to fetch dynamically imported module/;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (chunkFailedMessage.test((error as any)?.message) || dynamicImportFailed.test((error as any)?.message) || dynamicImportFailed.test((error as any)?.toString())) {
      // eslint-disable-next-line no-console
      console.warn('Chunk load failed. Reloading window...');
      window.location.reload();
    } else {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }
}

import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { chatReducer } from './app/domains/chat/data-access/store/chat.reducer';
import { ChatEffects } from './app/domains/chat/data-access/store/chat.effects';
import { authReducer } from './app/domains/auth/data-access/store/auth.reducer';
import { AuthEffects } from './app/domains/auth/data-access/store/auth.effects';
import { youReducer } from './app/domains/you/data-access/store/you.reducer';
import { YouEffects } from './app/domains/you/data-access/store/you.effects';
import { adminReducer } from './app/domains/admin/data-access/store/admin.reducer';
import { AdminEffects } from './app/domains/admin/data-access/store/admin.effects';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Run the console configuration before bootstrapping the app
if (environment.production) {
  /* eslint-disable no-console */
  console.clear();

  const titleStyles = 'color: red; font-size: 40px; font-weight: bold; -webkit-text-stroke: 1px black;';
  const textStyles = 'color: #333; font-size: 16px; font-weight: bold;';

  console.log('%cSecurity Warning!', titleStyles);
  console.log(
    '%cThis area is reserved for authorized developers only. Executing unauthorized commands here violates security policies and can compromise your data security.',
    textStyles
  );
  /* eslint-enable no-console */

  // Disable subsequent standard logs so user logs are hidden
  window.console.log = () => {};
}

bootstrapApplication(AppComponent, {
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
        const translationSvc = inject(TranslationService);
        return () => translationSvc.initTranslations('en');
      },
      multi: true
    },
    provideStore({ chat: chatReducer, auth: authReducer, you: youReducer, admin: adminReducer }),
    provideEffects([ChatEffects, AuthEffects, YouEffects, AdminEffects])
  ],
});