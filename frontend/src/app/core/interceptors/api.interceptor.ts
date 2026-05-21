import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslationService } from '../services/translation.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const translationSvc = inject(TranslationService);
  const actualPrefix = translationSvc.translate('CONFIG.API_PREFIX');

  if (req.url.startsWith(actualPrefix)) {
    const baseUrl = environment.apiUrl || translationSvc.translate('CONFIG.API_URL');
    const apiReq = req.clone({
      url: `${baseUrl}${req.url}`
    });
    return next(apiReq);
  }
  return next(req);
};
