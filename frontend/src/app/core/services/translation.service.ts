import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLang = signal<string>('en');
  private translations = signal<Record<string, any>>({});

  constructor(private http: HttpClient) {
    this.loadTranslations(this.currentLang());
  }

  setLanguage(lang: string) {
    if (this.currentLang() !== lang) {
      this.currentLang.set(lang);
      this.loadTranslations(lang);
    }
  }

  private loadTranslations(lang: string) {
    this.http.get<Record<string, any>>(`/assets/i18n/${lang}.json`)
      .subscribe({
        next: (data) => this.translations.set(data),
        error: (err) => console.error(`Could not load translations for language ${lang}`, err)
      });
  }

  /**
   * Translates a given key (e.g. "SIGNUP.TITLE").
   * Returns the key itself if not found.
   */
  translate(key: string): string {
    const dict = this.translations();
    if (!dict) return key;

    const keys = key.split('.');
    let result: any = dict;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  }
}
