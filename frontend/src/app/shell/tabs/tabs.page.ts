import { Component, EnvironmentInjector, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, person, chatbubbles, personCircle, menuOutline, chevronBackOutline, chevronForwardOutline, heart, heartOutline, chatbubblesOutline, personCircleOutline } from 'ionicons/icons';
import { filter } from 'rxjs';

import { StorageKeys } from '../../core/constants/storage.constants';
import { StorageService } from '../../core/services/storage.service';
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
  private environmentInjector: EnvironmentInjector = inject(EnvironmentInjector);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private router: Router = inject(Router);
  private storageSvc: StorageService = inject(StorageService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public readonly person: string = person;
  public readonly chatbubbles: string = chatbubbles;
  public readonly personCircle: string = personCircle;
  public readonly heart: string = heart;
  
  public readonly heartOutline: string = heartOutline;
  public readonly chatbubblesOutline: string = chatbubblesOutline;
  public readonly personCircleOutline: string = personCircleOutline;

  public sidebarExpanded: boolean = this.initSidebarState();
  public isDesktop: boolean = window.innerWidth >= 1024;
  public currentUrl: string = '';

  private initSidebarState(): boolean {
    const savedState: string | null = this.storageSvc.get(StorageKeys.SIDEBAR_EXPANDED);
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
    const wasDesktop: boolean = this.isDesktop;
    this.isDesktop = window.innerWidth >= 1024;
    
    if (window.innerWidth >= 1280 && !wasDesktop) {
      this.sidebarExpanded = this.initSidebarState();
    }
    this.cdr.markForCheck();
  }

  public toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    this.storageSvc.set(StorageKeys.SIDEBAR_EXPANDED, String(this.sidebarExpanded));
  }

  public isActive(tab: string): boolean {
    return this.currentUrl.includes('/tabs/' + tab);
  }

  public navigateTab(tab: string): void {
    if (this.isActive(tab)) {return;}
    void this.router.navigate(['/tabs', tab], { replaceUrl: true });
  }

  public get isYouActiveValue(): boolean { return this.isActive('you'); }
  public get isChatActiveValue(): boolean { return this.isActive('chat'); }
  public get isProfileActiveValue(): boolean { return this.isActive('profile'); }
}
