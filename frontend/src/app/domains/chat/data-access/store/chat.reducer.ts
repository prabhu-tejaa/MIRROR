import { createReducer, on } from '@ngrx/store';

import { AuthActions } from '../../../auth/data-access/store/auth.actions';
import { Message, Quote } from '../chat-state.models';

import * as chatActions from './chat.actions';

export interface ChatState {
  activeQuote: Quote;
  activeStyle: 'cyberpunk' | 'aurora';
  currentEmotion: string;
  currentPrimaryColor: string;
  currentSecondaryColor: string;
  isWaitingForResponse: boolean;
  isResting: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  messages: Message[];
  scrollToBottomTrigger: number;
  maintainScrollTrigger: number;
  currentCursor: string | null;
  hasMoreHistory: boolean;
  initialChatLoadedGlobally: boolean;
  isInitialLoad: boolean;
  loadedEmail: string | null;
}

export const initialState: ChatState = {
  activeQuote: {
    text: 'Who looks outside, dreams; who looks inside, awakes.',
    author: 'Carl Jung'
  },
  activeStyle: 'aurora',
  currentEmotion: 'NEUTRAL',
  currentPrimaryColor: '#a855f7',
  currentSecondaryColor: '#06b6d4',
  isWaitingForResponse: false,
  isResting: false,
  isLoadingHistory: false,
  isLoadingMore: false,
  messages: [],
  scrollToBottomTrigger: 0,
  maintainScrollTrigger: 0,
  currentCursor: null,
  hasMoreHistory: true,
  initialChatLoadedGlobally: false,
  isInitialLoad: true,
  loadedEmail: null
};

export const chatReducer = createReducer(
  initialState,
  on(chatActions.setDynamicQuote, (state: ChatState, { quote }) => ({ ...state, activeQuote: quote })),
  on(chatActions.setStyle, (state: ChatState, { style }) => ({ ...state, activeStyle: style })),
  on(chatActions.setEmotion, (state: ChatState, { emotion }) => ({ ...state, currentEmotion: emotion })),
  on(chatActions.setColors, (state: ChatState, { primary, secondary }) => ({
    ...state,
    currentPrimaryColor: primary,
    currentSecondaryColor: secondary
  })),
  on(chatActions.setMessages, (state: ChatState, { messages }) => ({ ...state, messages })),
  on(chatActions.addMessage, (state: ChatState, { message }) => ({ ...state, messages: [...state.messages, message] })),
  on(chatActions.updateMessage, (state: ChatState, { id, changes }) => ({
    ...state,
    messages: state.messages.map((m: Message) => m.id === id ? { ...m, ...changes } : m)
  })),
  on(chatActions.setWaitingForResponse, (state: ChatState, { isWaiting }) => ({ ...state, isWaitingForResponse: isWaiting })),
  on(chatActions.setResting, (state: ChatState, { isResting }) => ({ ...state, isResting: isResting })),
  on(chatActions.setLoadingHistory, (state: ChatState, { isLoading }) => ({ ...state, isLoadingHistory: isLoading })),
  on(chatActions.setLoadingMore, (state: ChatState, { isLoading }) => ({ ...state, isLoadingMore: isLoading })),
  on(chatActions.triggerScrollToBottom, (state: ChatState) => ({ ...state, scrollToBottomTrigger: state.scrollToBottomTrigger + 1 })),
  on(chatActions.triggerMaintainScroll, (state: ChatState) => ({ ...state, maintainScrollTrigger: state.maintainScrollTrigger + 1 })),

  on(chatActions.loadChatHistory, (state: ChatState) => ({
    ...state,
    isLoadingHistory: state.isInitialLoad,
    currentCursor: null,
    hasMoreHistory: true,
    isWaitingForResponse: false
  })),
  on(chatActions.loadChatHistorySuccess, (state: ChatState, { messages, nextCursor, hasMore, loadedEmail }) => ({
    ...state,
    messages,
    currentCursor: nextCursor,
    hasMoreHistory: hasMore,
    loadedEmail,
    isLoadingHistory: false,
    isInitialLoad: false,
    initialChatLoadedGlobally: true
  })),
  on(chatActions.loadChatHistoryFailure, (state: ChatState) => ({
    ...state,
    isLoadingHistory: false,
    isInitialLoad: false,
    initialChatLoadedGlobally: true
  })),

  on(chatActions.loadMoreHistory, (state: ChatState) => ({
    ...state,
    isLoadingMore: true
  })),
  on(chatActions.loadMoreHistorySuccess, (state: ChatState, { messages, nextCursor, hasMore }) => ({
    ...state,
    messages: [...messages, ...state.messages],
    currentCursor: nextCursor,
    hasMoreHistory: hasMore,
    isLoadingMore: false
  })),
  on(chatActions.loadMoreHistoryFailure, (state: ChatState) => ({
    ...state,
    isLoadingMore: false
  })),
  on(AuthActions.clearSession, AuthActions.logoutSuccess, () => ({
    ...initialState
  }))
);
