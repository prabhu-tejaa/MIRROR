import { Directive, Input, HostListener, inject } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';

@Directive({
  selector: '[appAnalytics]',
  standalone: true
})
export class AnalyticsDirective {
  private analyticsService = inject(AnalyticsService);

  @Input('appAnalytics') public eventName!: string;
  @Input() public analyticsParams: Record<string, unknown> = {};

  @HostListener('click', ['$event'])
  public onClick(_event: MouseEvent): void {
    if (this.eventName) {
      this.analyticsService.logEvent(this.eventName, {
        ...this.analyticsParams,
        manual_trigger: true
      });
    }
  }
}
