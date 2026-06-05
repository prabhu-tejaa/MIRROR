import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userInitials',
  standalone: true
})
export class UserInitialsPipe implements PipeTransform {
  public transform(username: string): string {
    if (!username) { return ''; }
    return username.charAt(0).toUpperCase();
  }
}
