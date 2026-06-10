import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';
import { Store, Action } from '@ngrx/store';
import { of, from, interval, Observable } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, mergeMap, distinctUntilChanged, takeWhile, concatMap } from 'rxjs/operators';

import { getEmotionColors } from '../../../../core/constants/theme.constants';
import { ToastService } from '../../../../core/services/toast.service';
import { selectUserEmail } from '../../../auth/data-access/store/auth.selectors';
import { Message } from '../chat-state.models';
import { ChatService } from '../chat.service';

import * as chatActions from './chat.actions';
import * as chatSelectors from './chat.selectors';

interface BackendMessage {
  id: string | number;
  sender?: string;
  content: string;
  createdAt: string | number;
  emotion?: string;
}

interface HistoryResponse {
  messages: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
}

const ETHEREAL_CHARS = '~〰✧✦⋆·°*:.' as const;
const TYPING_INTERVAL_MS = 15 as const;
const BASE_SPEED = 1.2 / 15;
const WAVE_FREQ = 1 / 300;
const WAVE_AMP = 4 as const;
const DEFAULT_EMAIL = 'guest@mirror.tech' as const;

@Injectable()
export class ChatEffects {
  private actions$: Actions = inject(Actions);
  private chatSvc: ChatService = inject(ChatService);
  private toastSvc: ToastService = inject(ToastService);
  private store: Store<object> = inject(Store);

  private parseEmotionParts(rawEmotion: string): { emotion: string; primary: string; secondary: string } {
    const parts: string[] = rawEmotion.split('|');
    if (parts.length >= 4) {
      return { emotion: parts[1]?.trim() || 'NEUTRAL', primary: parts[2]?.trim() || '', secondary: parts[3]?.trim() || '' };
    }
    return { emotion: parts[0]?.trim() || 'NEUTRAL', primary: parts[1]?.trim() || '', secondary: parts[2]?.trim() || '' };
  }

  private isValidColor(c: string): boolean {
    return c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl');
  }

  private parseEmotionAndColors(rawEmotion: string | undefined): { emotion: string; primary: string; secondary: string } {
    if (!rawEmotion) { return { emotion: 'NEUTRAL', primary: '#a855f7', secondary: '#06b6d4' }; }
    const { emotion, primary, secondary } = this.parseEmotionParts(rawEmotion);
    if (!this.isValidColor(primary) || !this.isValidColor(secondary)) {
      const colors: { primary: string; secondary: string; name: string; } = getEmotionColors(emotion);
      return { emotion, primary: colors.primary, secondary: colors.secondary };
    }
    return { emotion, primary, secondary };
  }

  private mapBackendMessage(m: BackendMessage): Message {
    const { emotion, primary, secondary } = this.parseEmotionAndColors(m.emotion);
    const ts: Date = typeof m.createdAt === 'number'
      ? new Date(m.createdAt > 9999999999 ? m.createdAt : m.createdAt * 1000)
      : new Date(m.createdAt || new Date());
    return { id: m.id.toString(), sender: (m.sender as 'user' | 'mirror') || 'user', text: m.content, timestamp: ts, emotion, primaryColor: primary, secondaryColor: secondary };
  }

  private buildHistoryActions(data: HistoryResponse, targetEmail: string): Action[] {
    const messages: Message[] = (data?.messages || []).reverse().map((m: unknown) => this.mapBackendMessage(m as BackendMessage));
    const actionsArr: Action[] = [
      chatActions.loadChatHistorySuccess({ messages, nextCursor: data?.nextCursor || null, hasMore: !!data?.hasMore, loadedEmail: targetEmail }),
      chatActions.triggerScrollToBottom()
    ];
    const lastMirror: Message | undefined = [...messages].reverse().find((m: Message) => m.sender === 'mirror');
    if (lastMirror?.primaryColor && lastMirror.secondaryColor) {
      actionsArr.push(chatActions.setColors({ primary: lastMirror.primaryColor, secondary: lastMirror.secondaryColor }));
      actionsArr.push(chatActions.setEmotion({ emotion: lastMirror.emotion || 'NEUTRAL' }));
    } else {
      actionsArr.push(chatActions.setEmotion({ emotion: 'NEUTRAL' }));
      actionsArr.push(chatActions.setColors({ primary: '#a855f7', secondary: '#06b6d4' }));
    }
    return actionsArr;
  }

