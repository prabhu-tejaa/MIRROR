import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ChatState } from './chat.reducer';

export const selectChatState = createFeatureSelector<ChatState>('chat');

export const selectActiveQuote = createSelector(selectChatState, (state: ChatState) => state.activeQuote);
export const selectActiveStyle = createSelector(selectChatState, (state: ChatState) => state.activeStyle);
export const selectCurrentEmotion = createSelector(selectChatState, (state: ChatState) => state.currentEmotion);
export const selectCurrentPrimaryColor = createSelector(selectChatState, (state: ChatState) => state.currentPrimaryColor);
export const selectCurrentSecondaryColor = createSelector(selectChatState, (state: ChatState) => state.currentSecondaryColor);
export const selectCurrentColors = createSelector(selectChatState, (state: ChatState) => ({
  primary: state.currentPrimaryColor,
  secondary: state.currentSecondaryColor
}));
export const selectIsWaitingForResponse = createSelector(selectChatState, (state: ChatState) => state.isWaitingForResponse);
export const selectIsResting = createSelector(selectChatState, (state: ChatState) => state.isResting);
export const selectIsLoadingHistory = createSelector(selectChatState, (state: ChatState) => state.isLoadingHistory);
export const selectIsLoadingMore = createSelector(selectChatState, (state: ChatState) => state.isLoadingMore);
export const selectMessages = createSelector(selectChatState, (state: ChatState) => state.messages);

export const selectTodayMessages = createSelector(selectMessages, (messages) => {
  const midnight: Date = new Date();
  midnight.setHours(0, 0, 0, 0);
  return messages.filter(m => m.isCurrentSession || new Date(m.timestamp).getTime() >= midnight.getTime());
});

export const selectScrollToBottomTrigger = createSelector(selectChatState, (state: ChatState) => state.scrollToBottomTrigger);
export const selectMaintainScrollTrigger = createSelector(selectChatState, (state: ChatState) => state.maintainScrollTrigger);

export const selectCurrentCursor = createSelector(selectChatState, (state: ChatState) => state.currentCursor);
export const selectHasMoreHistory = createSelector(selectChatState, (state: ChatState) => state.hasMoreHistory);
export const selectInitialChatLoadedGlobally = createSelector(selectChatState, (state: ChatState) => state.initialChatLoadedGlobally);
export const selectIsInitialLoad = createSelector(selectChatState, (state: ChatState) => state.isInitialLoad);
export const selectLoadedEmail = createSelector(selectChatState, (state: ChatState) => state.loadedEmail);
