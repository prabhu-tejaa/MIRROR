import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AdminState, adminFeatureKey } from './admin.reducer';

export const selectAdminState = createFeatureSelector<AdminState>(adminFeatureKey);

export const selectUsers = createSelector(selectAdminState, (state) => state.users);
export const selectUsersLoading = createSelector(selectAdminState, (state) => state.usersLoading);

export const selectMemories = createSelector(selectAdminState, (state) => state.memories);
export const selectMemoriesLoading = createSelector(selectAdminState, (state) => state.memoriesLoading);

export const selectGatewayHealth = createSelector(selectAdminState, (state) => state.gatewayHealth);
export const selectGatewayRoutes = createSelector(selectAdminState, (state) => state.gatewayRoutes);
export const selectGatewayBlockedIps = createSelector(selectAdminState, (state) => state.gatewayBlockedIps);
export const selectGatewayLogs = createSelector(selectAdminState, (state) => state.gatewayLogs);
export const selectGatewayStats = createSelector(selectAdminState, (state) => state.gatewayStats);
export const selectGatewayLoading = createSelector(selectAdminState, (state) => state.gatewayLoading);

export const selectAdminError = createSelector(selectAdminState, (state) => state.error);
