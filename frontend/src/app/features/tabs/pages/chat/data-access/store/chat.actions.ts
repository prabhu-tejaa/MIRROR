import { createAction, props } from '@ngrx/store';
import { Message, Quote } from '../chat-state.models';

// Quote Actions
export const loadDynamicQuote = createAction('[Chat] Load Dynamic Quote');
export const setDynamicQuote = createAction('[Chat] Set Dynamic Quote', props<{ quote: Quote }>());

// Style & Emotion Actions
export const setStyle = createAction('[Chat] Set Style', props<{ style: 'cyberpunk' | 'aurora' }>());
export const setEmotion = createAction('[Chat] Set Emotion', props<{ emotion: string }>());
export const setColors = createAction('[Chat] Set Colors', props<{ primary: string; secondary: string }>());

// Message Actions
export const loadHistory = createAction('[Chat] Load History', props<{ reset: boolean }>());
export const setMessages = createAction('[Chat] Set Messages', props<{ messages: Message[] }>());
export const addMessage = createAction('[Chat] Add Message', props<{ message: Message }>());
export const updateMessage = createAction('[Chat] Update Message', props<{ id: string; changes: Partial<Message> }>());

// Loading & UI Actions
export const setWaitingForResponse = createAction('[Chat] Set Waiting For Response', props<{ isWaiting: boolean }>());
export const setResting = createAction('[Chat] Set Resting', props<{ isResting: boolean }>());
export const setLoadingHistory = createAction('[Chat] Set Loading History', props<{ isLoading: boolean }>());
export const setLoadingMore = createAction('[Chat] Set Loading More', props<{ isLoading: boolean }>());
export const triggerScrollToBottom = createAction('[Chat] Trigger Scroll To Bottom');
export const triggerMaintainScroll = createAction('[Chat] Trigger Maintain Scroll');
