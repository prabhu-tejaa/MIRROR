import { Component, HostListener, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowUpOutline } from 'ionicons/icons';

@Component({
  selector: 'app-scroll-assistant',
  templateUrl: './scroll-assistant.component.html',
  styleUrls: ['./scroll-assistant.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollAssistantComponent {
  private cdr = inject(ChangeDetectorRef);
  
  isVisible = false;
  private readonly threshold = 400; // Only trigger if scrolled way down

  constructor() {
    addIcons({ arrowUpOutline });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollOffset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const shouldBeVisible = scrollOffset > this.threshold;
    
    if (this.isVisible !== shouldBeVisible) {
      this.isVisible = shouldBeVisible;
      this.cdr.markForCheck();
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
