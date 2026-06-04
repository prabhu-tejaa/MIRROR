/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Component, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, OnDestroy, effect, DestroyRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import * as ChatActions from '../data-access/store/chat.actions';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, NavController, AlertController
} from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  micOutline, sendOutline, journalOutline, contrastOutline, apertureOutline, prismOutline,
  waterOutline, infiniteOutline, eyeOutline, fingerPrint, chatbubbleEllipsesOutline, refreshOutline,
  colorPaletteOutline, flashOutline, globeOutline, moonOutline, happyOutline, codeSlashOutline,
  pulseOutline, stopCircleOutline, volumeHighOutline, volumeMuteOutline
} from 'ionicons/icons';
import { AuthService } from '../../auth/data-access/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { ToastService } from '../../../core/services/toast.service';
import { Capacitor } from '@capacitor/core';

import { VoiceRecognitionService } from '../data-access/voice-recognition.service';
import { TextToSpeechService } from '../data-access/text-to-speech.service';
import { ChatStateService } from '../data-access/chat-state.service';
import { Message } from '../data-access/chat-state.models';

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.page.html',
  styleUrls: ['chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ],
  animations: [
    trigger('messageAnimation', [
      transition(':leave', [
        style({ opacity: 1, transform: 'scale(1)', height: '*' }),
        animate('600ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 0, transform: 'scale(0.9)', height: 0, padding: 0, margin: 0 }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPage implements OnDestroy {
  private authSvc = inject(AuthService);
  private roleSvc = inject(RoleService);
  private alertCtrl = inject(AlertController);
  private toastSvc = inject(ToastService);
  private navCtrl = inject(NavController);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  
  public voiceRecognitionSvc = inject(VoiceRecognitionService);
  public ttsSvc = inject(TextToSpeechService);
  public chatState = inject(ChatStateService);

  private initialInputText = '';
  private isSpeechToggleInFlight = false;
  private scrollListenerAttached = false;
  private initialScrollCompleted = false;
  private scrollObserver?: MutationObserver;
  private scrollObserverTimeout?: any;

  @ViewChild('streamScroll', { static: false }) private streamScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput', { static: false }) private textInput?: ElementRef<HTMLTextAreaElement>;

  // Public Properties for HTML Template
  public readonly isGuest = computed(() => this.authSvc.getEmail() === 'guest@mirror.tech');
  public readonly isAdmin = computed(() => this.roleSvc.hasRole('ADMIN'));
  
  public readonly chatInput = signal<string>('');
  
  // Aliases to services for the template
  public readonly activeQuote = this.chatState.activeQuote;
  public readonly activeStyle = this.chatState.activeStyle;
  public readonly currentEmotion = this.chatState.currentEmotion;
  public readonly currentPrimaryColor = this.chatState.currentPrimaryColor;
  public readonly currentSecondaryColor = this.chatState.currentSecondaryColor;
  public readonly isWaitingForResponse = this.chatState.isWaitingForResponse;
  public readonly isResting = this.chatState.isResting;
  public readonly isLoadingHistory = this.chatState.isLoadingHistory;
  public readonly isLoadingMore = this.chatState.isLoadingMore;
  public readonly todayMessages = this.chatState.todayMessages;
  public readonly isRecording = this.voiceRecognitionSvc.isRecording;
  public readonly currentlySpeakingId = this.ttsSvc.currentlySpeakingId;

  constructor() {
    addIcons({
      micOutline, sendOutline, journalOutline, contrastOutline, apertureOutline, prismOutline,
      waterOutline, infiniteOutline, eyeOutline, fingerPrint, chatbubbleEllipsesOutline, refreshOutline,
      colorPaletteOutline, flashOutline, globeOutline, moonOutline, happyOutline, codeSlashOutline,
      pulseOutline, stopCircleOutline, volumeHighOutline, volumeMuteOutline
    });

    this.chatState.fetchDynamicQuote();

    effect(() => {
      if (this.isRecording()) {
        this.initialInputText = this.chatInput();
      }
    });

    this.voiceRecognitionSvc.transcriptionUpdate.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(update => {
      if (update.isPartial) {
        this.chatInput.set(this.initialInputText ? `${this.initialInputText} ${update.text}` : update.text);
      } else {
        this.chatInput.update((curr: string) => curr ? `${curr} ${update.text}` : update.text);
      }
      setTimeout(() => this.adjustTextareaHeight(), 0);
    });

    // React to UI layout triggers from state service
    effect(() => {
      const trigger = this.chatState.scrollToBottomTrigger();
      if (trigger > 0) {
        const behavior = this.initialScrollCompleted ? 'smooth' : 'auto';
        this.triggerDynamicScrollToBottom(behavior);
      }
    });

    effect(() => {
      const trigger = this.chatState.maintainScrollTrigger();
      if (trigger > 0) {
        const scrollEl = this.streamScroll?.nativeElement;
        if (scrollEl) {
          const prevScrollHeight = scrollEl.scrollHeight;
          const prevScrollTop = scrollEl.scrollTop;
          setTimeout(() => {
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }, 50);
        }
      }
    });

    effect(() => {
      const isLoading = this.isLoadingHistory();
      if (!isLoading) {
        setTimeout(() => {
          this.initialScrollCompleted = true;
        }, 500);
      }
    });
  }

  public getUsername(): string {
    return this.authSvc.getUserId() || 'Friend';
  }

  public getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Up late';
  }

  public ionViewWillEnter() {
    const currentEmail = this.authSvc.getEmail() || 'guest@mirror.tech';
    if (!this.chatState.initialChatLoadedGlobally() || this.chatState.loadedEmail() !== currentEmail) {
      this.initialScrollCompleted = false;
      this.store.dispatch(ChatActions.loadChatHistory());
    } else {
      this.initialScrollCompleted = true;
    }
  }

  public ionViewDidEnter() {
    this.focusInput();
    const currentEmail = this.authSvc.getEmail() || 'guest@mirror.tech';
    if (!(this.chatState.isInitialLoad() || this.chatState.loadedEmail() !== currentEmail)) {
      this.triggerDynamicScrollToBottom('auto');
    }
    this.setupScrollListener();
  }

  private setupScrollListener() {
    if (this.scrollListenerAttached) return;
    setTimeout(() => {
      const scrollEl = this.streamScroll?.nativeElement;
      if (scrollEl) {
        this.scrollListenerAttached = true;
        
        // Permanent mutation observer to catch DOM changes before paint
        const mo = new MutationObserver(() => {
          if (!this.initialScrollCompleted && scrollEl) {
            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
            scrollEl.scrollTop = maxScroll;
          }
        });
        mo.observe(scrollEl, { childList: true, subtree: true, characterData: true });

        scrollEl.addEventListener('scroll', () => {
          if (!this.initialScrollCompleted) return;
          
          const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
          // Do not auto-load if the screen isn't even full yet
          if (maxScroll <= 0) return; 

          const isAtTop = scrollEl.scrollTop <= 10;
          const isAtBottom = scrollEl.scrollTop >= (maxScroll - 10);

          if (isAtTop && !isAtBottom && this.chatState.hasMoreHistory() && !this.isLoadingMore() && !this.chatState.isInitialLoad()) {
            this.store.dispatch(ChatActions.loadMoreHistory());
          }
        }, { passive: true });
      }
    }, 300);
  }

  private scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (this.streamScroll?.nativeElement) {
      const el = this.streamScroll.nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  }

  private triggerDynamicScrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = this.streamScroll?.nativeElement;
    if (!el) return;

    let hasUsedSmooth = false;

    const doScroll = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      const distance = maxScroll - el.scrollTop;
      
      let actualBehavior = behavior;
      
      // If we are already near the bottom, lock to auto to avoid jitter
      if (distance < 100) {
        actualBehavior = 'auto';
      } else if (behavior === 'smooth') {
        // Only trigger smooth scroll once per sequence to prevent stuttering
        if (hasUsedSmooth) {
          actualBehavior = 'auto';
        } else {
          hasUsedSmooth = true;
        }
      }

      el.scrollTo({ top: el.scrollHeight, behavior: actualBehavior });
    };

    doScroll();

    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      clearTimeout(this.scrollObserverTimeout);
    }

    this.scrollObserver = new MutationObserver(() => {
      doScroll();
    });
    this.scrollObserver.observe(el, { childList: true, subtree: true, characterData: true });

    this.scrollObserverTimeout = setTimeout(() => {
      this.scrollObserver?.disconnect();
      this.scrollObserver = undefined;
      if (!this.initialScrollCompleted) {
        this.initialScrollCompleted = true;
      }
    }, 800);
  }

  public focusInput() {
    if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    setTimeout(() => {
      if (this.textInput?.nativeElement) {
        const input = this.textInput.nativeElement;
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
        setTimeout(() => this.scrollToBottom('auto'), 50);
      }
    }, 150);
  }

  public moveCursorToEnd(event: Event) {
    const input = event.target as HTMLTextAreaElement;
    if (input) {
      setTimeout(() => {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }, 0);
    }
  }

  public async toggleRecording() {
    if (this.isSpeechToggleInFlight) return;
    this.isSpeechToggleInFlight = true;
    try {
      await this.voiceRecognitionSvc.toggleRecording();
    } finally {
      this.isSpeechToggleInFlight = false;
    }
  }

  public selectStyle(style: 'cyberpunk' | 'aurora') {
    this.store.dispatch(ChatActions.setStyle({ style }));
  }

  public useChip(chipText: string) {
    if (this.isWaitingForResponse()) return;
    if (!this.chatState.checkGuestLimit()) {
      this.showSignupPopup();
      return;
    }
    this.chatInput.set('');
    setTimeout(() => this.adjustTextareaHeight(), 0);
    this.focusInput();
    this.store.dispatch(ChatActions.postMessage({ text: chipText }));
    this.focusInput();
  }

  public adjustTextareaHeight() {
    if (this.textInput?.nativeElement) {
      const textarea = this.textInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  public handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.triggerSend();
    }
  }

  public async triggerSend() {
    const input = this.chatInput().trim();
    if (input && !this.isWaitingForResponse()) {
      if (input.length > 2000) {
        await this.toastSvc.showError('Your message is too long. Please keep it under 2,000 characters.');
        return;
      }
      if (!this.chatState.checkGuestLimit()) {
        this.showSignupPopup();
        return;
      }
      this.chatInput.set('');
      setTimeout(() => this.adjustTextareaHeight(), 0);
      this.focusInput();
      this.store.dispatch(ChatActions.postMessage({ text: input }));
      this.focusInput();
    }
  }

  public speakText(msgId: string, text: string, event?: Event) {
    if (event) event.stopPropagation();
    this.ttsSvc.speakText(msgId, text);
  }

  private async showSignupPopup() {
    const alert = await this.alertCtrl.create({
      header: 'Limit Reached',
      message: 'Please sign up to access all the features and unlock unlimited synchronization.',
      cssClass: 'mirror-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: 'Sign Up',
          cssClass: 'alert-signup-btn',
          handler: () => {
            this.authSvc.logout();
            this.navCtrl.navigateRoot('/signup', { animated: true });
          }
        }
      ]
    });
    await alert.present();
  }

  public trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

  public ngOnDestroy() {
    this.ttsSvc.cancel();
    this.voiceRecognitionSvc.destroy();
    this.chatState.destroy();
  }
}
