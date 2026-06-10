
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, NgZone, OnInit, OnDestroy } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUpOutline } from 'ionicons/icons';

@Component({
  selector: 'app-scroll-assistant',
  templateUrl: './scroll-assistant.component.html',
  styleUrls: ['./scroll-assistant.component.scss'],
  standalone: true,
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollAssistantComponent implements OnInit, OnDestroy {
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private ngZone: NgZone = inject(NgZone);
  private readonly threshold: number = 400;
  
  public isVisible: boolean = false;
  public readonly arrowUpOutline: string = arrowUpOutline;
  private scrollListener: () => void;

  constructor() {
    addIcons({ arrowUpOutline });
    this.scrollListener = this.onWindowScroll.bind(this);
  }

  public ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollListener, { passive: true });
    });
  }

  public ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollListener);
  }

  private onWindowScroll(): void {
    const scrollOffset: number = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const shouldBeVisible: boolean = scrollOffset > this.threshold;
    
    if (this.isVisible !== shouldBeVisible) {
      this.ngZone.run(() => {
        this.isVisible = shouldBeVisible;
        this.cdr.markForCheck();
      });
    }
  }

  public scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
