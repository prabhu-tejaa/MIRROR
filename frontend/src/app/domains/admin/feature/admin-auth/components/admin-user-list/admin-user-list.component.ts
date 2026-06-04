import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { AdminUserResponse } from '../../../../../auth/data-access/auth.model';

@Component({
  selector: 'app-admin-user-list',
  templateUrl: './admin-user-list.component.html',
  styleUrls: ['./admin-user-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserListComponent {
  @Input() public users: AdminUserResponse[] = [];
  @Input() public isLoading = false;
  
  @Output() public edit = new EventEmitter<AdminUserResponse>();
  @Output() public delete = new EventEmitter<AdminUserResponse>();
  @Output() public unlock = new EventEmitter<AdminUserResponse>();

  public isUserLocked(user: AdminUserResponse): boolean {
    if (user.failedAttempts >= 3) return true;
    if (user.lockedUntil) {
      return new Date(user.lockedUntil) > new Date();
    }
    return false;
  }
}
