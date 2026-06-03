/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { AuthService } from '../../../../../core/services/auth.service';
import { ChatService } from './chat.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ChatStateService } from './chat-state.service';
import { Message } from './chat-state.models';
import { getEmotionColors } from '../../../../../core/constants/theme.constants';
import * as ChatActions from './store/chat.actions';

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {
  private authSvc = inject(AuthService);
  private chatSvc = inject(ChatService);
  private toastSvc = inject(ToastService);
  private chatState = inject(ChatStateService);
  private destroyRef = inject(DestroyRef);
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

  public loadChatHistory() {
    const email = this.authSvc.getEmail() || 'guest@mirror.tech';
    this.chatState.loadedEmail = email;

    if (this.chatState.isInitialLoad) this.store.dispatch(ChatActions.setLoadingHistory({ isLoading: true }));

    this.chatState.currentCursor = null;
    this.chatState.hasMoreHistory = true;

    if (this.chatState.isInitialLoad) {
      this.store.dispatch(ChatActions.setEmotion({ emotion: 'NEUTRAL' }));
      this.store.dispatch(ChatActions.setColors({ primary: '#a855f7', secondary: '#06b6d4' }));
    }

    this.chatSvc.getHistory(email, null, this.chatState.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data && data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.reverse().map((m: any) => {
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
          this.store.dispatch(ChatActions.setMessages({ messages: loadedMessages }));

          const lastMirror = [...loadedMessages].reverse().find(m => m.sender === 'mirror');
          if (lastMirror && lastMirror.primaryColor && lastMirror.secondaryColor) {
            this.store.dispatch(ChatActions.setColors({ primary: lastMirror.primaryColor, secondary: lastMirror.secondaryColor }));
            this.store.dispatch(ChatActions.setEmotion({ emotion: lastMirror.emotion || 'NEUTRAL' }));
          }

          this.chatState.hasMoreHistory = data.hasMore;
          this.chatState.currentCursor = data.nextCursor;
        }
        this.store.dispatch(ChatActions.setLoadingHistory({ isLoading: false }));
        this.chatState.isInitialLoad = false;
        this.chatState.initialChatLoadedGlobally = true;
        this.store.dispatch(ChatActions.triggerScrollToBottom());
      },
      error: async (err) => {
        console.error('Failed to load chat history from backend:', err);
        this.store.dispatch(ChatActions.setLoadingHistory({ isLoading: false }));
        this.chatState.isInitialLoad = false;
        this.chatState.initialChatLoadedGlobally = true;
        this.store.dispatch(ChatActions.triggerScrollToBottom());
        await this.toastSvc.showError('Failed to load chat history.');
      }
    });
  }

  public loadMoreHistory() {
    if (this.chatState.isLoadingMore() || !this.chatState.hasMoreHistory) return;

    const email = this.authSvc.getEmail() || 'guest@mirror.tech';
    this.store.dispatch(ChatActions.setLoadingMore({ isLoading: true }));

    this.chatSvc.getHistory(email, this.chatState.currentCursor, this.chatState.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data && data.messages && data.messages.length > 0) {
          const olderMessages: Message[] = data.messages.reverse().map((m: any) => {
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

          const currentMessages = this.chatState.messages();
          this.store.dispatch(ChatActions.setMessages({ messages: [...olderMessages, ...currentMessages] }));
          this.chatState.hasMoreHistory = data.hasMore;
          this.chatState.currentCursor = data.nextCursor;
          
          this.store.dispatch(ChatActions.triggerMaintainScroll());
        } else {
          this.chatState.hasMoreHistory = false;
        }
        this.store.dispatch(ChatActions.setLoadingMore({ isLoading: false }));
      },
      error: async (err) => {
        console.error('Failed to load more history:', err);
        this.store.dispatch(ChatActions.setLoadingMore({ isLoading: false }));
        await this.toastSvc.showError('Failed to load older messages.');
      }
    });
  }
}

