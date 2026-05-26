import { Component, EnvironmentInjector, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, person, chatbubbles, personCircle, menuOutline, chevronBackOutline, chevronForwardOutline, heart, heartOutline, chatbubblesOutline, personCircleOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsPage {
  private environmentInjector = inject(EnvironmentInjector);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  public readonly person = person;
  public readonly chatbubbles = chatbubbles;
  public readonly personCircle = personCircle;
  public readonly heart = heart;
  
  public readonly heartOutline = heartOutline;
  public readonly chatbubblesOutline = chatbubblesOutline;
  public readonly personCircleOutline = personCircleOutline;

  public sidebarExpanded = this.initSidebarState();
  public isDesktop = window.innerWidth >= 1024;
  public currentUrl = '';

  private initSidebarState(): boolean {
    const savedState = localStorage.getItem('sidebarExpanded');
    if (savedState !== null) {
      return savedState === 'true';
    }
    return window.innerWidth >= 1280;
  }

  constructor() {
    addIcons({ 
      person, 
      chatbubbles, 
      personCircle, 
      triangle, 
      ellipse, 
      square, 
      menuOutline, 
      chevronBackOutline, 
      chevronForwardOutline, 
      heart, 
      heartOutline, 
      chatbubblesOutline, 
      personCircleOutline 
    });

    this.currentUrl = this.router.url;
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentUrl = event.urlAfterRedirects || event.url;
      this.cdr.markForCheck();
    });
  }

  @HostListener('window:resize')
  public onResize(): void {
    const wasDesktop = this.isDesktop;
    this.isDesktop = window.innerWidth >= 1024;
    
    if (window.innerWidth >= 1280 && !wasDesktop) {
      this.sidebarExpanded = this.initSidebarState();
    }
    this.cdr.markForCheck();
  }

  public toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    localStorage.setItem('sidebarExpanded', String(this.sidebarExpanded));
    this.cdr.markForCheck();
  }

  public isActive(tab: string): boolean {
    return this.currentUrl.includes('/tabs/' + tab);
  }
}

