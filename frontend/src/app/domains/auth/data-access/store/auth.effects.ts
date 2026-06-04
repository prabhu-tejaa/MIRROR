import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { AuthActions } from './auth.actions';
import { StorageService } from '../../../../core/services/storage.service';
import { StorageKeys, getActiveSessionKey } from '../../../../core/constants/storage.constants';
import { Router } from '@angular/router';
import { RoutePaths } from '../../../../core/constants/route.constants';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private storageSvc = inject(StorageService);
  private router = inject(Router);

  public loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(({ response }) => {
        this.storageSvc.set(StorageKeys.ACCESS_TOKEN, response.accessToken);
        this.storageSvc.set(StorageKeys.REFRESH_TOKEN, response.refreshToken);
        this.storageSvc.set(StorageKeys.USERNAME, response.username);
        
        if (response.email) {
          this.storageSvc.set(StorageKeys.EMAIL, response.email);
          let id = this.storageSvc.get(StorageKeys.SESSION_INSTANCE_ID);
          if (!id) {
            id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            this.storageSvc.set(StorageKeys.SESSION_INSTANCE_ID, id);
          }
          this.storageSvc.set(getActiveSessionKey(response.email), id);
        }
      })
    ),
    { dispatch: false }
  );

  public clearSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.clearSession, AuthActions.logoutSuccess),
      tap(() => {
        const email = this.storageSvc.get(StorageKeys.EMAIL);
        if (email) {
          this.storageSvc.remove(getActiveSessionKey(email));
        }
        this.storageSvc.remove(StorageKeys.ACCESS_TOKEN);
        this.storageSvc.remove(StorageKeys.REFRESH_TOKEN);
        this.storageSvc.remove(StorageKeys.USERNAME);
        this.storageSvc.remove(StorageKeys.EMAIL);
        this.storageSvc.remove(StorageKeys.GUEST_CHAT_COUNT);
        this.storageSvc.remove(StorageKeys.SESSION_INSTANCE_ID);
        
        this.router.navigate([RoutePaths.AUTH.LOGIN]);
      })
    ),
    { dispatch: false }
  );
}
