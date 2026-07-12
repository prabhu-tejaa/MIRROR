import { createFeatureSelector, createSelector } from '@ngrx/store';

import { AdminState, adminFeatureKey } from './admin.reducer';

export const selectAdminState = createFeatureSelector<AdminState>(adminFeatureKey);

export const selectUsers = createSelector(selectAdminState, (state: AdminState) => state.users);
export const selectUsersLoading = createSelector(selectAdminState, (state: AdminState) => state.usersLoading);

export const selectMemories = createSelector(selectAdminState, (state: AdminState) => state.memories);
export const selectMemoriesLoading = createSelector(selectAdminState, (state: AdminState) => state.memoriesLoading);

export const selectAdminError = createSelector(selectAdminState, (state: AdminState) => state.error);
