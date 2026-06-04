import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';

export const authFeatureKey = 'auth';

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  username: string | null;
  roles: string[];
  loading: boolean;
  error: unknown | null;
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
  on(AuthActions.setAuthenticated, (state, { isAuthenticated, email, username, roles }) => ({
    ...state,
    isAuthenticated,
    email: email ?? state.email,
    username: username ?? state.username,
    roles: roles ?? state.roles
  })),
  on(AuthActions.loginSuccess, (state, { response }) => ({
    ...state,
    isAuthenticated: true,
    email: response.email || null,
    username: response.username,
    // roles will be populated by an effect or dispatch later if needed, but for now we expect them in setAuthenticated/login logic
    error: null,
    loading: false
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),
  on(AuthActions.logoutSuccess, AuthActions.clearSession, (state) => ({
    ...state,
    isAuthenticated: false,
    email: null,
    username: null,
    roles: [],
    error: null
  }))
);
