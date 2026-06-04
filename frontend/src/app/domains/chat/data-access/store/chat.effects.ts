import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, Action } from '@ngrx/store';
import { of, from, interval } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, mergeMap, distinctUntilChanged, takeWhile, concatMap } from 'rxjs/operators';
import * as ChatActions from './chat.actions';
import * as ChatSelectors from './chat.selectors';
import { selectUserEmail } from '../../../auth/data-access/store/auth.selectors';
import { ChatService } from '../chat.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Message } from '../chat-state.models';
import { getEmotionColors } from '../../../../core/constants/theme.constants';

@Injectable()
export class ChatEffects {
  private actions$ = inject(Actions);
  private chatSvc = inject(ChatService);
  private toastSvc = inject(ToastService);
  private store = inject(Store);

  private parseEmotionAndColors(rawEmotion: string | undefined): { emotion: string, primary: string, secondary: string } {
    if (!rawEmotion) return { emotion: 'NEUTRAL', primary: '#a855f7', secondary: '#06b6d4' };
    const parts = rawEmotion.split('|');
    const emotionText = parts[0] || 'NEUTRAL';
    let primary = parts[1] || '';
    let secondary = parts[2] || '';
    if (!primary || !secondary) {
      const colors = getEmotionColors(emotionText);
      primary = colors.primary;
      secondary = colors.secondary;
    }
    return { emotion: emotionText, primary, secondary };
  }

