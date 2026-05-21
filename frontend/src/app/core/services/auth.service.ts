import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RegisterRequest, LoginRequest, AuthResponse } from '../models/auth.model';
import { ApiService } from './api.service';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);
  private translationSvc = inject(TranslationService);

  private get accessTokenKey(): string {
    return this.translationSvc.translate('STORAGE.ACCESS_TOKEN');
  }

  private get refreshTokenKey(): string {
    return this.translationSvc.translate('STORAGE.REFRESH_TOKEN');
  }

  private get usernameKey(): string {
    return this.translationSvc.translate('STORAGE.USERNAME');
  }

  private readonly authSignal = signal<boolean>(
    !!localStorage.getItem(this.translationSvc.translate('STORAGE.ACCESS_TOKEN'))
  );

  public readonly isAuthenticated = computed(() => this.authSignal());

  public signup(request: RegisterRequest): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.SIGNUP, request, { responseType: 'text' });
  }

  public loginUser(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.AUTH.LOGIN, request).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  public requestOtp(email: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.OTP_REQUEST, { email }, { responseType: 'text' });
  }

  public verifyOtp(email: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.AUTH.OTP_VERIFY, { email, code }).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  public requestForgotPasswordOtp(email: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.FORGOT_PASSWORD_REQUEST, { email }, { responseType: 'text' });
  }

  public verifyForgotPasswordOtp(email: string, code: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.FORGOT_PASSWORD_VERIFY, { email, code }, { responseType: 'text' });
  }

  public resetPassword(email: string, password?: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.FORGOT_PASSWORD_RESET, { email, password }, { responseType: 'text' });
  }

  public refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.AUTH.REFRESH, { refreshToken }).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  public logoutSession(refreshToken: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.LOGOUT, { refreshToken }, { responseType: 'text' }).pipe(
      tap(() => this.clearSession())
    );
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(this.accessTokenKey, response.accessToken);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.usernameKey, response.username);
    this.authSignal.set(true);
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.usernameKey);
    this.authSignal.set(false);
  }


  public logout(): void {
    const token = localStorage.getItem(this.refreshTokenKey);
    if (token) {
      this.logoutSession(token).subscribe({
        next: () => {},
        error: () => {
          this.clearSession();
        }
      });
    } else {
      this.clearSession();
    }
  }

  public getUserId(): string | null {
    return localStorage.getItem(this.usernameKey);
  }
}
