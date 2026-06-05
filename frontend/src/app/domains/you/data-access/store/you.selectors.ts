import { createFeatureSelector, createSelector } from '@ngrx/store';

import { YouState, youFeatureKey } from './you.reducer';

export const selectYouState = createFeatureSelector<YouState>(youFeatureKey);

export const selectAnalytics = createSelector(selectYouState, (state: YouState) => state.analytics);
export const selectMemories = createSelector(selectYouState, (state: YouState) => state.memories);
export const selectLoadingAnalytics = createSelector(selectYouState, (state: YouState) => state.loadingAnalytics);
export const selectLoadingMemories = createSelector(selectYouState, (state: YouState) => state.loadingMemories);
export const selectDataLoadedOnce = createSelector(selectYouState, (state: YouState) => state.dataLoadedOnce);
export const selectYouError = createSelector(selectYouState, (state: YouState) => state.error);
