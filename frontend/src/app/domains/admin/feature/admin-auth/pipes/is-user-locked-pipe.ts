import { Pipe, PipeTransform } from '@angular/core';

import { AdminUserResponse } from '../../../../../auth/data-access/auth.model';

@Pipe({
  name: 'isUserLocked',
  standalone: true
})
export class IsUserLockedPipe implements PipeTransform {
  public transform(user: AdminUserResponse): boolean {
    if (user.failedAttempts >= 3) { return true; }
    if (user.lockedUntil) {
      return new Date(user.lockedUntil) > new Date();
    }
    return false;
  }
}
