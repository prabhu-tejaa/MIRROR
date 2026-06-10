import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { initializeAnalytics } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { filter } from 'rxjs';

import { environment } from '../../../environments/environment';


interface ElementMetadata {
  text: string;
  id: string;
  name: string;
  analyticsLabel: string;
  elementType: string;
  elementRole: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router: Router = inject(Router);

  constructor() {
    this.init();
  }

  private isFirebaseConfigured(): boolean {
    if (environment.mock) {
      return false;
    }
    if (Capacitor.getPlatform() !== 'web') {
      return true;
    }
    return this.hasValidWebConfig();
  }

  private hasValidWebConfig(): boolean {
    return !!(environment.firebaseConfig
      && environment.firebaseConfig.projectId
      && environment.firebaseConfig.apiKey
      && environment.firebaseConfig.databaseURL);
  }

  private init(): void {
    try {
      this.initFirebase();
      this.trackPageViews();
      this.trackGlobalInteractions();
    } catch {
      // Intentionally swallowed to avoid console output in production
    }
  }

  private initFirebase(): void {
    if (this.isFirebaseConfigured() && Capacitor.getPlatform() === 'web') {
      const app = initializeApp(environment.firebaseConfig);
      if (!environment.production) {
        initializeAnalytics(app, { config: { ['debug_mode']: true } });
      }
    }
  }

  public async logEvent(name: string, params: Record<string, unknown> = {}): Promise<void> {
    try {
      if (!this.isFirebaseConfigured()) {
        return;
      }
      await FirebaseAnalytics.logEvent({ name, params });
    } catch {
      return;
    }
  }

  private trackGlobalInteractions(): void {
    document.addEventListener('click', this.handleClickEvent.bind(this), true);
    document.addEventListener('submit', this.handleSubmitEvent.bind(this), true);
  }

  private handleClickEvent(event: MouseEvent): void {
    const target: HTMLElement = event.target as HTMLElement;
    const interactiveEl: Element | null = target.closest('button, a, [role="button"], ion-button, ion-item, ion-segment-button, [data-analytics]');
    if (!interactiveEl) {
      return;
    }
    const el: HTMLElement = interactiveEl as HTMLElement;
    const metadata: ElementMetadata = this.getElementMetadata(el);
    const eventName: string = this.getSemanticEventName(metadata);
    const params: Record<string, unknown> = this.buildClickParams(metadata);
    void this.logEvent(eventName, params);
  }

  private buildClickParams(metadata: ElementMetadata): Record<string, unknown> {
    return {
      ['text']: metadata.text,
      ['id']: metadata.id,
      ['name']: metadata.name,
      ['analytics_label']: metadata.analyticsLabel,
      ['element_type']: metadata.elementType,
      ['element_role']: metadata.elementRole,
      ['page_path']: window.location.pathname,
      ['page_title']: document.title,
      ['platform']: Capacitor.getPlatform()
    };
  }

  private handleSubmitEvent(event: SubmitEvent): void {
    const form: HTMLFormElement = event.target as HTMLFormElement;
    const formId: string = form.id || 'anonymous_form';
    const formName: string = form.getAttribute('name') || 'anonymous_form';
    const eventName: string = this.getFormEventName(formId, formName);
    void this.logEvent(eventName, {
      ['form_id']: formId,
      ['form_name']: formName,
      ['page_path']: window.location.pathname
    });
  }

  private getElementMetadata(el: HTMLElement): ElementMetadata {
    const rawText: string = el.innerText?.trim() || el.getAttribute('aria-label') || '';
    const text: string = this.sanitizeText(rawText).substring(0, 40);
    const id: string = el.id || '';
    const name: string = el.getAttribute('name') || '';
    const analyticsAttr: string = el.getAttribute('data-analytics') || '';
    const type: string = el.tagName.toLowerCase();
    const role: string = el.getAttribute('role') || '';

    return {
      text,
      id,
      name,
      analyticsLabel: analyticsAttr,
      elementType: type,
      elementRole: role
    };
  }

  private getSemanticEventName(metadata: ElementMetadata): string {
    if (metadata.analyticsLabel) {
      return this.slugify(metadata.analyticsLabel);
    }
    const lowerText: string = metadata.text.toLowerCase();
    const matchedKeyword: string | null = this.matchEventKeyword(lowerText);
    if (matchedKeyword) {
      return matchedKeyword;
    }

    const base: string = metadata.id || metadata.name || metadata.text;
    if (base) {
      return `${this.slugify(base)}_click`;
    }

    return `${metadata.elementType}_interaction`;
  }

  private matchEventKeyword(lowerText: string): string | null {
    if (lowerText.includes('log in') || lowerText.includes('login')) {return 'login_click';}
    if (lowerText.includes('sign up') || lowerText.includes('register')) {return 'sign_up_click';}
    if (lowerText.includes('search')) {return 'search_click';}
    if (lowerText.includes('share')) {return 'share_click';}
    return null;
  }

  private getFormEventName(id: string, name: string): string {
    const base: string = id || name || 'form';
    if (base.toLowerCase().includes('login')) {return 'login_submit';}
    if (base.toLowerCase().includes('signup')) {return 'signup_submit';}
    return `${this.slugify(base)}_submit`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeText(text: string): string {
    if (!text) {return '';}
    
    const emailRegex: RegExp = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const digitRegex: RegExp = /\b\d{8,}\b/g;

    return text
      .replace(emailRegex, '[email]')
      .replace(digitRegex, '[number]')
      .trim();
  }

  private trackPageViews(): void {
    this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.handleNavigationEnd(event);
    });
  }

  private handleNavigationEnd(event: NavigationEnd): void {
    const screenName: string = event.urlAfterRedirects || '/';
    void this.logPageView(screenName);
  }

  private async logPageView(screenName: string): Promise<void> {
    try {
      if (!this.isFirebaseConfigured()) {
        await this.logEvent('page_view', { ['page_path']: screenName, ['page_title']: document.title || 'Mirror App' });
        return;
      }
      await FirebaseAnalytics.setCurrentScreen({ screenName });
      await this.logEvent('page_view', { ['page_path']: screenName, ['page_title']: document.title || 'Mirror App' });
    } catch {
      return;
    }
  }

  public async setUserId(userId: string | null): Promise<void> {
    try {
      if (!this.isFirebaseConfigured()) {
        return;
      }
      await FirebaseAnalytics.setUserId({ userId: userId || '' });
    } catch {
      return;
    }
  }

  public async setUserProperty(name: string, value: string): Promise<void> {
    try {
      if (!this.isFirebaseConfigured()) {
        return;
      }
      await FirebaseAnalytics.setUserProperty({ key: name, value });
    } catch {
      return;
    }
  }
}
