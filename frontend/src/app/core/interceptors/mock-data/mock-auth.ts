import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError , delay } from 'rxjs';


import { ApiService } from '../../services/api.service';

export function handleAuthRoutes(req: HttpRequest<unknown>, url: string, apiSvc: ApiService): Observable<HttpResponse<unknown>> | null {
  const triggerErrorEmail = 'error@mirror.tech';
  const triggerErrorOtp = '000000';
  const defaultUsername = 'mockuser';
  const defaultEmail = 'gdag@hdjs.com';
  const mockAccessToken = 'mock_jwt_access_token_xyz';
  const mockRefreshToken = 'mock_refresh_token_abc';

  if (url.includes(apiSvc.auth.LOGIN)) {
    const body = req.body as { email?: string; code?: string } | null;
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', error: 'Invalid email or password. Please try again.' })).pipe(delay(800));
    }
    return of(new HttpResponse({ status: 200, body: { accessToken: mockAccessToken, refreshToken: mockRefreshToken, username: body?.email?.split('@')[0] || defaultUsername, email: body?.email || defaultEmail } })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.SIGNUP)) {
    const body = req.body as { email?: string; code?: string } | null;
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', error: 'An account with this email address already exists.' })).pipe(delay(800));
    }
    return of(new HttpResponse({ status: 200, body: 'User registered successfully with ID: mock-123' })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.OTP_REQUEST)) {
    return of(new HttpResponse({ status: 200, body: 'OTP sent to your email.' })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.OTP_VERIFY)) {
    const body = req.body as { email?: string; code?: string } | null;
    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', error: 'Incorrect verification code. Please request a new one.' })).pipe(delay(800));
    }
    return of(new HttpResponse({ status: 200, body: { accessToken: mockAccessToken, refreshToken: mockRefreshToken, username: defaultUsername, email: body?.email || defaultEmail } })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.FORGOT_PASSWORD_REQUEST)) {
    const body = req.body as { email?: string; code?: string } | null;
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found', error: 'No account registered with this email address.' })).pipe(delay(800));
    }
    return of(new HttpResponse({ status: 200, body: 'OTP sent to your email.' })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.FORGOT_PASSWORD_VERIFY)) {
    const body = req.body as { email?: string; code?: string } | null;
    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', error: 'Incorrect OTP code. Verification failed.' })).pipe(delay(800));
    }
    return of(new HttpResponse({ status: 200, body: 'OTP verified successfully. You may now reset your password.' })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.FORGOT_PASSWORD_RESET)) {
    return of(new HttpResponse({ status: 200, body: 'Password reset successfully. Please proceed to login.' })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.REFRESH)) {
    return of(new HttpResponse({ status: 200, body: { accessToken: 'mock_jwt_access_token_xyz_refreshed', refreshToken: mockRefreshToken, username: defaultUsername, email: defaultEmail } })).pipe(delay(500));
  }

  if (url.includes(apiSvc.auth.LOGOUT)) {
    return of(new HttpResponse({ status: 200, body: 'Logged out successfully.' })).pipe(delay(300));
  }

  return null;
}
