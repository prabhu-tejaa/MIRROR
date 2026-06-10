import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

import { AdminUserResponse } from '../../../../../auth/data-access/auth.model';
import { IsUserLockedPipe } from '../../pipes/is-user-locked-pipe';
import { UserInitialsPipe } from '../../pipes/user-initials-pipe';

@Component({
  selector: 'app-admin-user-list',
  templateUrl: './admin-user-list.component.html',
  styleUrls: ['./admin-user-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IsUserLockedPipe, UserInitialsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserListComponent {
  @Input() public users: AdminUserResponse[] = [];
  @Input() public isLoading: boolean = false;
  
  @Output() public edit: EventEmitter<AdminUserResponse> = new EventEmitter<AdminUserResponse>();
  @Output() public delete: EventEmitter<AdminUserResponse> = new EventEmitter<AdminUserResponse>();
  @Output() public unlock: EventEmitter<AdminUserResponse> = new EventEmitter<AdminUserResponse>();
  @Output() public lock: EventEmitter<AdminUserResponse> = new EventEmitter<AdminUserResponse>();

}
