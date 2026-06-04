import { Component, EnvironmentInjector, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, DestroyRef } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, person, chatbubbles, personCircle, menuOutline, chevronBackOutline, chevronForwardOutline, heart, heartOutline, chatbubblesOutline, personCircleOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { StorageService } from '../../core/services/storage.service';
import { StorageKeys } from '../../core/constants/storage.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private storageSvc = inject(StorageService);
  private destroyRef = inject(DestroyRef);

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
    const savedState = this.storageSvc.get(StorageKeys.SIDEBAR_EXPANDED);
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
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed()
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
    this.storageSvc.set(StorageKeys.SIDEBAR_EXPANDED, String(this.sidebarExpanded));
    this.cdr.markForCheck();
  }

  public isActive(tab: string): boolean {
    return this.currentUrl.includes('/tabs/' + tab);
  }

  public navigateTab(tab: string): void {
    if (this.isActive(tab)) return;
    this.router.navigate(['/tabs', tab], { replaceUrl: true });
  }
}

