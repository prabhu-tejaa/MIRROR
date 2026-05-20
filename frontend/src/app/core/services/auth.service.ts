import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_KEY = 'mirror_is_authenticated';

  private readonly _isAuthenticated = signal<boolean>(
    localStorage.getItem(this.AUTH_KEY) === 'true'
  );

  public readonly isAuthenticated = computed(() => this._isAuthenticated());

  public login(userId?: string): void {
    if (userId) {
      localStorage.setItem('mirror_user_id', userId);
    }
    localStorage.setItem(this.AUTH_KEY, 'true');
    this._isAuthenticated.set(true);
  }

  public logout(): void {
    localStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem('mirror_user_id');
    this._isAuthenticated.set(false);
  }

  public getUserId(): string | null {
    return localStorage.getItem('mirror_user_id');
  }
}
