import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService implements OnDestroy {
  private http = inject(HttpClient);
  private currentLang = signal<string>('en');
  private translations = signal<Record<string, string | unknown>>({});
  private sub?: Subscription;

  private readonly fallbackTranslations: Record<string, Record<string, string>> = {
    "TABS": {
      "YOU": "You",
      "CHAT": "Chat",
      "PROFILE": "Profile"
    },
    "LOGIN": {
      "TITLE": "Welcome",
      "TAGLINE": "Reflect. Discover. Grow.",
      "BUTTON_SIGNIN": "Sign In",
      "PLACEHOLDER_EMAIL": "Email Address",
      "PLACEHOLDER_PASSWORD": "Password",
      "SIGNUP_LINK": "Sign Up",
      "FORGOT_LINK": "Forgot Password?"
    },
    "SIGNUP": {
      "TITLE": "Create Account",
      "TAGLINE": "Begin your journey.",
      "BUTTON_CREATE": "Create Account"
    },
    "PROFILE": {
      "ACCOUNT": "Account",
      "EMAIL": "Email",
      "ABOUT": "About",
      "ADMIN_VIEW": "Admin View",
      "LOGOUT": "Log Out"
    }
  };

  constructor() {
  }

  public setLanguage(lang: string): void {
    if (this.currentLang() !== lang) {
      this.currentLang.set(lang);
      this.loadTranslations(lang);
    }
  }

  public initTranslations(lang: string = 'en'): Promise<boolean> {
    return new Promise((resolve) => {
      this.http.get<Record<string, string | unknown>>(`assets/i18n/${lang}.json`)
        .subscribe({
          next: (data) => {
            this.translations.set(data);
            resolve(true);
          },
          error: (_err) => {
            this.translations.set(this.fallbackTranslations);
            resolve(true);
          }
        });
    });
  }

  private loadTranslations(lang: string): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    
    this.sub = this.http.get<Record<string, string | unknown>>(`assets/i18n/${lang}.json`)
      .subscribe({
        next: (data) => this.translations.set(data),
        error: (_err) => {
          this.translations.set(this.fallbackTranslations);
        }
      });
  }

  public translate(key: string, params?: Record<string, unknown>): string {
    const dict = this.translations();
    if (!dict) return key;

    const keys = key.split('.');
    let result: string | unknown = dict;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof result !== 'string') return key;

    if (params) {
      Object.keys(params).forEach(p => {
        const value = String(params[p]);
        result = (result as string).replace(new RegExp(`{{${p}}}`, 'g'), value);
      });
    }

    return result as string;
  }

  public ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
