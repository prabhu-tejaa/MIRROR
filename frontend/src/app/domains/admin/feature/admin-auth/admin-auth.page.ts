import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
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
import { addIcons } from 'ionicons';
import { arrowBackOutline, refreshOutline, peopleOutline, checkmarkCircleOutline, warningOutline, createOutline, trashOutline, lockClosedOutline, keyOutline, personAddOutline } from 'ionicons/icons';

import { TranslationService } from '../../../../core/services/translation.service';
import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { AdminActions } from '../../data-access/store/admin.actions';
import { selectUsers, selectUsersLoading } from '../../data-access/store/admin.selectors';

import { AdminUserListComponent } from './components/admin-user-list/admin-user-list.component';
import { UserCreateModalComponent } from './user-create-modal/user-create-modal.component';
import { UserEditModalComponent } from './user-edit-modal/user-edit-modal.component';



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
  private location: Location = inject(Location);
  private store: Store = inject(Store);
  private modalCtrl: ModalController = inject(ModalController);
  private translationSvc: TranslationService = inject(TranslationService);

  public users = this.store.selectSignal(selectUsers);
  public isLoading = this.store.selectSignal(selectUsersLoading);

  public searchQuery = signal('');
  public roleFilter = signal('ALL');

  public filteredUsers = computed(() => {
    const allUsers: AdminUserResponse[] = this.users() || [];
    return allUsers.filter((user: AdminUserResponse) => {
      const query: string = this.searchQuery().toLowerCase();
      const matchesSearch: boolean = !query ? true : (
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      const matchesRole: boolean = this.roleFilter() === 'ALL' ? true : user.role === this.roleFilter();
      return matchesSearch && matchesRole;
    });
  });

  constructor() {
    addIcons({ arrowBackOutline, refreshOutline, peopleOutline, checkmarkCircleOutline, warningOutline, createOutline, trashOutline, lockClosedOutline, keyOutline, personAddOutline });
  }

  public ngOnInit(): void {
    void this.translationSvc.initTranslations('en').then(() => {
            this.loadUsers();
          });
  }

  public isUserLocked(user: AdminUserResponse): boolean {
    if (user.failedAttempts >= 3) {return true;}
    if (user.lockedUntil) {
      return new Date(user.lockedUntil) > new Date();
    }
    return false;
  }

  public verifiedCount = computed(() => {
    return (this.users() || []).filter((u: AdminUserResponse) => u.isVerified).length;
  });

  public lockedCount = computed(() => {
    return (this.users() || []).filter((u: AdminUserResponse) => this.isUserLocked(u)).length;
  });

  public unlockUser(user: AdminUserResponse): void {
    if (confirm(`Are you sure you want to unlock the account for ${user.username}?`)) {
      this.store.dispatch(AdminActions.updateUser({ id: user.id, request: { failedAttempts: 0, lockedUntil: null } }));
    }
  }

  public goBack(): void {
    this.location.back();
  }

  public loadUsers(): void {
    this.store.dispatch(AdminActions.loadUsers());
  }

  public updateSearch(event: CustomEvent): void {
    this.searchQuery.set(event.detail.value || '');
  }

  public updateRoleFilter(event: CustomEvent): void {
    this.roleFilter.set(event.detail.value || 'ALL');
  }

  public async editUser(user: AdminUserResponse): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalCtrl.create({
      component: UserEditModalComponent,
      componentProps: { user: { ...user } },
      cssClass: 'glassy-modal'
    });
    await modal.present();
  }

  public deleteUser(user: AdminUserResponse): void {
    if (confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
      this.store.dispatch(AdminActions.deleteUser({ id: user.id }));
    }
  }

  public async addUser(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalCtrl.create({
      component: UserCreateModalComponent,
      cssClass: 'glassy-modal'
    });
    await modal.present();
  }

  public get isLoadingValue(): boolean {
    return this.isLoading();
  }

  public get usersList(): AdminUserResponse[] {
    return this.users() || [];
  }

  public get verifiedCountValue(): number {
    return this.verifiedCount();
  }

  public get lockedCountValue(): number {
    return this.lockedCount();
  }

  public get searchQueryValue(): string {
    return this.searchQuery();
  }

  public get roleFilterValue(): string {
    return this.roleFilter();
  }

  public get filteredUsersList(): AdminUserResponse[] {
    return this.filteredUsers();
  }
}
