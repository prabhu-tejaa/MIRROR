import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthResponse } from '../auth.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Check Session': emptyProps(),
    'Login Success': props<{ response: AuthResponse }>(),
    'Login Failure': props<{ error: unknown }>(),
    'Logout': emptyProps(),
    'Logout Success': emptyProps(),
    'Set Authenticated': props<{ isAuthenticated: boolean, email?: string, username?: string }>(),
    'Clear Session': emptyProps(),
  }
});
