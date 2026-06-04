import { createReducer, on } from '@ngrx/store';
import { AdminActions } from './admin.actions';
import { AdminUserResponse } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';
import { ServiceHealth, RouteMap, BlockedIp, LogEntry, TelemetryStats } from '../admin-gateway.service';

export const adminFeatureKey = 'admin';

export interface AdminState {
  users: AdminUserResponse[];
  usersLoading: boolean;
  
  memories: AdminMemoryRecord[];
  memoriesLoading: boolean;
  
  gatewayHealth: ServiceHealth[];
  gatewayRoutes: RouteMap[];
  gatewayBlockedIps: BlockedIp[];
  gatewayLogs: LogEntry[];
  gatewayStats: TelemetryStats | null;
  gatewayLoading: boolean;
  
  error: unknown | null;
}

export const initialState: AdminState = {
  users: [],
  usersLoading: false,
  
  memories: [],
  memoriesLoading: false,
  
  gatewayHealth: [],
  gatewayRoutes: [],
  gatewayBlockedIps: [],
  gatewayLogs: [],
  gatewayStats: null,
  gatewayLoading: false,
  
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
  
  on(AdminActions.deleteMemorySuccess, (state, { id }) => ({ ...state, memories: state.memories.filter(m => m.id !== id) })),
  
  on(AdminActions.loadAllTelemetry, (state) => ({ ...state, gatewayLoading: true, error: null })),

  // Gateway
  on(AdminActions.loadGatewayHealth, (state) => ({ ...state, gatewayLoading: true, error: null })),
  on(AdminActions.loadGatewayHealthSuccess, (state, { health }) => ({ ...state, gatewayHealth: health, gatewayLoading: false })),
  on(AdminActions.loadGatewayHealthFailure, (state, { error }) => ({ ...state, error, gatewayLoading: false })),

  on(AdminActions.loadGatewayRoutesSuccess, (state, { routes }) => ({ ...state, gatewayRoutes: routes })),
  on(AdminActions.toggleRouteSuccess, (state, { route }) => ({
    ...state,
    gatewayRoutes: state.gatewayRoutes.map(r => r.id === route.id ? route : r)
  })),

  on(AdminActions.loadBlockedIPsSuccess, (state, { ips }) => ({ ...state, gatewayBlockedIps: ips })),
  on(AdminActions.unblockIPSuccess, (state, { ip }) => ({
    ...state,
    gatewayBlockedIps: state.gatewayBlockedIps.filter(b => b.ip !== ip)
  })),

  on(AdminActions.loadGatewayLogsSuccess, (state, { logs }) => ({ ...state, gatewayLogs: logs })),

  on(AdminActions.loadGatewayStatsSuccess, (state, { stats }) => ({ ...state, gatewayStats: stats })),
  on(AdminActions.updateRateLimitSuccess, (state, { limit }) => ({
    ...state,
    gatewayStats: state.gatewayStats ? { ...state.gatewayStats, globalRateLimit: limit } : null
  }))
);
