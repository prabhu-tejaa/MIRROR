import { createReducer, on } from '@ngrx/store';

import { AuthActions } from './auth.actions';

export const authFeatureKey = 'auth' as const;

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  username: string | null;
  roles: string[];
  loading: boolean;
  error: unknown;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  email: null,
  username: null,
  roles: [],
  loading: false,
  error: null
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.setAuthenticated, (state: AuthState, { isAuthenticated, email, username, roles }): AuthState => ({
    ...state,
    isAuthenticated,
    email: email ?? state.email,
    username: username ?? state.username,
    roles: roles ?? state.roles
  })),
  on(AuthActions.loginSuccess, (state: AuthState, { response }): AuthState => ({
    ...state,
    isAuthenticated: true,
    email: response.email || null,
    username: response.username,
    error: null,
    loading: false
  })),
  on(AuthActions.loginFailure, (state: AuthState, { error }): AuthState => ({
    ...state,
    error,
    loading: false
  })),
  on(AuthActions.logoutSuccess, AuthActions.clearSession, (state: AuthState): AuthState => ({
    ...state,
    isAuthenticated: false,
    email: null,
    username: null,
    roles: [],
    error: null
  }))
);
