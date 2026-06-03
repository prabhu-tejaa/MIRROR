import { Component, inject, DestroyRef } from '@angular/core';
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
  ModalController 
} from '@ionic/angular/standalone';
import { AdminAuthService } from '../../../data-access/admin-auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { AdminCreateUserRequest } from '../../../../../core/models/auth.model';

import { addIcons } from 'ionicons';
import { closeOutline, personOutline, mailOutline, shieldOutline, keyOutline, personAddOutline } from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-create-modal',
  templateUrl: './user-create-modal.component.html',
  styleUrls: ['./user-create-modal.component.scss'],
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
    IonContent
  ]
})
export class UserCreateModalComponent {
  private modalCtrl = inject(ModalController);
  private adminAuthSvc = inject(AdminAuthService);
  private toastSvc = inject(ToastService);
  private destroyRef = inject(DestroyRef);

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

    this.adminAuthSvc.createUser(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastSvc.showSuccess(`User "${request.username}" created successfully`);
        this.dismiss(true);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