  private buildPostMessageActions(_typingId: string, userMsg: Message, typingMsg: Message): Action[] {
    return [
      chatActions.addMessage({ message: userMsg }),
      chatActions.addMessage({ message: typingMsg }),
      chatActions.triggerScrollToBottom(),
      chatActions.setWaitingForResponse({ isWaiting: true })
    ];
  }

  private buildErrorMsg(err: { status?: number; error?: { message?: string } | string; message?: string }): string {
    const detailedMsg: string = typeof err.error === 'object' ? (err.error?.message ?? '') : (err.error ?? err.message ?? '');
    const isConfig: boolean = detailedMsg.toLowerCase().includes('key is not configured') || detailedMsg.toLowerCase().includes('apikey');
    const isRateLimit: boolean = err.status === 429 || detailedMsg.toLowerCase().includes('quota') || detailedMsg.toLowerCase().includes('rate_limit');
    if (isRateLimit) { return '⚠️ [QUOTA EXCEEDED] Daily free-tier limit reached. MIRROR resets tomorrow.'; }
    if (isConfig) { return '⚠️ [CONFIGURATION ERROR] Gemini API Key not configured. Set GEMINI_API_KEY in backend.'; }
    if (err.status === 500) { return `⚠️ [REFLECTION ERROR] Internal Server Error: ${detailedMsg || 'Unknown'}.`; }
    if (err.status === 0) { return '⚠️ [NETWORK ERROR] Cannot reach memory service. Verify backend is active.'; }
    return '⚠️ [CONNECTION ERROR] Failed to connect to MIRROR. Ensure backend is running.';
  }

  private buildTypingFrameActions(typingId: string, text: string, charIdx: number): Action[] {
    if (charIdx < text.length) {
      const remaining: number = text.length - charIdx;
      const scrambleLen: number = Math.min(3, remaining);
      let scramble: string = '';
      for (let i: number = 0; i < scrambleLen; i++) {
        scramble += ETHEREAL_CHARS.charAt(Math.floor(Math.random() * ETHEREAL_CHARS.length));
      }
      return [
        chatActions.updateMessage({ id: typingId, changes: { text: text.slice(0, charIdx) + scramble } }),
        chatActions.triggerScrollToBottom()
      ];
    }
    return [
      chatActions.updateMessage({ id: typingId, changes: { text } }),
      chatActions.setWaitingForResponse({ isWaiting: false }),
      chatActions.triggerScrollToBottom()
    ];
  }

  private buildTypingObservable(typingId: string, text: string): Observable<Action> {
    const startTime: number = Date.now();
    let lastTick: number = startTime;
    let maxCharIdxSeen: number = 0;

    return interval(TYPING_INTERVAL_MS).pipe(
      map((): number => {
        const now: number = Date.now();
        const delta: number = now - lastTick;
        lastTick = now;
        if (delta > 100) { return text.length; }
        const elapsed: number = now - startTime;
        const rawProgress: number = (elapsed * BASE_SPEED) + (Math.sin(elapsed * WAVE_FREQ) * WAVE_AMP);
        let currentCharIdx: number = Math.floor(rawProgress);
        if (currentCharIdx < maxCharIdxSeen) { currentCharIdx = maxCharIdxSeen; }
        maxCharIdxSeen = currentCharIdx;
        return Math.min(currentCharIdx, text.length);
      }),
      distinctUntilChanged(),
      takeWhile((charIdx: number) => charIdx < text.length, true),
      mergeMap((charIdx: number) => from(this.buildTypingFrameActions(typingId, text, charIdx)))
    );
  }

