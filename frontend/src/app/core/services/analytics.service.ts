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

  /**
   * Initialize Firebase Analytics for Web and Native
   */
  private async init(): Promise<void> {
    try {
      // 1. Initialize Firebase JS SDK for Web platform
      if (Capacitor.getPlatform() === 'web') {
        const app = initializeApp(environment.firebaseConfig);
        
        // Enable Debug Mode for Web without requiring extensions (only in Dev)
        if (!environment.production) {
          initializeAnalytics(app, {
            config: {
              debug_mode: true
            }
          });
        }
      }

      // 2. Start tracking page views
      this.trackPageViews();

      // 3. Start tracking global interactions (clicks, forms)
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

  /**
   * Unified method to log events across platforms
   */
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

  /**
   * Automatically track clicks and form submissions with semantic naming
   */
  private trackGlobalInteractions(): void {
    // 1. Click Tracking
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Find the nearest interactive parent
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

    // 2. Form Submission Tracking
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

  /**
   * Extract semantic information from an element
   */
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

  /**
   * Generate a readable event name (e.g., login_button_click)
   */
  private getSemanticEventName(metadata: ElementMetadata): string {
    // 1. Manual override takes priority
    if (metadata.analytics_label) {
      return this.slugify(metadata.analytics_label);
    }

    // 2. Map common labels to GA4 recommended events
    const lowerText = metadata.text.toLowerCase();
    if (lowerText.includes('log in') || lowerText.includes('login')) return 'login_click';
    if (lowerText.includes('sign up') || lowerText.includes('register')) return 'sign_up_click';
    if (lowerText.includes('search')) return 'search_click';
    if (lowerText.includes('share')) return 'share_click';

    // 3. Generate name from ID or Name or Text
    const base = metadata.id || metadata.name || metadata.text;
    if (base) {
      return `${this.slugify(base)}_click`;
    }

    // 4. Fallback to generic
    return `${metadata.element_type}_interaction`;
  }

  /**
   * Generate a readable form event name
   */
  private getFormEventName(id: string, name: string): string {
    const base = id || name || 'form';
    if (base.toLowerCase().includes('login')) return 'login_submit';
    if (base.toLowerCase().includes('signup')) return 'signup_submit';
    return `${this.slugify(base)}_submit`;
  }

  /**
   * Utility to convert text to kebab-case
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Helper to scrub potential PII from strings
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Regex for Email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Regex for Phone/CreditCard/SSN (long digits)
    const digitRegex = /\b\d{8,}\b/g;

    return text
      .replace(emailRegex, '[email]')
      .replace(digitRegex, '[number]')
      .trim();
  }

  /**
   * Automatically track screen views on route changes
   */
  private trackPageViews(): void {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(async (event: NavigationEnd) => {
      const screenName = event.urlAfterRedirects || '/';
      
      try {
        await FirebaseAnalytics.setCurrentScreen({
          screenName: screenName
        });
        
        // Also log a general 'page_view' for broader compatibility
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

  /**
   * Track specific user identification
   */
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

  /**
   * Set user properties
   */
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
