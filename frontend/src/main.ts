import { APP_INITIALIZER, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { mockInterceptor } from './app/core/interceptors/mock.interceptor';
import { apiInterceptor } from './app/core/interceptors/api.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { TranslationService } from './app/core/services/translation.service';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      scrollPadding: true,
      scrollAssist: true
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([errorInterceptor, mockInterceptor, apiInterceptor])),
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
