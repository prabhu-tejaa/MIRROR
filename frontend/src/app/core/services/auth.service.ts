import { Injectable, signal, computed, inject, NgZone, Injector } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router, NavigationStart } from '@angular/router';
import { SKIP_CANCEL } from '../interceptors/cancel.interceptor';
import { Observable, tap, filter } from 'rxjs';
import { RegisterRequest, LoginRequest, AuthResponse } from '../models/auth.model';
import { ApiService } from './api.service';
import { TranslationService } from './translation.service';
import { StorageService } from './storage.service';
import { StorageKeys, getActiveSessionKey } from '../constants/storage.constants';
import { RoutePaths } from '../constants/route.constants';
import { environment } from '../../../environments/environment';
import { AudioVisualizerService } from '../../features/tabs/pages/chat/data-access/audio-visualizer.service';
import { UserMemoryService } from '../../features/tabs/pages/chat/data-access/user-memory.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);
  private translationSvc = inject(TranslationService);
  private router = inject(Router);
  private storageSvc = inject(StorageService);
  private ngZone = inject(NgZone);
  private injector = inject(Injector);
  private lastValidationTime = 0;
  private isValidating = false;

  private getSessionInstanceId(): string {
    let id = this.storageSvc.get(StorageKeys.SESSION_INSTANCE_ID);
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      this.storageSvc.set(StorageKeys.SESSION_INSTANCE_ID, id);
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
        if (email && event.key === getActiveSessionKey(email)) {
          const activeSessionId = event.newValue;
          if (activeSessionId && activeSessionId !== this.getSessionInstanceId()) {
            this.logout();
          }
        }
      }
      if (event.key === StorageKeys.ACCESS_TOKEN && !event.newValue) {
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
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
        this.ngZone.run(() => {
          this.checkSessionValidity();
        });
      }, 60000);
    });
  }

  private checkSessionValidity(): void {
    const email = this.getEmail();
    if (!email || !this.isAuthenticated()) {
      return;
    }

    const activeSessionId = this.storageSvc.get(getActiveSessionKey(email));
    const sessionInstanceId = this.getSessionInstanceId();
    
    if (activeSessionId && activeSessionId !== sessionInstanceId) {
      console.warn('[AuthService] Session instance ID mismatch. Logging out!', { activeSessionId, sessionInstanceId });
      this.logout();
      return;
    }

    // Cooldown check (10 seconds) and check if validation is already in flight
    if (this.isValidating || Date.now() - this.lastValidationTime < 10000) {
      return;
    }

    const refreshToken = this.storageSvc.get(StorageKeys.REFRESH_TOKEN);
    if (!environment.mock && refreshToken) {
      console.log('[AuthService] Initiating background session validation via API...');
      this.isValidating = true;
      this.lastValidationTime = Date.now();
      
      this.http.post<{ valid: boolean }>(this.apiSvc.AUTH.VALIDATE, { refreshToken }).subscribe({
        next: (res) => {
          this.isValidating = false;
          console.log('[AuthService] Session validation result:', res);
          if (res && res.valid === false) {
            console.warn('[AuthService] Session marked invalid by backend. Logging out!');
            this.logout();
          }
        },
        error: (err) => {
          this.isValidating = false;
          console.error('[AuthService] Session validation API error:', err);
          // Only log out for explicit auth failures (401/403).
          // Do NOT log out on transient 5xx server errors, connection timeouts, or offline status
          if (err && (err.status === 401 || err.status === 403)) {
            console.warn('[AuthService] Explicit validation failure (401/403). Logging out!');
            this.logout();
          }
        }
      });
    }
  }

  private readonly authSignal = signal<boolean>(
    !!this.storageSvc.get(StorageKeys.ACCESS_TOKEN)
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
    return this.http.post<AuthResponse>(this.apiSvc.AUTH.REFRESH, { refreshToken }, {
      context: new HttpContext().set(SKIP_CANCEL, true)
    }).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  public logoutSession(refreshToken: string): Observable<string> {
    return this.http.post(this.apiSvc.AUTH.LOGOUT, { refreshToken }, { responseType: 'text' }).pipe(
      tap(() => this.clearSession())
    );
  }

  private saveSession(response: AuthResponse): void {
    this.storageSvc.set(StorageKeys.ACCESS_TOKEN, response.accessToken);
    this.storageSvc.set(StorageKeys.REFRESH_TOKEN, response.refreshToken);
    this.storageSvc.set(StorageKeys.USERNAME, response.username);
    if (response.email) {
      this.storageSvc.set(StorageKeys.EMAIL, response.email);
      this.storageSvc.set(getActiveSessionKey(response.email), this.getSessionInstanceId());
    }
    this.authSignal.set(true);
  }

  public clearSession(): void {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      const audioSvc = this.injector.get(AudioVisualizerService);
      if (audioSvc) {
        audioSvc.stopAudio();
      }
      const userMemorySvc = this.injector.get(UserMemoryService);
      if (userMemorySvc) {
        userMemorySvc.clearCache();
      }
    } catch {
      // Ignore injection errors if services aren't ready
    }

    const email = this.getEmail();
    if (email) {
      this.storageSvc.remove(getActiveSessionKey(email));
    }
    this.storageSvc.remove(StorageKeys.ACCESS_TOKEN);
    this.storageSvc.remove(StorageKeys.REFRESH_TOKEN);
    this.storageSvc.remove(StorageKeys.USERNAME);
    this.storageSvc.remove(StorageKeys.EMAIL);
    this.storageSvc.remove(StorageKeys.GUEST_CHAT_COUNT);
    this.storageSvc.remove(StorageKeys.SESSION_INSTANCE_ID);
    this.authSignal.set(false);
    this.router.navigate([RoutePaths.AUTH.LOGIN]);
  }


  public logout(): void {
    const refreshToken = this.storageSvc.get(StorageKeys.REFRESH_TOKEN);

    // Always clear the local session and navigate immediately — don't wait for API
    this.clearSession();

    // Fire the backend logout in the background to invalidate the refresh token on the server
    if (refreshToken && !environment.mock) {
      this.http.post(this.apiSvc.AUTH.LOGOUT, { refreshToken }, { responseType: 'text' }).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  public getUserId(): string | null {
    return this.storageSvc.get(StorageKeys.USERNAME);
  }

  public getEmail(): string | null {
    return this.storageSvc.get(StorageKeys.EMAIL);
  }

  public getAccessToken(): string | null {
    return this.storageSvc.get(StorageKeys.ACCESS_TOKEN);
  }
}
