import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState } from './chat.reducer';

export const selectChatState = createFeatureSelector<ChatState>('chat');

export const selectActiveQuote = createSelector(selectChatState, (state) => state.activeQuote);
export const selectActiveStyle = createSelector(selectChatState, (state) => state.activeStyle);
export const selectCurrentEmotion = createSelector(selectChatState, (state) => state.currentEmotion);
export const selectCurrentPrimaryColor = createSelector(selectChatState, (state) => state.currentPrimaryColor);
export const selectCurrentSecondaryColor = createSelector(selectChatState, (state) => state.currentSecondaryColor);
export const selectCurrentColors = createSelector(selectChatState, (state) => ({
  primary: state.currentPrimaryColor,
  secondary: state.currentSecondaryColor
}));
export const selectIsWaitingForResponse = createSelector(selectChatState, (state) => state.isWaitingForResponse);
export const selectIsResting = createSelector(selectChatState, (state) => state.isResting);
export const selectIsLoadingHistory = createSelector(selectChatState, (state) => state.isLoadingHistory);
export const selectIsLoadingMore = createSelector(selectChatState, (state) => state.isLoadingMore);
export const selectMessages = createSelector(selectChatState, (state) => state.messages);

export const selectTodayMessages = createSelector(selectMessages, (messages) => {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return messages.filter(m => m.isCurrentSession || new Date(m.timestamp).getTime() >= midnight.getTime());
});

export const selectScrollToBottomTrigger = createSelector(selectChatState, (state) => state.scrollToBottomTrigger);
export const selectMaintainScrollTrigger = createSelector(selectChatState, (state) => state.maintainScrollTrigger);

export const selectCurrentCursor = createSelector(selectChatState, (state) => state.currentCursor);
export const selectHasMoreHistory = createSelector(selectChatState, (state) => state.hasMoreHistory);
export const selectInitialChatLoadedGlobally = createSelector(selectChatState, (state) => state.initialChatLoadedGlobally);
export const selectIsInitialLoad = createSelector(selectChatState, (state) => state.isInitialLoad);
export const selectLoadedEmail = createSelector(selectChatState, (state) => state.loadedEmail);
