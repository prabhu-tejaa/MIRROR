import { Injectable, inject } from '@angular/core';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private translationSvc = inject(TranslationService);

  public get AUTH() {
    return {
      SIGNUP: this.translationSvc.translate('API.SIGNUP'),
      LOGIN: this.translationSvc.translate('API.LOGIN'),
      OTP_REQUEST: this.translationSvc.translate('API.OTP_REQUEST'),
      OTP_VERIFY: this.translationSvc.translate('API.OTP_VERIFY'),
      FORGOT_PASSWORD_REQUEST: this.translationSvc.translate('API.FORGOT_PASSWORD_REQUEST'),
      FORGOT_PASSWORD_VERIFY: this.translationSvc.translate('API.FORGOT_PASSWORD_VERIFY'),
      FORGOT_PASSWORD_RESET: this.translationSvc.translate('API.FORGOT_PASSWORD_RESET'),
      REFRESH: this.translationSvc.translate('API.REFRESH'),
      LOGOUT: this.translationSvc.translate('API.LOGOUT')
    } as const;
  }
}
