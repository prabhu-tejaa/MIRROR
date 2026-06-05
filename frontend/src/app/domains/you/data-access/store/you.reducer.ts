import { createReducer, on } from '@ngrx/store';

import { AuthActions } from '../../../auth/data-access/store/auth.actions';

import { YouActions, AnalyticsResponse, Reflection } from './you.actions';

export const youFeatureKey = 'you' as const;

export interface YouState {
  analytics: AnalyticsResponse | null;
  memories: Reflection[];
  loadingAnalytics: boolean;
  loadingMemories: boolean;
  dataLoadedOnce: boolean;
  error: unknown;
}

export const initialState: YouState = {
  analytics: null,
  memories: [],
  loadingAnalytics: false,
  loadingMemories: false,
  dataLoadedOnce: false,
  error: null
};

const normalizeCreatedAt = (m: Reflection): Reflection => ({
  ...m,
  createdAt: typeof m.createdAt === 'number'
    ? new Date(m.createdAt < 9999999999 ? m.createdAt * 1000 : m.createdAt).toISOString()
    : String(m.createdAt)
});

const toUserMemories = (memories: Reflection[]): Reflection[] =>
  memories.filter((m: Reflection) => m.sender === 'user').map(normalizeCreatedAt);

export const youReducer = createReducer(
  initialState,
  on(YouActions.loadAnalytics, (state: YouState): YouState => ({ ...state, loadingAnalytics: true, error: null })),
  on(YouActions.loadAnalyticsSuccess, (state: YouState, { data }): YouState => ({
    ...state,
    analytics: data,
    loadingAnalytics: false,
    dataLoadedOnce: true
  })),
  on(YouActions.loadAnalyticsFailure, (state: YouState, { error }): YouState => ({ ...state, error, loadingAnalytics: false, dataLoadedOnce: true })),

  on(YouActions.loadMemories, (state: YouState): YouState => ({ ...state, loadingMemories: true, error: null })),
  on(YouActions.loadMemoriesSuccess, (state: YouState, { memories }): YouState => ({
    ...state,
    memories: toUserMemories(memories),
    loadingMemories: false
  })),
  on(YouActions.loadMemoriesFailure, (state: YouState, { error }): YouState => ({ ...state, error, loadingMemories: false })),

  on(YouActions.clearData, AuthActions.clearSession, AuthActions.logoutSuccess, (state: YouState): YouState => ({
    ...state,
    analytics: null,
    memories: [],
    dataLoadedOnce: false
  }))
);
