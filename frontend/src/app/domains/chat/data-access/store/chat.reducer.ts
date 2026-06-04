import { createReducer, on } from '@ngrx/store';
import { Message, Quote } from '../chat-state.models';
import * as ChatActions from './chat.actions';

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
  maintainScrollTrigger: 0
};

export const chatReducer = createReducer(
  initialState,
  on(ChatActions.setDynamicQuote, (state, { quote }) => ({ ...state, activeQuote: quote })),
  on(ChatActions.setStyle, (state, { style }) => ({ ...state, activeStyle: style })),
  on(ChatActions.setEmotion, (state, { emotion }) => ({ ...state, currentEmotion: emotion })),
  on(ChatActions.setColors, (state, { primary, secondary }) => ({
    ...state,
    currentPrimaryColor: primary,
    currentSecondaryColor: secondary
  })),
  on(ChatActions.setMessages, (state, { messages }) => ({ ...state, messages })),
  on(ChatActions.addMessage, (state, { message }) => ({ ...state, messages: [...state.messages, message] })),
  on(ChatActions.updateMessage, (state, { id, changes }) => ({
    ...state,
    messages: state.messages.map(m => m.id === id ? { ...m, ...changes } : m)
  })),
  on(ChatActions.setWaitingForResponse, (state, { isWaiting }) => ({ ...state, isWaitingForResponse: isWaiting })),
  on(ChatActions.setResting, (state, { isResting }) => ({ ...state, isResting: isResting })),
  on(ChatActions.setLoadingHistory, (state, { isLoading }) => ({ ...state, isLoadingHistory: isLoading })),
  on(ChatActions.setLoadingMore, (state, { isLoading }) => ({ ...state, isLoadingMore: isLoading })),
  on(ChatActions.triggerScrollToBottom, (state) => ({ ...state, scrollToBottomTrigger: state.scrollToBottomTrigger + 1 })),
  on(ChatActions.triggerMaintainScroll, (state) => ({ ...state, maintainScrollTrigger: state.maintainScrollTrigger + 1 }))
);
