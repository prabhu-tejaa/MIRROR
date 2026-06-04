import { createFeatureSelector, createSelector } from '@ngrx/store';
import { YouState, youFeatureKey } from './you.reducer';

export const selectYouState = createFeatureSelector<YouState>(youFeatureKey);

export const selectAnalytics = createSelector(selectYouState, (state) => state.analytics);
export const selectMemories = createSelector(selectYouState, (state) => state.memories);
export const selectLoadingAnalytics = createSelector(selectYouState, (state) => state.loadingAnalytics);
export const selectLoadingMemories = createSelector(selectYouState, (state) => state.loadingMemories);
export const selectDataLoadedOnce = createSelector(selectYouState, (state) => state.dataLoadedOnce);
export const selectYouError = createSelector(selectYouState, (state) => state.error);
