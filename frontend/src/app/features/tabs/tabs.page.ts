import { Component, EnvironmentInjector, inject, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, person, chatbubbles, personCircle, menuOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
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

  public readonly person = person;
  public readonly chatbubbles = chatbubbles;
  public readonly personCircle = personCircle;

  /** Sidebar expanded state. True = wide with labels, False = slim icons only. */
  public sidebarExpanded = window.innerWidth >= 1280;
  public isDesktop = window.innerWidth >= 1024;

  constructor() {
    addIcons({ person, chatbubbles, personCircle, triangle, ellipse, square, menuOutline, chevronBackOutline, chevronForwardOutline });
  }

  @HostListener('window:resize')
  public onResize(): void {
    const wasDesktop = this.isDesktop;
    this.isDesktop = window.innerWidth >= 1024;
    
    if (window.innerWidth >= 1280 && !wasDesktop) {
      this.sidebarExpanded = true;
    }
    this.cdr.markForCheck();
  }

  public toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    this.cdr.markForCheck();
  }
}
