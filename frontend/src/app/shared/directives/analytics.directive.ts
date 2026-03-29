import { Directive, Input, HostListener, inject } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';

@Directive({
  selector: '[appAnalytics]',
  standalone: true
})
export class AnalyticsDirective {
  private analyticsService = inject(AnalyticsService);

  @Input('appAnalytics') eventName!: string;
  @Input() analyticsParams: any = {};

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (this.eventName) {
      this.analyticsService.logEvent(this.eventName, {
        ...this.analyticsParams,
        manual_trigger: true
      });
    }
  }
}
