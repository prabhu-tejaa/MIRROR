import { createReducer, on } from '@ngrx/store';

import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';

import { AdminActions } from './admin.actions';

export const adminFeatureKey: "admin" = 'admin';

export interface AdminState {
  users: AdminUserResponse[];
  usersLoading: boolean;
  
  memories: AdminMemoryRecord[];
  memoriesLoading: boolean;
  
  error: unknown | null;
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
  
  on(AdminActions.loadUsers, (state: AdminState) => ({ ...state, usersLoading: true, error: null })),
  on(AdminActions.loadUsersSuccess, (state: AdminState, { users }) => ({ ...state, users, usersLoading: false })),
  on(AdminActions.loadUsersFailure, (state: AdminState, { error }) => ({ ...state, error, usersLoading: false })),
  
  on(AdminActions.createUserSuccess, (state: AdminState, { user }) => ({ ...state, users: [...state.users, user] })),
  on(AdminActions.updateUserSuccess, (state: AdminState, { user }) => ({ ...state, users: state.users.map((u: AdminUserResponse) => u.id === user.id ? user : u) })),
  on(AdminActions.deleteUserSuccess, (state: AdminState, { id }) => ({ ...state, users: state.users.filter((u: AdminUserResponse) => u.id !== id) })),
  
  on(AdminActions.loadMemories, (state: AdminState) => ({ ...state, memoriesLoading: true, error: null })),
  on(AdminActions.loadMemoriesSuccess, (state: AdminState, { memories }) => ({ ...state, memories, memoriesLoading: false })),
  on(AdminActions.loadMemoriesFailure, (state: AdminState, { error }) => ({ ...state, error, memoriesLoading: false })),
  
  on(AdminActions.deleteMemorySuccess, (state: AdminState, { id }) => ({ ...state, memories: state.memories.filter((m: AdminMemoryRecord) => m.id !== id) }))
);
