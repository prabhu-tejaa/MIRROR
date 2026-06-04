import { createReducer, on } from '@ngrx/store';
import { AdminActions } from './admin.actions';
import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';

export const adminFeatureKey = 'admin';

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
  
  // Users
  on(AdminActions.loadUsers, (state) => ({ ...state, usersLoading: true, error: null })),
  on(AdminActions.loadUsersSuccess, (state, { users }) => ({ ...state, users, usersLoading: false })),
  on(AdminActions.loadUsersFailure, (state, { error }) => ({ ...state, error, usersLoading: false })),
  
  on(AdminActions.createUserSuccess, (state, { user }) => ({ ...state, users: [...state.users, user] })),
  on(AdminActions.updateUserSuccess, (state, { user }) => ({ ...state, users: state.users.map(u => u.id === user.id ? user : u) })),
  on(AdminActions.deleteUserSuccess, (state, { id }) => ({ ...state, users: state.users.filter(u => u.id !== id) })),
  
  // Memories
  on(AdminActions.loadMemories, (state) => ({ ...state, memoriesLoading: true, error: null })),
  on(AdminActions.loadMemoriesSuccess, (state, { memories }) => ({ ...state, memories, memoriesLoading: false })),
  on(AdminActions.loadMemoriesFailure, (state, { error }) => ({ ...state, error, memoriesLoading: false })),
  
  on(AdminActions.deleteMemorySuccess, (state, { id }) => ({ ...state, memories: state.memories.filter(m => m.id !== id) }))
);
