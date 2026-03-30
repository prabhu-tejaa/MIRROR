import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { initializeApp } from 'firebase/app';
import { initializeAnalytics } from 'firebase/analytics';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { filter } from 'rxjs/operators';

interface ElementMetadata {
  text: string;
  id: string;
  name: string;
  analytics_label: string;
  element_type: string;
  element_role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router = inject(Router);

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        const app = initializeApp(environment.firebaseConfig);
        
        if (!environment.production) {
          initializeAnalytics(app, {
            config: {
              debug_mode: true
            }
          });
        }
      }

      this.trackPageViews();

      this.trackGlobalInteractions();
      
      if (!environment.production) {
        console.log('Analytics initialized successfully');
      }
    } catch (e) {
      if (!environment.production) {
        console.error('Error initializing analytics:', e);
      }
    }
  }

  public async logEvent(name: string, params: Record<string, unknown> = {}): Promise<void> {
    try {
      await FirebaseAnalytics.logEvent({
        name,
        params
      });
      
      if (!environment.production) {
        console.log(`[Analytics] Event: ${name}`, params);
      }
    } catch (e) {
      if (!environment.production) {
        console.error(`Error logging event ${name}:`, e);
      }
    }
  }

  private trackGlobalInteractions(): void {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const interactiveElement = target.closest('button, a, [role="button"], ion-button, ion-item, ion-segment-button, [data-analytics]');
      
      if (interactiveElement) {
        const el = interactiveElement as HTMLElement;
        const metadata = this.getElementMetadata(el);
        const eventName = this.getSemanticEventName(metadata);

        this.logEvent(eventName, {
          ...metadata,
          page_path: window.location.pathname,
          page_title: document.title,
          platform: Capacitor.getPlatform()
        });
      }
    }, true);

    document.addEventListener('submit', (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || 'anonymous_form';
      const formName = form.getAttribute('name') || 'anonymous_form';
      const eventName = this.getFormEventName(formId, formName);

      this.logEvent(eventName, {
        form_id: formId,
        form_name: formName,
        page_path: window.location.pathname
      });
    }, true);
  }

  private getElementMetadata(el: HTMLElement): ElementMetadata {
    const rawText = el.innerText?.trim() || el.getAttribute('aria-label') || '';
    const text = this.sanitizeText(rawText).substring(0, 40);
    const id = el.id || '';
    const name = el.getAttribute('name') || '';
    const analyticsAttr = el.getAttribute('data-analytics') || '';
    const type = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || '';

    return {
      text,
      id,
      name,
      analytics_label: analyticsAttr,
      element_type: type,
      element_role: role
    };
  }

  private getSemanticEventName(metadata: ElementMetadata): string {
    if (metadata.analytics_label) {
      return this.slugify(metadata.analytics_label);
    }

    const lowerText = metadata.text.toLowerCase();
    if (lowerText.includes('log in') || lowerText.includes('login')) return 'login_click';
    if (lowerText.includes('sign up') || lowerText.includes('register')) return 'sign_up_click';
    if (lowerText.includes('search')) return 'search_click';
    if (lowerText.includes('share')) return 'share_click';

    const base = metadata.id || metadata.name || metadata.text;
    if (base) {
      return `${this.slugify(base)}_click`;
    }

    return `${metadata.element_type}_interaction`;
  }

  private getFormEventName(id: string, name: string): string {
    const base = id || name || 'form';
    if (base.toLowerCase().includes('login')) return 'login_submit';
    if (base.toLowerCase().includes('signup')) return 'signup_submit';
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
    if (!text) return '';
    
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const digitRegex = /\b\d{8,}\b/g;

    return text
      .replace(emailRegex, '[email]')
      .replace(digitRegex, '[number]')
      .trim();
  }

  private trackPageViews(): void {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(async (event: NavigationEnd) => {
      const screenName = event.urlAfterRedirects || '/';
      
      try {
        await FirebaseAnalytics.setCurrentScreen({
          screenName: screenName
        });
        
        await this.logEvent('page_view', {
          page_path: screenName,
          page_title: document.title || 'Mirror App'
        });
      } catch (e) {
        if (!environment.production) {
          console.warn('Could not track screen view:', e);
        }
      }
    });
  }

  public async setUserId(userId: string | null): Promise<void> {
    try {
      await FirebaseAnalytics.setUserId({
        userId: userId
      });
    } catch (e) {
      if (!environment.production) {
        console.error('Error setting user ID:', e);
      }
    }
  }

  public async setUserProperty(name: string, value: string): Promise<void> {
    try {
      await FirebaseAnalytics.setUserProperty({
        key: name,
        value
      });
    } catch (e) {
      if (!environment.production) {
        console.error('Error setting user property:', e);
      }
    }
  }
}
