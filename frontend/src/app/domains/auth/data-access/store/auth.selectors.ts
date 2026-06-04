import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState, authFeatureKey } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated
);

export const selectUserEmail = createSelector(
  selectAuthState,
  (state) => state.email
);

export const selectUsername = createSelector(
  selectAuthState,
  (state) => state.username
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error
);
