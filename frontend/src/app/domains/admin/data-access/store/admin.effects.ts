import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ToastService } from '../../../../core/services/toast.service';
import { AdminAuthService } from '../admin-auth.service';
import { AdminMemoryService } from '../admin-memory.service';

import { AdminActions } from './admin.actions';

@Injectable()
export class AdminEffects {
  private actions$: Actions = inject(Actions);
  private adminAuthSvc: AdminAuthService = inject(AdminAuthService);
  private adminMemorySvc: AdminMemoryService = inject(AdminMemoryService);
  private toastSvc: ToastService = inject(ToastService);

  public loadUsers$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.loadUsers),
      switchMap(() =>
        this.adminAuthSvc.getAllUsers().pipe(
          map(users => AdminActions.loadUsersSuccess({ users })),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to load users');
            return of(AdminActions.loadUsersFailure({ error }));
          })
        )
      )
    ) }
  );

  public createUser$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.createUser),
      switchMap(({ request }) =>
        this.adminAuthSvc.createUser(request).pipe(
          map(user => {
            void this.toastSvc.showSuccess('User created successfully');
            return AdminActions.createUserSuccess({ user });
          }),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to create user');
            return of(AdminActions.createUserFailure({ error }));
          })
        )
      )
    ) }
  );

  public updateUser$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.updateUser),
      switchMap(({ id, request }) =>
        this.adminAuthSvc.updateUser(id, request).pipe(
          map(user => {
            void this.toastSvc.showSuccess('User updated successfully');
            return AdminActions.updateUserSuccess({ user });
          }),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to update user');
            return of(AdminActions.updateUserFailure({ error }));
          })
        )
      )
    ) }
  );

  public deleteUser$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.deleteUser),
      switchMap(({ id }) =>
        this.adminAuthSvc.deleteUser(id).pipe(
          map(() => {
            void this.toastSvc.showSuccess('User deleted successfully');
            return AdminActions.deleteUserSuccess({ id });
          }),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to delete user');
            return of(AdminActions.deleteUserFailure({ error }));
          })
        )
      )
    ) }
  );

  public loadMemories$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.loadMemories),
      switchMap(() =>
        this.adminMemorySvc.getAllMemories().pipe(
          map(memories => AdminActions.loadMemoriesSuccess({ memories })),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to load memories');
            return of(AdminActions.loadMemoriesFailure({ error }));
          })
        )
      )
    ) }
  );

  public deleteMemory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.deleteMemory),
      switchMap(({ id }) =>
        this.adminMemorySvc.deleteMemory(id).pipe(
          map((message: string) => {
            void this.toastSvc.showError(message);
            return AdminActions.deleteMemorySuccess({ id, message });
          }),
          catchError((error: Error) => {
            void this.toastSvc.showError('Failed to delete memory');
            return of(AdminActions.deleteMemoryFailure({ error }));
          })
        )
      )
    ) }
  );

  public createMemory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.createMemory),
      switchMap(({ data }) =>
        this.adminMemorySvc.createMemory(data).pipe(
          map((message: string) => {
            void this.toastSvc.showSuccess(message || 'New record created successfully!');
            return AdminActions.createMemorySuccess({ message });
          }),
          catchError((error: Error) => of(AdminActions.createMemoryFailure({ error })))
        )
      )
    ) }
  );

  public updateMemory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.updateMemory),
      switchMap(({ id, data }) =>
        this.adminMemorySvc.updateMemory(id, data).pipe(
          map((message: string) => {
            void this.toastSvc.showSuccess(message || `Record ${id} updated!`);
            return AdminActions.updateMemorySuccess({ message });
          }),
          catchError((error: Error) => of(AdminActions.updateMemoryFailure({ error })))
        )
      )
    ) }
  );

  public uploadMockData$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(AdminActions.uploadMockData),
      switchMap(({ file }) =>
        this.adminMemorySvc.uploadMockData(file).pipe(
          map((message: string) => {
            void this.toastSvc.showSuccess(message);
            return AdminActions.uploadMockDataSuccess({ message });
          }),
          catchError((error: Error) => of(AdminActions.uploadMockDataFailure({ error })))
        )
      )
    ) }
  );
}
