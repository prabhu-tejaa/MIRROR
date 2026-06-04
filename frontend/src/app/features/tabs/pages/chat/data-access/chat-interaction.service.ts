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
export class ChatInteractionService {
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

  public sendMessage(text: string, onRestDone?: () => void) {
    this.store.dispatch(ChatActions.setWaitingForResponse({ isWaiting: true }));

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text,
      timestamp: new Date(),
      isCurrentSession: true
    };

    this.store.dispatch(ChatActions.addMessage({ message: userMsg }));
    this.store.dispatch(ChatActions.triggerScrollToBottom());
    this.simulateMirrorResponse(text, onRestDone);
  }

  private simulateMirrorResponse(prompt: string, onRestDone?: () => void) {
    const typingId = 'typing-' + Math.random().toString(36).substring(7);
    const typingMsg: Message = {
      id: typingId,
      sender: 'mirror',
      text: '',
      timestamp: new Date(),
      isTyping: true,
      isCurrentSession: true
    };

    this.store.dispatch(ChatActions.addMessage({ message: typingMsg }));
    this.store.dispatch(ChatActions.triggerScrollToBottom());

    const email = this.authSvc.getEmail() || 'guest@mirror.tech';
    this.chatSvc.reflect(email, prompt).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        // Remove typing message: we need an action to remove message, or update it
        const reflectionText = res.reflection || "Thank you for sharing your thoughts.";
        const { emotion, primary, secondary } = this.parseEmotionAndColors(res.emotion);

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
        const charsPerMs = 3 / 15;

        const streamInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          let currentCharIdx = Math.floor(elapsed * charsPerMs);
          
          if (currentCharIdx > reflectionText.length) {
            currentCharIdx = reflectionText.length;
          }

          if (currentCharIdx < reflectionText.length) {
            const streamedText = reflectionText.slice(0, currentCharIdx);
            
            this.store.dispatch(ChatActions.updateMessage({ id: typingId, changes: { text: streamedText } }));
            this.store.dispatch(ChatActions.triggerScrollToBottom());
          } else {
            this.store.dispatch(ChatActions.updateMessage({ id: typingId, changes: { text: reflectionText } }));
            clearInterval(streamInterval);
            this.chatState.activeTypingIntervals = this.chatState.activeTypingIntervals.filter(i => i !== streamInterval);
            this.store.dispatch(ChatActions.setWaitingForResponse({ isWaiting: false }));
            if (onRestDone) onRestDone();
          }
        }, 15) as unknown as number;
        this.chatState.activeTypingIntervals.push(streamInterval);
      },
      error: async (err) => {
        console.error('Failed to generate backend reflection:', err);
        const currentMessages = this.chatState.messages();
        this.store.dispatch(ChatActions.setMessages({ messages: currentMessages.filter(m => m.id !== typingId) }));

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

        const mirrorReply: Message = {
          id: Math.random().toString(36).substring(7),
          sender: 'mirror',
          text: errorMsg,
          timestamp: new Date(),
          isCurrentSession: true
        };

        this.store.dispatch(ChatActions.addMessage({ message: mirrorReply }));
        this.store.dispatch(ChatActions.setWaitingForResponse({ isWaiting: false }));
        this.store.dispatch(ChatActions.triggerScrollToBottom());
        if (onRestDone) onRestDone();

        await this.toastSvc.showError('Connection issue while communicating with MIRROR.');
      }
    });
  }
}

