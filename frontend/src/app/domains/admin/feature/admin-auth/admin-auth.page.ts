import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonSearchbar, 
  IonSpinner,
  ModalController,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { AdminActions } from '../../data-access/store/admin.actions';
import { selectUsers, selectUsersLoading } from '../../data-access/store/admin.selectors';
import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { UserEditModalComponent } from './user-edit-modal/user-edit-modal.component';
import { UserCreateModalComponent } from './user-create-modal/user-create-modal.component';
import { AdminUserListComponent } from './components/admin-user-list/admin-user-list.component';
import { TranslationService } from '../../../../core/services/translation.service';

import { addIcons } from 'ionicons';
import { arrowBackOutline, refreshOutline, peopleOutline, checkmarkCircleOutline, warningOutline, createOutline, trashOutline, lockClosedOutline, keyOutline, personAddOutline } from 'ionicons/icons';

@Component({
  selector: 'app-admin-auth',
  templateUrl: './admin-auth.page.html',
  styleUrls: ['./admin-auth.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonButton, 
    IonIcon, 
    IonContent, 
    IonSearchbar, 
    IonSpinner,
    IonSelect,
    IonSelectOption,
    AdminUserListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAuthPage implements OnInit {
  private location = inject(Location);
  private store = inject(Store);
  private modalCtrl = inject(ModalController);
  private translationSvc = inject(TranslationService);

  public users = this.store.selectSignal(selectUsers);
  public isLoading = this.store.selectSignal(selectUsersLoading);

  public searchQuery = signal('');
  public roleFilter = signal('ALL');

  public filteredUsers = computed(() => {
    const allUsers = this.users() || [];
    return allUsers.filter(user => {
      const query = this.searchQuery().toLowerCase();
      const matchesSearch = !query ? true : (
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      const matchesRole = this.roleFilter() === 'ALL' ? true : user.role === this.roleFilter();
      return matchesSearch && matchesRole;
    });
  });

  constructor() {
    addIcons({ arrowBackOutline, refreshOutline, peopleOutline, checkmarkCircleOutline, warningOutline, createOutline, trashOutline, lockClosedOutline, keyOutline, personAddOutline });
  }

  public ngOnInit() {
    this.translationSvc.initTranslations('en').then(() => {
      this.loadUsers();
    });
  }

  public isUserLocked(user: AdminUserResponse): boolean {
    if (user.failedAttempts >= 3) return true;
    if (user.lockedUntil) {
      return new Date(user.lockedUntil) > new Date();
    }
    return false;
  }

  public getVerifiedCount(): number {
    return (this.users() || []).filter(u => u.isVerified).length;
  }

  public getLockedCount(): number {
    return (this.users() || []).filter(u => this.isUserLocked(u)).length;
  }

  public unlockUser(user: AdminUserResponse) {
    if (confirm(`Are you sure you want to unlock the account for ${user.username}?`)) {
      this.store.dispatch(AdminActions.updateUser({ id: user.id, request: { failedAttempts: 0, lockedUntil: null } }));
    }
  }

  public goBack() {
    this.location.back();
  }

  public loadUsers() {
    this.store.dispatch(AdminActions.loadUsers());
  }

  public updateSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value || '');
  }

  public updateRoleFilter(event: CustomEvent) {
    this.roleFilter.set(event.detail.value || 'ALL');
  }

  public async editUser(user: AdminUserResponse) {
    const modal = await this.modalCtrl.create({
      component: UserEditModalComponent,
      componentProps: { user: { ...user } },
      cssClass: 'glassy-modal'
    });
    await modal.present();
  }

  public deleteUser(user: AdminUserResponse) {
    if (confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
      this.store.dispatch(AdminActions.deleteUser({ id: user.id }));
    }
  }

  public async addUser() {
    const modal = await this.modalCtrl.create({
      component: UserCreateModalComponent,
      cssClass: 'glassy-modal'
    });
    await modal.present();
  }
}
