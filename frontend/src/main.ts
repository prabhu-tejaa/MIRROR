import { APP_INITIALIZER, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockInterceptor } from './app/core/interceptors/mock.interceptor';
import { apiInterceptor } from './app/core/interceptors/api.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { cancelInterceptor } from './app/core/interceptors/cancel.interceptor';
import { TranslationService } from './app/core/services/translation.service';

import { authInterceptor } from './app/core/interceptors/auth.interceptor';

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
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      scrollPadding: true,
      scrollAssist: true
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([cancelInterceptor, errorInterceptor, mockInterceptor, authInterceptor, apiInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const translationSvc = inject(TranslationService);
        return () => translationSvc.initTranslations('en');
      },
      multi: true
    }
  ],
});