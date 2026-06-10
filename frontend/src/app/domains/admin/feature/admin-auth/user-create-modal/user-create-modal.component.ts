import { CommonModule } from '@angular/common';
import { Component, inject, DestroyRef } from '@angular/core';
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
  ModalController 
} from '@ionic/angular/standalone';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { addIcons } from 'ionicons';
import { closeOutline, personOutline, mailOutline, shieldOutline, keyOutline, personAddOutline } from 'ionicons/icons';

import { ToastService } from '../../../../../core/services/toast.service';
import { AdminCreateUserRequest } from '../../../../auth/data-access/auth.model';
import { AdminActions } from '../../../data-access/store/admin.actions';

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
  private modalCtrl: ModalController = inject(ModalController);
  private store: Store<object> = inject<Store<object>>(Store);
  private actions$: Actions<import('@ngrx/store').Action<string>> = inject<Actions<import('@ngrx/store').Action<string>>>(Actions);
  private toastSvc: ToastService = inject(ToastService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ closeOutline, personOutline, mailOutline, shieldOutline, keyOutline, personAddOutline });
  }

  public createForm: { username: string; email: string; password: string; role: string; } = {
    username: '',
    email: '',
    password: '',
    role: 'ROLE_USER'
  };

  public isSubmitting: boolean = false;

  public dismiss(created: boolean = false): void {
    void this.modalCtrl.dismiss({ created });
  }

  private validateForm(): boolean {
    if (!this.createForm.username.trim()) { void this.toastSvc.showError('Username is required'); return false; }
    if (!this.createForm.email.trim()) { void this.toastSvc.showError('Email is required'); return false; }
    if (!this.createForm.password.trim()) { void this.toastSvc.showError('Password is required'); return false; }
    if (this.createForm.password.trim().length < 6) { void this.toastSvc.showError('Password must be at least 6 characters'); return false; }
    return true;
  }

  public create(): void {
    if (!this.validateForm()) { return; }

    this.isSubmitting = true;
    const request: AdminCreateUserRequest = {
      username: this.createForm.username.trim(),
      email: this.createForm.email.trim(),
      password: this.createForm.password.trim(),
      role: this.createForm.role
    };

    this.store.dispatch(AdminActions.createUser({ request }));

    this.actions$.pipe(
      ofType(AdminActions.createUserSuccess),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.dismiss(true));

    this.actions$.pipe(
      ofType(AdminActions.createUserFailure),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => { this.isSubmitting = false; });
  }
}
