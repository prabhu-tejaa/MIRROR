import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SplashScreenComponent — Premium splash overlay.
 *
 * Displays over the starfield background with the app branding,
 * then fades out after a configurable duration.
 *
 * Usage:
 *   <app-splash-screen (dismissed)="onSplashDone()"></app-splash-screen>
 */
@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss'],
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  /** How long the splash stays fully visible (ms) */
  @Input() displayDuration = 2800;

  /** Fade-out animation duration (ms) */
  @Input() fadeOutDuration = 800;

  /** App title text */
  @Input() title = 'MIRЯOЯ';

  /** Tagline below the title */
  @Input() tagline = 'Reflect. Discover. Grow.';

  /** Emitted when splash is fully dismissed */
  @Output() dismissed = new EventEmitter<void>();

  visible = true;
  fadingOut = false;

  private timeout1: any;
  private timeout2: any;

  ngOnInit(): void {
    // Start fade-out after display duration
    this.timeout1 = setTimeout(() => {
      this.fadingOut = true;

      // Remove from DOM after fade completes
      this.timeout2 = setTimeout(() => {
        this.visible = false;
        this.dismissed.emit();
      }, this.fadeOutDuration);
    }, this.displayDuration);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timeout1);
    clearTimeout(this.timeout2);
  }
}
