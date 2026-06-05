import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, mailOutline, shieldOutline, keyOutline } from 'ionicons/icons';

import { ToastService } from '../../../../../core/services/toast.service';
import { AdminUserResponse, AdminUserUpdateRequest } from '../../../../auth/data-access/auth.model';
import { AdminActions } from '../../../data-access/store/admin.actions';

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

  private modalCtrl: ModalController = inject(ModalController);
  private store: Store<any> = inject(Store);
  private actions$: Actions<any> = inject(Actions);
  private toastSvc: ToastService = inject(ToastService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ closeOutline, personOutline, mailOutline, shieldOutline, keyOutline });
  }

  public editForm: { username: string; email: string; role: string; isVerified: boolean; password: string; } = {
    username: '',
    email: '',
    role: '',
    isVerified: false,
    password: ''
  };

  public isSubmitting: boolean = false;

  public ngOnInit(): void {
    if (this.user) {
      this.editForm.username = this.user.username;
      this.editForm.email = this.user.email;
      this.editForm.role = this.user.role;
      this.editForm.isVerified = this.user.isVerified;
    }
  }

  public dismiss(updated: boolean = false): void {
    void this.modalCtrl.dismiss({ updated });
  }

  public save(): void {
    if (!this.editForm.username.trim()) {
      void this.toastSvc.showError('Username cannot be empty');
      return;
    }
    if (!this.editForm.email.trim()) {
      void this.toastSvc.showError('Email cannot be empty');
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

    this.store.dispatch(AdminActions.updateUser({ id: this.user.id, request }));

    this.actions$.pipe(
      ofType(AdminActions.updateUserSuccess),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.dismiss(true);
    });

    this.actions$.pipe(
      ofType(AdminActions.updateUserFailure),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.isSubmitting = false;
    });
  }
}
