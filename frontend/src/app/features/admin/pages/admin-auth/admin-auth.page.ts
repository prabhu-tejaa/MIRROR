import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonTitle, 
  IonContent, 
  IonSearchbar, 
  IonSpinner,
  ModalController,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';
import { AdminUserResponse } from '../../../../core/models/auth.model';
import { ToastService } from '../../../../core/services/toast.service';
import { UserEditModalComponent } from './user-edit-modal/user-edit-modal.component';
import { UserCreateModalComponent } from './user-create-modal/user-create-modal.component';
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
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonButton, 
    IonIcon, 
    IonTitle, 
    IonContent, 
    IonSearchbar, 
    IonSpinner,
    IonSelect,
    IonSelectOption
  ]
})
export class AdminAuthPage implements OnInit {
  private location = inject(Location);
  private adminAuthSvc = inject(AdminAuthService);
  private toastSvc = inject(ToastService);
  private modalCtrl = inject(ModalController);
  private translationSvc = inject(TranslationService);

  public users: AdminUserResponse[] = [];
  public filteredUsers: AdminUserResponse[] = [];
  public searchQuery = '';
  public roleFilter = 'ALL';
  public isLoading = true;

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
    return this.users.filter(u => u.isVerified).length;
  }

  public getLockedCount(): number {
    return this.users.filter(u => this.isUserLocked(u)).length;
  }

  public unlockUser(user: AdminUserResponse) {
    if (confirm(`Are you sure you want to unlock the account for ${user.username}?`)) {
      this.adminAuthSvc.updateUser(user.id, { failedAttempts: 0, lockedUntil: null }).subscribe({
        next: () => {
          this.toastSvc.showSuccess(`Account unlocked for ${user.username}`);
          this.loadUsers();
        },
        error: () => {
          this.toastSvc.showError('Failed to unlock account');
        }
      });
    }
  }

  public goBack() {
    this.location.back();
  }

  public loadUsers() {
    this.isLoading = true;
    this.adminAuthSvc.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.toastSvc.showError('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  public applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchQuery ? true : (
        user.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      const matchesRole = this.roleFilter === 'ALL' ? true : user.role === this.roleFilter;
      return matchesSearch && matchesRole;
    });
  }

  public async editUser(user: AdminUserResponse) {
    const modal = await this.modalCtrl.create({
      component: UserEditModalComponent,
      componentProps: { user: { ...user } },
      cssClass: 'glassy-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.updated) {
      this.loadUsers();
    }
  }

  public deleteUser(user: AdminUserResponse) {
    if (confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`)) {
      this.adminAuthSvc.deleteUser(user.id).subscribe({
        next: () => {
          this.toastSvc.showSuccess('User deleted successfully');
          this.loadUsers();
        },
        error: () => {
          this.toastSvc.showError('Failed to delete user');
        }
      });
    }
  }

  public async addUser() {
    const modal = await this.modalCtrl.create({
      component: UserCreateModalComponent,
      cssClass: 'glassy-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.created) {
      this.loadUsers();
    }
  }
}
