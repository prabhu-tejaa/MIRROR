import { Component, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUpOutline } from 'ionicons/icons';

@Component({
  selector: 'app-scroll-assistant',
  templateUrl: './scroll-assistant.component.html',
  styleUrls: ['./scroll-assistant.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollAssistantComponent {
  private cdr = inject(ChangeDetectorRef);
  private readonly threshold: number = 400;
  
  public isVisible: boolean = false;
  public readonly arrowUpOutline = arrowUpOutline;

  constructor() {
    addIcons({ arrowUpOutline });
  }

  @HostListener('window:scroll')
  public onWindowScroll(): void {
    const scrollOffset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const shouldBeVisible = scrollOffset > this.threshold;
    
    if (this.isVisible !== shouldBeVisible) {
      this.isVisible = shouldBeVisible;
      this.cdr.markForCheck();
    }
  }

  public scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
