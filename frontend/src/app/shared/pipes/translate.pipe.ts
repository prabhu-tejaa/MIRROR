import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // necessary since translations can load asynchronously and change
})
export class TranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);

  public transform(key: string, params?: Record<string, unknown>): string {
    return this.translationService.translate(key, params);
  }
}