  public loadDynamicQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadDynamicQuote),
      switchMap(() =>
        this.chatSvc.getRandomQuote().pipe(
          map(res => {
            if (res?.quote && res?.author) {
              return ChatActions.setDynamicQuote({ quote: { text: res.quote, author: res.author } });
            }
            return { type: '[Chat] Load Dynamic Quote Failed' };
          }),
          catchError(_err => {
            this.toastSvc.showInfo('Using local quotes (offline mode).');
            return of({ type: '[Chat] Load Dynamic Quote Failed' });
          })
        )
      )
    )
  );

  public loadChatHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadChatHistory),
      withLatestFrom(this.store.select(selectUserEmail)),
      switchMap(([_, email]) => {
        const targetEmail = email || 'guest@mirror.tech';
        return this.chatSvc.getHistory(targetEmail, null, 20).pipe(
          mergeMap((data) => {
            interface BackendMessage {
              id: string | number;
              sender?: string;
              content: string;
              createdAt: string | number;
              emotion?: string;
            }
            const loadedMessages: Message[] = (data?.messages || []).reverse().map((m: BackendMessage) => {
              const { emotion, primary, secondary } = this.parseEmotionAndColors(m.emotion);
              return {
                id: m.id.toString(),
                sender: m.sender || 'user',
                text: m.content,
                timestamp: typeof m.createdAt === 'number' ? new Date(m.createdAt > 9999999999 ? m.createdAt : m.createdAt * 1000) : new Date(m.createdAt || new Date()),
                emotion,
                primaryColor: primary,
                secondaryColor: secondary
              };
            });

            const actionsToDispatch: Action[] = [
              ChatActions.loadChatHistorySuccess({
                messages: loadedMessages,
                nextCursor: data?.nextCursor || null,
                hasMore: !!data?.hasMore,
                loadedEmail: targetEmail
              }),
              ChatActions.triggerScrollToBottom()
            ];

            const lastMirror = [...loadedMessages].reverse().find(m => m.sender === 'mirror');
            if (lastMirror && lastMirror.primaryColor && lastMirror.secondaryColor) {
              actionsToDispatch.push(ChatActions.setColors({ primary: lastMirror.primaryColor, secondary: lastMirror.secondaryColor }));
              actionsToDispatch.push(ChatActions.setEmotion({ emotion: lastMirror.emotion || 'NEUTRAL' }));
            } else {
              actionsToDispatch.push(ChatActions.setEmotion({ emotion: 'NEUTRAL' }));
              actionsToDispatch.push(ChatActions.setColors({ primary: '#a855f7', secondary: '#06b6d4' }));
            }

            return from(actionsToDispatch);
          }),
          catchError((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to load chat history from backend:', err);
            this.toastSvc.showError('Failed to load chat history.');
            return of(ChatActions.loadChatHistoryFailure({ error: err }));
          })
        );
      })
    )
  );

  public loadMoreHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadMoreHistory),
      withLatestFrom(
        this.store.select(selectUserEmail),
        this.store.select(ChatSelectors.selectCurrentCursor)
      ),
      switchMap(([_, email, cursor]) => {
        const targetEmail = email || 'guest@mirror.tech';
        return this.chatSvc.getHistory(targetEmail, cursor, 20).pipe(
          mergeMap((data) => {
            interface BackendMessage {
              id: string | number;
              sender?: string;
              content: string;
              createdAt: string | number;
              emotion?: string;
            }
            const olderMessages: Message[] = (data?.messages || []).reverse().map((m: BackendMessage) => {
              const { emotion, primary, secondary } = this.parseEmotionAndColors(m.emotion);
              return {
                id: m.id.toString(),
                sender: m.sender || 'user',
                text: m.content,
                timestamp: typeof m.createdAt === 'number' ? new Date(m.createdAt > 9999999999 ? m.createdAt : m.createdAt * 1000) : new Date(m.createdAt || new Date()),
                emotion,
                primaryColor: primary,
                secondaryColor: secondary
              };
            });

            return from([
              ChatActions.loadMoreHistorySuccess({
                messages: olderMessages,
                nextCursor: data?.nextCursor || null,
                hasMore: !!data?.hasMore
              }),
              ChatActions.triggerMaintainScroll()
            ]);
          }),
          catchError((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to load more history:', err);
            this.toastSvc.showError('Failed to load older messages.');
            return of(ChatActions.loadMoreHistoryFailure({ error: err }));
          })
        );
      })
    )
  );

  public postMessage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.postMessage),
      withLatestFrom(this.store.select(selectUserEmail)),
      concatMap(([{ text }, email]) => {
        const userMsgId = Math.random().toString(36).substring(7);
        const userMsg: Message = {
          id: userMsgId,
          sender: 'user',
          text,
          timestamp: new Date(),
          isCurrentSession: true
        };

        const typingId = 'typing-' + Math.random().toString(36).substring(7);
        const typingMsg: Message = {
          id: typingId,
          sender: 'mirror',
          text: '',
          timestamp: new Date(),
          isTyping: true,
          isCurrentSession: true
        };

        // Dispatch initial loading states immediately
        this.store.dispatch(ChatActions.addMessage({ message: userMsg }));
        this.store.dispatch(ChatActions.addMessage({ message: typingMsg }));
        this.store.dispatch(ChatActions.triggerScrollToBottom());
        this.store.dispatch(ChatActions.setWaitingForResponse({ isWaiting: true }));

        const targetEmail = email || 'guest@mirror.tech';
        return this.chatSvc.reflect(targetEmail, text).pipe(
          map((res) => {
            const reflectionText = res.reflection || "Thank you for sharing your thoughts.";
            const { emotion, primary, secondary } = this.parseEmotionAndColors(res.emotion);

            return ChatActions.postMessageSuccess({
              typingId,
              text: reflectionText,
              emotion,
              primary,
              secondary
            });
          }),
          catchError((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to generate backend reflection:', err);
            let errorMsg = '⚠️ [CONNECTION ERROR] Failed to connect to the MIRROR reflection service. Please ensure the backend is running and try again.';
            const detailedMsg = err.error?.message || err.error || err.message || '';
            const isConfigError = typeof detailedMsg === 'string' &&
              (detailedMsg.toLowerCase().includes('key is not configured') || detailedMsg.toLowerCase().includes('apikey'));
            const isRateLimitError = err.status === 429 ||
              (typeof detailedMsg === 'string' && (detailedMsg.toLowerCase().includes('quota') || detailedMsg.toLowerCase().includes('rate_limit')));

            if (isRateLimitError) {
              errorMsg = '⚠️ [QUOTA EXCEEDED] The AI service has reached its daily free-tier limit. MIRROR will be back tomorrow once the quota resets. Consider upgrading the Gemini API plan for uninterrupted access.';
            } else if (isConfigError) {
              errorMsg = '⚠️ [CONFIGURATION ERROR] The Gemini API Key is not configured. Please set the GEMINI_API_KEY environment variable in the backend to start live reflection and emotional tracking.';
            } else if (err.status === 500) {
              errorMsg = `⚠️ [REFLECTION ERROR] The reflection service encountered a technical issue: ${detailedMsg || 'Internal Server Error'}.`;
            } else if (err.status === 0) {
              errorMsg = '⚠️ [NETWORK ERROR] Unable to reach the memory service. Please verify your backend server is active and accessible.';
            }

            return of(ChatActions.postMessageFailure({ typingId, errorMsg }));
          })
        );
      })
    )
  );

  public startTypingAnimation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.postMessageSuccess),
      switchMap(({ typingId, text, emotion, primary, secondary }) => {
        this.store.dispatch(ChatActions.setEmotion({ emotion }));
        this.store.dispatch(ChatActions.setColors({ primary, secondary }));
        this.store.dispatch(ChatActions.updateMessage({
          id: typingId,
          changes: {
            text: '',
            isTyping: false,
            emotion,
            primaryColor: primary,
            secondaryColor: secondary
          }
        }));

        const startTime = Date.now();
        let lastTick = startTime;
        const charsPerMs = 3 / 15;

        return interval(15).pipe(
          map(() => {
            const now = Date.now();
            const delta = now - lastTick;
            lastTick = now;

            // If the browser throttles the timer (e.g. > 100ms delta), the tab was backgrounded.
            // Skip the animation entirely to prevent it from continuing when user returns.
            if (delta > 100) {
              return text.length;
            }

            const elapsed = now - startTime;
            let currentCharIdx = Math.floor(elapsed * charsPerMs);
            if (currentCharIdx > text.length) {
              currentCharIdx = text.length;
            }
            return currentCharIdx;
          }),
          distinctUntilChanged(),
          takeWhile((charIdx) => charIdx < text.length, true),
          mergeMap((charIdx) => {
            if (charIdx < text.length) {
              return [
                ChatActions.updateMessage({ id: typingId, changes: { text: text.slice(0, charIdx) } }),
                ChatActions.triggerScrollToBottom()
              ];
            } else {
              return [
                ChatActions.updateMessage({ id: typingId, changes: { text } }),
                ChatActions.setWaitingForResponse({ isWaiting: false }),
                ChatActions.triggerScrollToBottom()
              ];
            }
          })
        );
      })
    )
  );

  public postMessageFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.postMessageFailure),
      withLatestFrom(this.store.select(ChatSelectors.selectMessages)),
      mergeMap(([{ typingId, errorMsg }, messages]) => {
        this.toastSvc.showError('Connection issue while communicating with MIRROR.');
        
        const filteredMessages = messages.filter(m => m.id !== typingId);
        const mirrorReply: Message = {
          id: Math.random().toString(36).substring(7),
          sender: 'mirror',
          text: errorMsg,
          timestamp: new Date(),
          isCurrentSession: true
        };

        return [
          ChatActions.setMessages({ messages: filteredMessages }),
          ChatActions.addMessage({ message: mirrorReply }),
          ChatActions.setWaitingForResponse({ isWaiting: false }),
          ChatActions.triggerScrollToBottom()
        ];
      })
    )
  );
}
