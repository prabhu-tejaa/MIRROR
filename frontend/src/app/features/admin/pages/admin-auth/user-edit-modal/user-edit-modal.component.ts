import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonToggle,
  ModalController 
} from '@ionic/angular/standalone';
import { AdminAuthService } from '../../../../../core/services/admin-auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { AdminUserResponse, AdminUserUpdateRequest } from '../../../../../core/models/auth.model';

import { addIcons } from 'ionicons';
import { closeOutline, personOutline, mailOutline, shieldOutline, keyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-user-edit-modal',
  templateUrl: './user-edit-modal.component.html',
  styleUrls: ['./user-edit-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonButton, 
    IonIcon, 
    IonContent, 
    IonToggle
  ]
})
export class UserEditModalComponent implements OnInit {
  @Input() public user!: AdminUserResponse;

  private modalCtrl = inject(ModalController);
  private adminAuthSvc = inject(AdminAuthService);
  private toastSvc = inject(ToastService);

  constructor() {
    addIcons({ closeOutline, personOutline, mailOutline, shieldOutline, keyOutline });
  }

  public editForm = {
    username: '',
    email: '',
    role: '',
    isVerified: false,
    password: ''
  };

  public isSubmitting = false;

  public ngOnInit() {
    if (this.user) {
      this.editForm.username = this.user.username;
      this.editForm.email = this.user.email;
      this.editForm.role = this.user.role;
      this.editForm.isVerified = this.user.isVerified;
    }
  }

  public dismiss(updated = false) {
    this.modalCtrl.dismiss({ updated });
  }

  public save() {
    if (!this.editForm.username.trim()) {
      this.toastSvc.showError('Username cannot be empty');
      return;
    }
    if (!this.editForm.email.trim()) {
      this.toastSvc.showError('Email cannot be empty');
      return;
    }

    this.isSubmitting = true;
    const request: AdminUserUpdateRequest = {
      username: this.editForm.username,
      email: this.editForm.email,
      role: this.editForm.role,
      isVerified: this.editForm.isVerified
    };

    if (this.editForm.password && this.editForm.password.trim()) {
      request.password = this.editForm.password.trim();
    }

    this.adminAuthSvc.updateUser(this.user.id, request).subscribe({
      next: () => {
        this.toastSvc.showSuccess('User updated successfully');
        this.dismiss(true);
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Failed to update user';
        this.toastSvc.showError(errorMsg);
        this.isSubmitting = false;
      }
    });
  }
}
