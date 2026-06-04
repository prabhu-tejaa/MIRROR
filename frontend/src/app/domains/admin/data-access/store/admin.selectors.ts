import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AdminState, adminFeatureKey } from './admin.reducer';

export const selectAdminState = createFeatureSelector<AdminState>(adminFeatureKey);

export const selectUsers = createSelector(selectAdminState, (state) => state.users);
export const selectUsersLoading = createSelector(selectAdminState, (state) => state.usersLoading);

export const selectMemories = createSelector(selectAdminState, (state) => state.memories);
export const selectMemoriesLoading = createSelector(selectAdminState, (state) => state.memoriesLoading);

export const selectAdminError = createSelector(selectAdminState, (state) => state.error);