  public loadDynamicQuote$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.loadDynamicQuote),
      switchMap(() =>
        this.chatSvc.getRandomQuote().pipe(
          map((res: { quote: string; author: string; }): Action => {
            if (res?.quote && res?.author) {
              return chatActions.setDynamicQuote({ quote: { text: res.quote, author: res.author } });
            }
            return { type: '[Chat] Load Dynamic Quote Failed' } as Action;
          }),
          catchError((): Observable<Action> => {
            void this.toastSvc.showInfo('Using local quotes (offline mode).');
            return of({ type: '[Chat] Load Dynamic Quote Failed' } as Action);
          })
        )
      )
    )
  );

  public loadChatHistory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.loadChatHistory),
      withLatestFrom(this.store.select(selectUserEmail)),
      switchMap(([, email]: [Action, string | null]): Observable<Action> => {
        const targetEmail: string = email || DEFAULT_EMAIL;
        return this.chatSvc.getHistory(targetEmail, null, 20).pipe(
          mergeMap((data: HistoryResponse) => from(this.buildHistoryActions(data, targetEmail))),
          catchError((): Observable<Action> => {
            void this.toastSvc.showError('Failed to load chat history.');
            return of(chatActions.loadChatHistoryFailure({ error: new Error('History load failed') }));
          })
        );
      })
    )
  );

  public loadMoreHistory$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.loadMoreHistory),
      withLatestFrom(this.store.select(selectUserEmail), this.store.select(chatSelectors.selectCurrentCursor)),
      switchMap(([, email, cursor]: [Action, string | null, string | null]): Observable<Action> => {
        const targetEmail: string = email || DEFAULT_EMAIL;
        return this.chatSvc.getHistory(targetEmail, cursor, 20).pipe(
          mergeMap((data: HistoryResponse): Observable<Action> => {
            const msgs: Message[] = (data?.messages || []).reverse().map((m: unknown) => this.mapBackendMessage(m as BackendMessage));
            return from([chatActions.loadMoreHistorySuccess({ messages: msgs, nextCursor: data?.nextCursor || null, hasMore: !!data?.hasMore }), chatActions.triggerMaintainScroll()]);
          }),
          catchError((): Observable<Action> => {
            void this.toastSvc.showError('Failed to load older messages.');
            return of(chatActions.loadMoreHistoryFailure({ error: new Error('Load more failed') }));
          })
        );
      })
    )
  );

  public postMessage$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.postMessage),
      withLatestFrom(this.store.select(selectUserEmail)),
      concatMap(([{ text }, email]: [{ text: string; }, string | null]): Observable<Action> => {
        const userMsgId: string = Math.random().toString(36).substring(7);
        const typingId: string = 'typing-' + Math.random().toString(36).substring(7);
        const userMsg: Message = { id: userMsgId, sender: 'user', text, timestamp: new Date(), isCurrentSession: true };
        const typingMsg: Message = { id: typingId, sender: 'mirror', text: '', timestamp: new Date(), isTyping: true, isCurrentSession: true };
        const targetEmail: string = email || DEFAULT_EMAIL;

        const immediateActions: Action[] = this.buildPostMessageActions(typingId, userMsg, typingMsg);

        const apiCall$: Observable<Action> = this.chatSvc.reflect(targetEmail, text).pipe(
          map((res: { reflection: string; emotion: string; }): Action => {
            const { emotion, primary, secondary } = this.parseEmotionAndColors(res.emotion);
            return chatActions.postMessageSuccess({ typingId, text: res.reflection || 'Thank you for sharing.', emotion, primary, secondary });
          }),
          catchError((err: { status?: number; error?: { message?: string } | string; message?: string }): Observable<Action> =>
            of(chatActions.postMessageFailure({ typingId, errorMsg: this.buildErrorMsg(err) }))
          )
        );

        return from([...immediateActions.map((a: Action): Observable<Action> => of(a)), apiCall$]).pipe(
          concatMap((obs: Observable<Action>): Observable<Action> => obs)
        );
      })
    )
  );

  public startTypingAnimation$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.postMessageSuccess),
      switchMap(({ typingId, text, emotion, primary, secondary }): Observable<Action> => {
        const setupActions: Action[] = [
          chatActions.setEmotion({ emotion }),
          chatActions.setColors({ primary, secondary }),
          chatActions.updateMessage({ id: typingId, changes: { text: '', isTyping: false, emotion, primaryColor: primary, secondaryColor: secondary } })
        ];
        return from([from(setupActions), this.buildTypingObservable(typingId, text)]).pipe(
          concatMap((obs: Observable<Action>): Observable<Action> => obs)
        );
      })
    )
  );

  public postMessageFailure$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(chatActions.postMessageFailure),
      withLatestFrom(this.store.select(chatSelectors.selectMessages)),
      mergeMap(([{ typingId, errorMsg }, messages]: [{ typingId: string; errorMsg: string; }, Message[]]): Observable<Action> => {
        void this.toastSvc.showError('Connection issue while communicating with MIRROR.');
        const filteredMessages: Message[] = messages.filter((m: Message) => m.id !== typingId);
        const mirrorReply: Message = { id: Math.random().toString(36).substring(7), sender: 'mirror', text: errorMsg, timestamp: new Date(), isCurrentSession: true };
        return from([
          chatActions.setMessages({ messages: filteredMessages }),
          chatActions.addMessage({ message: mirrorReply }),
          chatActions.setWaitingForResponse({ isWaiting: false }),
          chatActions.triggerScrollToBottom()
        ]);
      })
    )
  );
}

