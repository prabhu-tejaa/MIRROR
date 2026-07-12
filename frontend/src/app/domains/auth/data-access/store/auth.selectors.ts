import { createFeatureSelector, createSelector } from '@ngrx/store';

import { AuthState, authFeatureKey } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => state.isAuthenticated
);

export const selectUserEmail = createSelector(
  selectAuthState,
  (state: AuthState) => state.email
);

export const selectUsername = createSelector(
  selectAuthState,
  (state: AuthState) => state.username
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectUserRoles = createSelector(
  selectAuthState,
  (state: AuthState) => state.roles
);

export const selectIsAdmin = createSelector(
  selectUserRoles,
  (roles: string[]) => roles.includes('ADMIN')
);
