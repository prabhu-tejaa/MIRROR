import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { AdminAuthService } from '../../../../../core/services/admin-auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { AdminCreateUserRequest } from '../../../../../core/models/auth.model';

import { addIcons } from 'ionicons';
import { closeOutline, personOutline, mailOutline, shieldOutline, keyOutline, personAddOutline } from 'ionicons/icons';

@Component({
  selector: 'app-user-create-modal',
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class UserCreateModalComponent {
  private modalCtrl = inject(ModalController);
  private adminAuthSvc = inject(AdminAuthService);
  private toastSvc = inject(ToastService);

  constructor() {
    addIcons({ closeOutline, personOutline, mailOutline, shieldOutline, keyOutline, personAddOutline });
  }

  public createForm = {
    username: '',
    email: '',
    password: '',
    role: 'ROLE_USER'
  };

  public isSubmitting = false;

  public dismiss(created = false) {
    this.modalCtrl.dismiss({ created });
  }

  public create() {
    if (!this.createForm.username.trim()) {
      this.toastSvc.showError('Username is required');
      return;
    }
    if (!this.createForm.email.trim()) {
      this.toastSvc.showError('Email is required');
      return;
    }
    if (!this.createForm.password.trim()) {
      this.toastSvc.showError('Password is required');
      return;
    }
    if (this.createForm.password.trim().length < 6) {
      this.toastSvc.showError('Password must be at least 6 characters');
      return;
    }

    this.isSubmitting = true;
    const request: AdminCreateUserRequest = {
      username: this.createForm.username.trim(),
      email: this.createForm.email.trim(),
      password: this.createForm.password.trim(),
      role: this.createForm.role
    };

    this.adminAuthSvc.createUser(request).subscribe({
      next: () => {
        this.toastSvc.showSuccess(`User "${request.username}" created successfully`);
        this.dismiss(true);
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Failed to create user';
        this.toastSvc.showError(errorMsg);
        this.isSubmitting = false;
      }
    });
  }
}
