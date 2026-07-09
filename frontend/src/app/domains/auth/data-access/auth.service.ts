import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, NgZone, Injector } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Store } from '@ngrx/store';
import { Observable, tap, filter } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { StorageKeys, getActiveSessionKey } from '../../../core/constants/storage.constants';
import { SKIP_CANCEL } from '../../../core/interceptors/cancel.interceptor';
import { ApiService } from '../../../core/services/api.service';
import { StorageService } from '../../../core/services/storage.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AudioVisualizerService } from '../../chat/data-access/audio-visualizer.service';

import { RegisterRequest, LoginRequest, AuthResponse } from './auth.model';
import { AuthActions } from './store/auth.actions';
import { selectIsAuthenticated } from './store/auth.selectors';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);
  private translationSvc: TranslationService = inject(TranslationService);
  private router: Router = inject(Router);
  private storageSvc: StorageService = inject(StorageService);
  private ngZone: NgZone = inject(NgZone);
  private injector: Injector = inject(Injector);
  private lastValidationTime: number = 0;
  private isValidating: boolean = false;
  private accessToken: string | null = null;
  private store: Store<object> = inject<Store<object>>(Store);

  private getSessionInstanceId(): string {
    let id: string | null = this.storageSvc.get(StorageKeys.SESSION_INSTANCE_ID);
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      this.storageSvc.set(StorageKeys.SESSION_INSTANCE_ID, id);
    }
    return id;
  }

  constructor() {
    const rolesStr: string | null = this.storageSvc.get(StorageKeys.ROLES);
    const email: string | null = this.storageSvc.get(StorageKeys.EMAIL);
    const username: string | null = this.storageSvc.get(StorageKeys.USERNAME);
    
    // Fallback: If we have an email, we assume we have a session (handled by cookies now)
    const hasToken: boolean = !!email;
    
    const roles: string[] = rolesStr ? (JSON.parse(rolesStr) as string[]) : ['USER'];

    this.store.dispatch(AuthActions.setAuthenticated({ 
      isAuthenticated: hasToken, 
      email: email || undefined, 
      username: username || undefined,
      roles
    }));

    this.setupStorageListener();
    this.setupVisibilityAndRouteListeners();
  }

  private handleSessionKeyChange(event: StorageEvent): void {
    const email: string | null = this.getEmail();
    if (!email || event.key !== getActiveSessionKey(email)) {
      return;
    }
    const activeSessionId: string | null = event.newValue;
    if (activeSessionId && activeSessionId !== this.getSessionInstanceId()) {
      this.logout();
    }
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key && event.key.startsWith('mirror_active_session_')) {
        this.handleSessionKeyChange(event);
      }
      if (event.key === StorageKeys.ROLES && !event.newValue) {
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


  private checkSessionValidity(): void {
    const email: string | null = this.getEmail();
    if (!this.shouldValidateSession(email)) {
      return;
    }

    if (this.hasActiveSessionMismatch(email as string)) {
      this.logout();
      return;
    }

    this.validateSessionWithBackend();
  }

  private shouldValidateSession(email: string | null): boolean {
    return !!email && this.isAuthenticated();
  }

  private hasActiveSessionMismatch(email: string): boolean {
    const activeSessionId: string | null = this.storageSvc.get(getActiveSessionKey(email));
    const sessionInstanceId: string = this.getSessionInstanceId();
    return !!activeSessionId && activeSessionId !== sessionInstanceId;
  }

  private validateSessionWithBackend(): void {
    if (this.isValidating || Date.now() - this.lastValidationTime < 10000) {
      return;
    }

    if (!environment.mock) {
      this.isValidating = true;
      this.lastValidationTime = Date.now();
      
      this.http.post<{ valid: boolean }>(this.apiSvc.auth.VALIDATE, {}, { withCredentials: true }).subscribe({
        next: (res: { valid: boolean; }) => this.handleValidationSuccess(res),
        error: (err: unknown) => this.handleValidationError(err)
      });
    }
  }

  private handleValidationSuccess(res: { valid: boolean; }): void {
    this.isValidating = false;
    if (res && res.valid === false) {
      this.logout();
    }
  }

  private handleValidationError(err: unknown): void {
    this.isValidating = false;
    const error: { status?: number } = err as { status?: number };
    if (error && (error.status === 401 || error.status === 403)) {
      this.logout();
    }
  }

  public readonly isAuthenticated: import('@angular/core').Signal<boolean> = this.store.selectSignal(selectIsAuthenticated);

  public signup(request: RegisterRequest): Observable<string> {
    return this.http.post(this.apiSvc.auth.SIGNUP, request, { responseType: 'text' });
  }

  public loginUser(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.auth.LOGIN, request).pipe(
      tap((res: AuthResponse) => this.saveSession(res))
    );
  }

  public requestOtp(email: string): Observable<string> {
    return this.http.post(this.apiSvc.auth.OTP_REQUEST, { email }, { responseType: 'text' });
  }

  public verifyOtp(email: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.auth.OTP_VERIFY, { email, code });
  }

  public requestForgotPasswordOtp(email: string): Observable<string> {
    return this.http.post(this.apiSvc.auth.FORGOT_PASSWORD_REQUEST, { email }, { responseType: 'text' });
  }

  public verifyForgotPasswordOtp(email: string, code: string): Observable<string> {
    return this.http.post(this.apiSvc.auth.FORGOT_PASSWORD_VERIFY, { email, code }, { responseType: 'text' });
  }

  public resetPassword(email: string, password?: string, token?: string): Observable<string> {
    return this.http.post(this.apiSvc.auth.FORGOT_PASSWORD_RESET, { email, password, token }, { responseType: 'text' });
  }

  public refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiSvc.auth.REFRESH, {}, {
      context: new HttpContext().set(SKIP_CANCEL, true),
      withCredentials: true
    }).pipe(
      tap((res: AuthResponse) => this.saveSession(res))
    );
  }

  public logoutSession(): Observable<string> {
    return this.http.post(this.apiSvc.auth.LOGOUT, {}, { responseType: 'text', withCredentials: true }).pipe(
      tap(() => this.clearSession())
    );
  }

  private saveSession(response: AuthResponse): void {
    const currentUsername = response.username || this.getUserId() || '';
    const currentEmail = response.email || this.getEmail() || '';

    const patchedResponse: AuthResponse = {
      ...response,
      username: currentUsername,
      email: currentEmail
    };

    const roles: string[] = this.extractRolesFromToken(patchedResponse.accessToken, patchedResponse.username);
    this.accessToken = patchedResponse.accessToken || null;
    this.storageSvc.set(StorageKeys.ROLES, JSON.stringify(roles));
    // eslint-disable-next-line @ngrx/avoid-dispatching-multiple-actions-sequentially
    this.store.dispatch(AuthActions.loginSuccess({ response: patchedResponse }));
    // eslint-disable-next-line @ngrx/avoid-dispatching-multiple-actions-sequentially
    this.store.dispatch(AuthActions.setAuthenticated({
      isAuthenticated: true,
      email: patchedResponse.email || undefined,
      username: patchedResponse.username || undefined,
      roles
    }));
  }

  public clearSession(): void {
    try {
      if (Capacitor.isNativePlatform()) {
        TextToSpeech.stop().catch(() => {});
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      const audioSvc: AudioVisualizerService = this.injector.get(AudioVisualizerService);
      if (audioSvc) {
        audioSvc.stopAudio();
      }
    } catch {
      // Ignored
    } 

    this.accessToken = null;
    this.store.dispatch(AuthActions.clearSession());
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }


  public logout(): void {
    this.clearSession();
    if (!environment.mock) {
      this.http.post(this.apiSvc.auth.LOGOUT, {}, { responseType: 'text', withCredentials: true }).subscribe({
        next: () => undefined,
        error: () => undefined
      });
    }
  }

  public getUserId(): string | null {
    return this.storageSvc.get(StorageKeys.USERNAME);
  }


  public getEmail(): string | null {
    return this.storageSvc.get(StorageKeys.EMAIL);
  }

  private normalizeRole(r: unknown): string {
    const str: string = String(r).toUpperCase();
    return str.startsWith('ROLE_') ? str.substring(5) : str;
  }

  private parseJwtRoles(token: string): string[] {
    const parts: string[] = token.split('.');
    if (parts.length !== 3) {
      return ['USER'];
    }
    const payloadStr: string = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload: Record<string, unknown> = JSON.parse(payloadStr) as Record<string, unknown>;
    const roles: unknown = payload['roles'] ?? payload['role'] ?? payload['authorities'] ?? [];
    if (Array.isArray(roles)) {
      return roles.map((r: unknown) => this.normalizeRole(r));
    }
    if (typeof roles === 'string') {
      return [this.normalizeRole(roles)];
    }
    return ['USER'];
  }

  private extractRolesFromToken(token: string | undefined | null, username: string): string[] {
    if (!token) { return ['USER']; }
    if (token.startsWith('mock_jwt_access_token')) {
      return username.toLowerCase().startsWith('admin') ? ['ADMIN'] : ['USER'];
    }
    try {
      return this.parseJwtRoles(token);
    } catch {
      return ['USER'];
    }
  }
}
