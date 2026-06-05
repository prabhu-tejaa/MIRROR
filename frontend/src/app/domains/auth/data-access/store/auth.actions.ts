import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { AuthResponse } from '../auth.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    checkSession: emptyProps(),
    loginSuccess: props<{ response: AuthResponse }>(),
    loginFailure: props<{ error: unknown }>(),
    logout: emptyProps(),
    logoutSuccess: emptyProps(),
    setAuthenticated: props<{ isAuthenticated: boolean; email?: string; username?: string; roles?: string[] }>(),
    clearSession: emptyProps(),
  }
});
