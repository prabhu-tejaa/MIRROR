import { createReducer, on } from '@ngrx/store';
import { YouActions, AnalyticsResponse, Reflection } from './you.actions';
import { AuthActions } from '../../../auth/data-access/store/auth.actions';

export const youFeatureKey = 'you';

export interface YouState {
  analytics: AnalyticsResponse | null;
  memories: Reflection[];
  loadingAnalytics: boolean;
  loadingMemories: boolean;
  dataLoadedOnce: boolean;
  error: unknown | null;
}

export const initialState: YouState = {
  analytics: null,
  memories: [],
  loadingAnalytics: false,
  loadingMemories: false,
  dataLoadedOnce: false,
  error: null
};

export const youReducer = createReducer(
  initialState,
  on(YouActions.loadAnalytics, (state) => ({ ...state, loadingAnalytics: true, error: null })),
  on(YouActions.loadAnalyticsSuccess, (state, { data }) => ({ 
    ...state, 
    analytics: data, 
    loadingAnalytics: false,
    dataLoadedOnce: true 
  })),
  on(YouActions.loadAnalyticsFailure, (state, { error }) => ({ ...state, error, loadingAnalytics: false, dataLoadedOnce: true })),
  
  on(YouActions.loadMemories, (state) => ({ ...state, loadingMemories: true, error: null })),
  on(YouActions.loadMemoriesSuccess, (state, { memories }) => ({ 
    ...state, 
    memories: memories.filter(m => m.sender === 'user').map((m: Reflection) => ({
      ...m,
      createdAt: typeof m.createdAt === 'number'
        ? new Date(m.createdAt < 9999999999 ? m.createdAt * 1000 : m.createdAt).toISOString()
        : String(m.createdAt)
    })), 
    loadingMemories: false 
  })),
  on(YouActions.loadMemoriesFailure, (state, { error }) => ({ ...state, error, loadingMemories: false })),
  
  on(YouActions.clearData, AuthActions.clearSession, AuthActions.logoutSuccess, (state) => ({
    ...state,
    analytics: null,
    memories: [],
    dataLoadedOnce: false
  }))
);
