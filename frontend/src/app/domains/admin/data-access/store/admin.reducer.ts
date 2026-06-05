import { createReducer, on } from '@ngrx/store';

import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';

import { AdminActions } from './admin.actions';

export const adminFeatureKey: 'admin' = 'admin';

export interface AdminState {
  users: AdminUserResponse[];
  usersLoading: boolean;

  memories: AdminMemoryRecord[];
  memoriesLoading: boolean;

  error: unknown;
}

export const initialState: AdminState = {
  users: [],
  usersLoading: false,

  memories: [],
  memoriesLoading: false,

  error: null
};

export const adminReducer = createReducer(
  initialState,

  on(AdminActions.loadUsers, (state: AdminState): AdminState => ({ ...state, usersLoading: true, error: null })),
  on(AdminActions.loadUsersSuccess, (state: AdminState, { users }): AdminState => ({ ...state, users, usersLoading: false })),
  on(AdminActions.loadUsersFailure, (state: AdminState, { error }): AdminState => ({ ...state, error, usersLoading: false })),

  on(AdminActions.createUserSuccess, (state: AdminState, { user }): AdminState => ({ ...state, users: [...state.users, user] })),
  on(AdminActions.updateUserSuccess, (state: AdminState, { user }): AdminState => ({ ...state, users: state.users.map((u: AdminUserResponse) => u.id === user.id ? user : u) })),
  on(AdminActions.deleteUserSuccess, (state: AdminState, { id }): AdminState => ({ ...state, users: state.users.filter((u: AdminUserResponse) => u.id !== id) })),

  on(AdminActions.loadMemories, (state: AdminState): AdminState => ({ ...state, memoriesLoading: true, error: null })),
  on(AdminActions.loadMemoriesSuccess, (state: AdminState, { memories }): AdminState => ({ ...state, memories, memoriesLoading: false })),
  on(AdminActions.loadMemoriesFailure, (state: AdminState, { error }): AdminState => ({ ...state, error, memoriesLoading: false })),

  on(AdminActions.deleteMemorySuccess, (state: AdminState, { id }): AdminState => ({ ...state, memories: state.memories.filter((m: AdminMemoryRecord) => m.id !== id) }))
);
