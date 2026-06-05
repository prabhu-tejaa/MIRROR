import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';import { Store, Action } from '@ngrx/store';
import { of, from, interval, Observable } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, mergeMap, distinctUntilChanged, takeWhile, concatMap } from 'rxjs/operators';

import { getEmotionColors } from '../../../../core/constants/theme.constants';
import { ToastService } from '../../../../core/services/toast.service';
import { selectUserEmail } from '../../../auth/data-access/store/auth.selectors';
import { Message } from '../chat-state.models';
import { ChatService } from '../chat.service';

import * as chatActions from './chat.actions';
import * as chatSelectors from './chat.selectors';


@Injectable()
export class ChatEffects {
  private actions$: Actions = inject(Actions);
  private chatSvc: ChatService = inject(ChatService);
  private toastSvc: ToastService = inject(ToastService);
  private store: Store = inject(Store);

  private parseEmotionAndColors(rawEmotion: string | undefined): { emotion: string, primary: string, secondary: string } {
    if (!rawEmotion) {return { emotion: 'NEUTRAL', primary: '#a855f7', secondary: '#06b6d4' };}
    const parts: string[] = rawEmotion.split('|');
    
    let emotionText: string = 'NEUTRAL';
    let primary: string = '';
    let secondary: string = '';

    if (parts.length >= 4) {
      emotionText = parts[1]?.trim() || 'NEUTRAL';
      primary = parts[2]?.trim() || '';
      secondary = parts[3]?.trim() || '';
    } else {
      emotionText = parts[0]?.trim() || 'NEUTRAL';
      primary = parts[1]?.trim() || '';
      secondary = parts[2]?.trim() || '';
    }
    
    const isValidColor: (c: string) => boolean | "" = (c: string) => c && (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl'));
    
    if (!isValidColor(primary) || !isValidColor(secondary)) {
      const colors: { primary: string; secondary: string; name: string; } = getEmotionColors(emotionText);
      primary = colors.primary;
      secondary = colors.secondary;
    }
    return { emotion: emotionText, primary, secondary };
  }

  public loadDynamicQuote$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.loadDynamicQuote),
      switchMap(() =>
        this.chatSvc.getRandomQuote().pipe(
          map((res: { quote: string; author: string; }) => {
            if (res?.quote && res?.author) {
              return chatActions.setDynamicQuote({ quote: { text: res.quote, author: res.author } });
            }
            return { type: '[Chat] Load Dynamic Quote Failed' };
          }),
          catchError((err: Error) => {
            void this.toastSvc.showInfo('Using local quotes (offline mode).');
            return of({ type: '[Chat] Load Dynamic Quote Failed' });
          })
        )
      )
    ) }
  );

  public loadChatHistory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.loadChatHistory),
      concatLatestFrom(() => this.store.select(selectUserEmail)),
      switchMap(([_, email]: [Action, string | null]) => {
        const targetEmail: string = email || 'guest@mirror.tech';
        return this.chatSvc.getHistory(targetEmail, null, 20).pipe(
          mergeMap((data: { messages: unknown[]; hasMore: boolean; nextCursor: string | null; }) => {
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
              chatActions.loadChatHistorySuccess({
                messages: loadedMessages,
                nextCursor: data?.nextCursor || null,
                hasMore: !!data?.hasMore,
                loadedEmail: targetEmail
              }),
              chatActions.triggerScrollToBottom()
            ];

            const lastMirror: Message | undefined = [...loadedMessages].reverse().find((m: Message) => m.sender === 'mirror');
            if (lastMirror && lastMirror.primaryColor && lastMirror.secondaryColor) {
              actionsToDispatch.push(chatActions.setColors({ primary: lastMirror.primaryColor, secondary: lastMirror.secondaryColor }));
              actionsToDispatch.push(chatActions.setEmotion({ emotion: lastMirror.emotion || 'NEUTRAL' }));
            } else {
              actionsToDispatch.push(chatActions.setEmotion({ emotion: 'NEUTRAL' }));
              actionsToDispatch.push(chatActions.setColors({ primary: '#a855f7', secondary: '#06b6d4' }));
            }

            return from(actionsToDispatch);
          }),
          catchError((err: Error) => {

            void this.toastSvc.showError('Failed to load chat history.');
            return of(chatActions.loadChatHistoryFailure({ error: err }));
          })
        );
      })
    ) }
  );

  public loadMoreHistory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.loadMoreHistory),
      withLatestFrom(
        this.store.select(selectUserEmail),
        this.store.select(chatSelectors.selectCurrentCursor)
      ),
      switchMap(([_, email, cursor]: [Action<"[Chat] Load More History">, string | null, string | null]) => {
        const targetEmail: string = email || 'guest@mirror.tech';
        return this.chatSvc.getHistory(targetEmail, cursor, 20).pipe(
          mergeMap((data: { messages: unknown[]; hasMore: boolean; nextCursor: string | null; }) => {
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
              chatActions.loadMoreHistorySuccess({
                messages: olderMessages,
                nextCursor: data?.nextCursor || null,
                hasMore: !!data?.hasMore
              }),
              chatActions.triggerMaintainScroll()
            ]);
          }),
          catchError((err: Error) => {

            void this.toastSvc.showError('Failed to load older messages.');
            return of(chatActions.loadMoreHistoryFailure({ error: err }));
          })
        );
      })
    ) }
  );

  public postMessage$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.postMessage),
      concatLatestFrom(() => this.store.select(selectUserEmail)),
      concatMap(([{ text }, email]: [{ text: string; }, string | null]) => {
        const userMsgId: string = Math.random().toString(36).substring(7);
        const userMsg: Message = {
          id: userMsgId,
          sender: 'user',
          text,
          timestamp: new Date(),
          isCurrentSession: true
        };

        const typingId: string = 'typing-' + Math.random().toString(36).substring(7);
        const typingMsg: Message = {
          id: typingId,
          sender: 'mirror',
          text: '',
          timestamp: new Date(),
          isTyping: true,
          isCurrentSession: true
        };

        this.store.dispatch(chatActions.addMessage({ message: userMsg }));
        this.store.dispatch(chatActions.addMessage({ message: typingMsg }));
        this.store.dispatch(chatActions.triggerScrollToBottom());
        this.store.dispatch(chatActions.setWaitingForResponse({ isWaiting: true }));

        const targetEmail: string = email || 'guest@mirror.tech';
        return this.chatSvc.reflect(targetEmail, text).pipe(
          map((res: { reflection: string; emotion: string; }) => {
            const reflectionText: string = res.reflection || "Thank you for sharing your thoughts.";
            const { emotion, primary, secondary } = this.parseEmotionAndColors(res.emotion);

            return chatActions.postMessageSuccess({
              typingId,
              text: reflectionText,
              emotion,
              primary,
              secondary
            });
          }),
          catchError((err: Error) => {

            let errorMsg: string = '⚠️ [CONNECTION ERROR] Failed to connect to the MIRROR reflection service. Please ensure the backend is running and try again.';
            const detailedMsg: string = err.error?.message || err.error || err.message || '';
            const isConfigError: boolean = typeof detailedMsg === 'string' &&
              (detailedMsg.toLowerCase().includes('key is not configured') || detailedMsg.toLowerCase().includes('apikey'));
            const isRateLimitError: boolean = err.status === 429 ||
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

            return of(chatActions.postMessageFailure({ typingId, errorMsg }));
          })
        );
      })
    ) }
  );

  public startTypingAnimation$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.postMessageSuccess),
      switchMap(({ typingId, text, emotion, primary, secondary }) => {
        this.store.dispatch(chatActions.setEmotion({ emotion }));
        this.store.dispatch(chatActions.setColors({ primary, secondary }));
        this.store.dispatch(chatActions.updateMessage({
          id: typingId,
          changes: {
            text: '',
            isTyping: false,
            emotion,
            primaryColor: primary,
            secondaryColor: secondary
          }
        }));

        const startTime: number = Date.now();
        let lastTick: number = startTime;
        
        const baseSpeed: number = 1.2 / 15; 
        const waveFreq: number = 1 / 300;
        const waveAmp: 4 = 4;
        
        let maxCharIdxSeen: number = 0;

        return interval(15).pipe(
          map(() => {
            const now: number = Date.now();
            const delta: number = now - lastTick;
            lastTick = now;

            if (delta > 100) {
              return text.length;
            }

            const elapsed: number = now - startTime;
            
            const rawProgress: number = (elapsed * baseSpeed) + (Math.sin(elapsed * waveFreq) * waveAmp);
            let currentCharIdx: number = Math.floor(rawProgress);
            
            if (currentCharIdx < maxCharIdxSeen) {currentCharIdx = maxCharIdxSeen;}
            maxCharIdxSeen = currentCharIdx;

            if (currentCharIdx > text.length) {
              currentCharIdx = text.length;
            }
            return currentCharIdx;
          }),
          distinctUntilChanged(),
          takeWhile((charIdx: number) => charIdx < text.length, true),
          mergeMap((charIdx: number) => {
            if (charIdx < text.length) {
              const actualText: string = text.slice(0, charIdx);
              const remaining: number = text.length - charIdx;
              const scrambleLen: number = Math.min(3, remaining);
              const etherealChars: "~〰✧✦⋆·°*:." = "~〰✧✦⋆·°*:.";
              let scramble: string = "";
              for (let i: number = 0; i < scrambleLen; i++) {
                scramble += etherealChars.charAt(Math.floor(Math.random() * etherealChars.length));
              }
              
              return [
                chatActions.updateMessage({ id: typingId, changes: { text: actualText + scramble } }),
                chatActions.triggerScrollToBottom()
              ];
            } else {
              return [
                chatActions.updateMessage({ id: typingId, changes: { text } }),
                chatActions.setWaitingForResponse({ isWaiting: false }),
                chatActions.triggerScrollToBottom()
              ];
            }
          })
        );
      })
    ) }
  );

  public postMessageFailure$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    { return this.actions$.pipe(
      ofType(chatActions.postMessageFailure),
      concatLatestFrom(() => this.store.select(chatSelectors.selectMessages)),
      mergeMap(([{ typingId, errorMsg }, messages]: [{ typingId: string; errorMsg: string; }, Message[]]) => {
        void this.toastSvc.showError('Connection issue while communicating with MIRROR.');
        
        const filteredMessages: Message[] = messages.filter((m: Message) => m.id !== typingId);
        const mirrorReply: Message = {
          id: Math.random().toString(36).substring(7),
          sender: 'mirror',
          text: errorMsg,
          timestamp: new Date(),
          isCurrentSession: true
        };

        return [
          chatActions.setMessages({ messages: filteredMessages }),
          chatActions.addMessage({ message: mirrorReply }),
          chatActions.setWaitingForResponse({ isWaiting: false }),
          chatActions.triggerScrollToBottom()
        ];
      })
    ) }
  );
}
