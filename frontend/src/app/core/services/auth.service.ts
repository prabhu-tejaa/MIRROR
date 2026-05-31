import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationStart } from '@angular/router';
import { Observable, tap, filter } from 'rxjs';
import { RegisterRequest, LoginRequest, AuthResponse } from '../models/auth.model';
import { ApiService } from './api.service';
import { TranslationService } from './translation.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);
  private translationSvc = inject(TranslationService);
  private router = inject(Router);

  private getSessionInstanceId(): string {
    let id = sessionStorage.getItem('mirror_session_instance_id');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('mirror_session_instance_id', id);
    }
    return id;
  }

  constructor() {
    this.setupStorageListener();
    this.setupVisibilityAndRouteListeners();
    this.startSessionValidationTimer();
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('mirror_active_session_')) {
        const email = this.getEmail();
        if (email && event.key === 'mirror_active_session_' + email) {
          const activeSessionId = event.newValue;
          if (activeSessionId && activeSessionId !== this.getSessionInstanceId()) {
            this.logout();
          }
        }
      }
      if (event.key === this.accessTokenKey && !event.newValue) {
        this.clearSession();
      }
    });
  }

  private setupVisibilityAndRouteListeners(): void {
    window.addEventListener('focus', () => {
      this.checkSessionValidity();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkSessionValidity();
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.checkSessionValidity();
    });
  }

  private startSessionValidationTimer(): void {
    setInterval(() => {
      this.checkSessionValidity();
      // Check every 60 seconds instead of 4 seconds to reduce server load
    }, 60000);
  }

  private checkSessionValidity(): void {
    const email = this.getEmail();
    if (!email || !this.isAuthenticated()) {
      return;
    }

    const activeSessionId = localStorage.getItem('mirror_active_session_' + email);
    if (activeSessionId && activeSessionId !== this.getSessionInstanceId()) {
      this.logout();
      return;
    }

    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!environment.mock && refreshToken) {
      this.http.post<{ valid: boolean }>(this.apiSvc.AUTH.VALIDATE, { refreshToken }).subscribe({
        next: (res) => {
          if (res && res.valid === false) {
            this.logout();
          }
        },
        error: (err) => {
          // Only log out for explicit auth failures (401/403).
          // Do NOT log out on transient 5xx server errors, connection timeouts, or offline status
          if (err && (err.status === 401 || err.status === 403)) {
            this.logout();
          }
        }
      });
    }
  }

  private get accessTokenKey(): string {
    return 'mirror_access_token';
  }

  private get refreshTokenKey(): string {
    return 'mirror_refresh_token';
  }

  private get usernameKey(): string {
    return 'mirror_username';
  }

  private get emailKey(): string {
    return 'mirror_email';
  }

  private readonly authSignal = signal<boolean>(
    !!localStorage.getItem('mirror_access_token')
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
    return this.http.post<AuthResponse>(this.apiSvc.AUTH.OTP_VERIFY, { email, code });
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
    if (response.email) {
      localStorage.setItem(this.emailKey, response.email);
      localStorage.setItem('mirror_active_session_' + response.email, this.getSessionInstanceId());
    }
    this.authSignal.set(true);
  }

  private clearSession(): void {
    const email = this.getEmail();
    if (email) {
      localStorage.removeItem('mirror_active_session_' + email);
    }
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.emailKey);
    localStorage.removeItem('mirror_guest_chat_count');
    this.authSignal.set(false);
    this.router.navigate(['/login']);
  }


  public logout(): void {
    const token = localStorage.getItem(this.refreshTokenKey);
    this.clearSession();
    if (token) {
      this.logoutSession(token).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  public getUserId(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  public getEmail(): string | null {
    return localStorage.getItem(this.emailKey);
  }

  public getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }
}
