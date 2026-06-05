import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, OnDestroy, effect, DestroyRef, Signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import {
  IonContent, IonIcon, NavController, AlertController
} from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { addIcons } from 'ionicons';
import {
  micOutline, sendOutline, journalOutline, contrastOutline, apertureOutline, prismOutline,
  waterOutline, infiniteOutline, eyeOutline, fingerPrint, chatbubbleEllipsesOutline, refreshOutline,
  colorPaletteOutline, flashOutline, globeOutline, moonOutline, happyOutline, codeSlashOutline,
  pulseOutline, stopCircleOutline, volumeHighOutline, volumeMuteOutline
} from 'ionicons/icons';

import { RoleService } from '../../../core/services/role.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../auth/data-access/auth.service';
import { Message } from '../data-access/chat-state.models';
import { ChatStateService } from '../data-access/chat-state.service';
import * as chatActions from '../data-access/store/chat.actions';
import { TextToSpeechService } from '../data-access/text-to-speech.service';
import { VoiceRecognitionService } from '../data-access/voice-recognition.service';

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
  private authSvc: AuthService = inject(AuthService);
  private roleSvc: RoleService = inject(RoleService);
  private alertCtrl: AlertController = inject(AlertController);
  private toastSvc: ToastService = inject(ToastService);
  private navCtrl: NavController = inject(NavController);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private store: Store = inject(Store);
  
  public voiceRecognitionSvc: VoiceRecognitionService = inject(VoiceRecognitionService);
  public ttsSvc: TextToSpeechService = inject(TextToSpeechService);
  public chatState: ChatStateService = inject(ChatStateService);

  private initialInputText: string = '';
  private isSpeechToggleInFlight: boolean = false;
  private scrollListenerAttached: boolean = false;
  private initialScrollCompleted: boolean = false;
  private scrollObserver?: MutationObserver;
  private scrollObserverTimeout?: ReturnType<typeof setTimeout>;

  @ViewChild('streamScroll', { static: false }) private streamScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput', { static: false }) private textInput?: ElementRef<HTMLTextAreaElement>;

  public readonly isGuest: Signal<boolean> = computed(() => this.authSvc.getEmail() === 'guest@mirror.tech');
  public readonly isAdmin: Signal<boolean> = computed(() => this.roleSvc.hasRole('ADMIN'));
  
  public readonly chatInput: WritableSignal<string> = signal<string>('');
  
  public readonly activeQuote: Signal<import('../data-access/store/chat-state.models').Quote> = this.chatState.activeQuote;
  public readonly activeStyle: Signal<'cyberpunk' | 'aurora'> = this.chatState.activeStyle;
  public readonly currentEmotion: Signal<string> = this.chatState.currentEmotion;
  public readonly currentPrimaryColor: Signal<string> = this.chatState.currentPrimaryColor;
  public readonly currentSecondaryColor: Signal<string> = this.chatState.currentSecondaryColor;
  public readonly isWaitingForResponse: Signal<boolean> = this.chatState.isWaitingForResponse;
  public readonly isResting: Signal<boolean> = this.chatState.isResting;
  public readonly isLoadingHistory: Signal<boolean> = this.chatState.isLoadingHistory;
  public readonly isLoadingMore: Signal<boolean> = this.chatState.isLoadingMore;
  public readonly todayMessages: Signal<Message[]> = this.chatState.todayMessages;
  public readonly isRecording: Signal<boolean> = this.voiceRecognitionSvc.isRecording;
  public readonly currentlySpeakingId: Signal<string | null> = this.ttsSvc.currentlySpeakingId;

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

    this.voiceRecognitionSvc.transcriptionUpdate.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((update: { text: string; isPartial: boolean; }) => {
      if (update.isPartial) {
        this.chatInput.set(this.initialInputText ? `${this.initialInputText} ${update.text}` : update.text);
      } else {
        this.chatInput.update((curr: string) => curr ? `${curr} ${update.text}` : update.text);
      }
      setTimeout(() => this.adjustTextareaHeight(), 0);
    });

    effect(() => {
      const trigger: number = this.chatState.scrollToBottomTrigger();
      if (trigger > 0) {
        const behavior: "smooth" | "auto" = this.initialScrollCompleted ? 'smooth' : 'auto';
        this.triggerDynamicScrollToBottom(behavior);
      }
    });

    effect(() => {
      const trigger: number = this.chatState.maintainScrollTrigger();
      if (trigger > 0) {
        const scrollEl: HTMLDivElement | undefined = this.streamScroll?.nativeElement;
        if (scrollEl) {
          const prevScrollHeight: number = scrollEl.scrollHeight;
          const prevScrollTop: number = scrollEl.scrollTop;
          setTimeout(() => {
            const newScrollHeight: number = scrollEl.scrollHeight;
            scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }, 50);
        }
      }
    });

    effect(() => {
      const isLoading: boolean = this.isLoadingHistory();
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
    const hour: number = new Date().getHours();
    if (hour >= 5 && hour < 12) {return 'Good morning';}
    if (hour >= 12 && hour < 17) {return 'Good afternoon';}
    if (hour >= 17 && hour < 22) {return 'Good evening';}
    return 'Up late';
  }

  public ionViewWillEnter(): void {
    const currentEmail: string = this.authSvc.getEmail() || 'guest@mirror.tech';
    if (!this.chatState.initialChatLoadedGlobally() || this.chatState.loadedEmail() !== currentEmail) {
      this.initialScrollCompleted = false;
      this.store.dispatch(chatActions.loadChatHistory());
    } else {
      this.initialScrollCompleted = true;
    }
  }

  public ionViewDidEnter(): void {
    this.focusInput();
    const currentEmail: string = this.authSvc.getEmail() || 'guest@mirror.tech';
    if (!(this.chatState.isInitialLoad() || this.chatState.loadedEmail() !== currentEmail)) {
      this.triggerDynamicScrollToBottom('auto');
    }
    this.setupScrollListener();
  }

  private setupScrollListener(): void {
    if (this.scrollListenerAttached) {return;}
    setTimeout(() => {
      const scrollEl: HTMLDivElement | undefined = this.streamScroll?.nativeElement;
      if (scrollEl) {
        this.scrollListenerAttached = true;
        
        const mo: MutationObserver = new MutationObserver(() => {
          if (!this.initialScrollCompleted && scrollEl) {
            const maxScroll: number = scrollEl.scrollHeight - scrollEl.clientHeight;
            scrollEl.scrollTop = maxScroll;
          }
        });
        mo.observe(scrollEl, { childList: true, subtree: true, characterData: true });

        scrollEl.addEventListener('scroll', () => {
          if (!this.initialScrollCompleted) {return;}
          
          const maxScroll: number = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (maxScroll <= 0) {return;} 

          const isAtTop: boolean = scrollEl.scrollTop <= 10;
          const isAtBottom: boolean = scrollEl.scrollTop >= (maxScroll - 10);

          if (isAtTop && !isAtBottom && this.chatState.hasMoreHistory() && !this.isLoadingMore() && !this.chatState.isInitialLoad()) {
            this.store.dispatch(chatActions.loadMoreHistory());
          }
        }, { passive: true });
      }
    }, 300);
  }

  private scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    if (this.streamScroll?.nativeElement) {
      const el: HTMLDivElement = this.streamScroll.nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  }

  private triggerDynamicScrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const el: HTMLDivElement | undefined = this.streamScroll?.nativeElement;
    if (!el) {return;}

    let hasUsedSmooth: boolean = false;

    const doScroll: () => void = () => {
      const maxScroll: number = el.scrollHeight - el.clientHeight;
      const distance: number = maxScroll - el.scrollTop;
      
      let actualBehavior: ScrollBehavior = behavior;
      
      if (distance < 100) {
        actualBehavior = 'auto';
      } else if (behavior === 'smooth') {
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

  public focusInput(): void {
    if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth < 768)) {return;}
    setTimeout(() => {
      if (this.textInput?.nativeElement) {
        const input: HTMLTextAreaElement = this.textInput.nativeElement;
        input.focus();
        const len: number = input.value.length;
        input.setSelectionRange(len, len);
        setTimeout(() => this.scrollToBottom('auto'), 50);
      }
    }, 150);
  }

  public moveCursorToEnd(event: Event): void {
    const input: HTMLTextAreaElement = event.target as HTMLTextAreaElement;
    if (input) {
      setTimeout(() => {
        const len: number = input.value.length;
        input.setSelectionRange(len, len);
      }, 0);
    }
  }

  public async toggleRecording(): Promise<void> {
    if (this.isSpeechToggleInFlight) {return;}
    this.isSpeechToggleInFlight = true;
    try {
      await this.voiceRecognitionSvc.toggleRecording();
    } finally {
      this.isSpeechToggleInFlight = false;
    }
  }

  public selectStyle(style: 'cyberpunk' | 'aurora'): void {
    this.store.dispatch(chatActions.setStyle({ style }));
  }

  public useChip(chipText: string): void {
    if (this.isWaitingForResponse()) {return;}
    if (!this.chatState.checkGuestLimit()) {
      void this.showSignupPopup();
      return;
    }
    this.chatInput.set('');
    setTimeout(() => this.adjustTextareaHeight(), 0);
    this.focusInput();
    this.store.dispatch(chatActions.postMessage({ text: chipText }));
    this.focusInput();
  }

  public adjustTextareaHeight(): void {
    if (this.textInput?.nativeElement) {
      const textarea: HTMLTextAreaElement = this.textInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  public handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.triggerSend();
    }
  }

  public async triggerSend(): Promise<void> {
    const input: string = this.chatInput().trim();
    if (input && !this.isWaitingForResponse()) {
      if (input.length > 2000) {
        await this.toastSvc.showError('Your message is too long. Please keep it under 2,000 characters.');
        return;
      }
      if (!this.chatState.checkGuestLimit()) {
        await this.showSignupPopup();
        return;
      }
      this.chatInput.set('');
      setTimeout(() => this.adjustTextareaHeight(), 0);
      this.focusInput();
      this.store.dispatch(chatActions.postMessage({ text: input }));
      this.focusInput();
    }
  }

  public speakText(msgId: string, text: string, event?: Event): void {
    if (event) {event.stopPropagation();}
    this.ttsSvc.speakText(msgId, text);
  }

  private async showSignupPopup(): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
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
            await this.navCtrl.navigateRoot('/signup', { animated: true });
          }
        }
      ]
    });
    await alert.present();
  }

  public trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

  public get isGuestValue() { return this.isGuest(); }
  public get isAdminValue() { return this.isAdmin(); }
  public get chatInputValue() { return this.chatInput(); }
  public get activeQuoteValue() { return this.activeQuote(); }
  public get activeStyleValue() { return this.activeStyle(); }
  public get currentEmotionValue() { return this.currentEmotion(); }
  public get currentEmotionLowercaseValue() { return this.currentEmotion() ? this.currentEmotion().toLowerCase() : ''; }
  public get currentPrimaryColorValue() { return this.currentPrimaryColor(); }
  public get currentSecondaryColorValue() { return this.currentSecondaryColor(); }
  public get isWaitingForResponseValue() { return this.isWaitingForResponse(); }
  public get isSendDisabledValue() { return !this.chatInput().trim() || this.isWaitingForResponse(); }
  public get isRestingValue() { return this.isResting(); }
  public get isLoadingHistoryValue() { return this.isLoadingHistory(); }
  public get isLoadingMoreValue() { return this.isLoadingMore(); }
  public get todayMessagesValue() { return this.todayMessages(); }
  public get todayMessagesFormattedValue() {
    return this.todayMessages().map(msg => ({
      ...msg,
      emotionClass: msg.emotion ? `emotion-${msg.emotion.toLowerCase()}` : '',
      isUser: msg.sender === 'user',
      isMirror: msg.sender === 'mirror'
    }));
  }
  public get isRecordingValue() { return this.isRecording(); }
  public get currentlySpeakingIdValue() { return this.currentlySpeakingId(); }
  
  public get greetingValue() { return this.getGreeting(); }
  public get usernameValue() { return this.getUsername(); }

  public ngOnDestroy(): void {
    this.ttsSvc.cancel();
    this.voiceRecognitionSvc.destroy();
    this.chatState.destroy();
  }
}
