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
import { ChatScrollService } from '../data-access/chat-scroll.service';
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
  private store: Store<object> = inject(Store) as unknown as Store<object>;
  
  public voiceRecognitionSvc: VoiceRecognitionService = inject(VoiceRecognitionService);
  public ttsSvc: TextToSpeechService = inject(TextToSpeechService);
  public chatState: ChatStateService = inject(ChatStateService);
  public scrollSvc: ChatScrollService = inject(ChatScrollService);

  private initialInputText: string = '';
  private isSpeechToggleInFlight: boolean = false;
  public initialScrollState: { value: boolean } = { value: false };

  @ViewChild('streamScroll', { static: false }) private streamScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput', { static: false }) private textInput?: ElementRef<HTMLTextAreaElement>;

  public readonly isGuest: Signal<boolean> = computed(() => this.authSvc.getEmail() === 'guest@mirror.tech');
  public readonly isAdmin: Signal<boolean> = computed(() => this.roleSvc.hasRole('ADMIN'));
  
  public readonly chatInput: WritableSignal<string> = signal<string>('');
  
  public readonly activeQuote: Signal<import('../data-access/chat-state.models').Quote> = this.chatState.activeQuote;
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
    this.setupEffects();
  }

  private setupEffects(): void {
    effect(() => {
      if (this.isRecording()) { this.initialInputText = this.chatInput(); }
    });
    this.voiceRecognitionSvc.transcriptionUpdate.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((update: { text: string; isPartial: boolean; }) => {
      if (update.isPartial) { this.chatInput.set(this.initialInputText ? `${this.initialInputText} ${update.text}` : update.text); } 
      else { this.chatInput.update((curr: string) => curr ? `${curr} ${update.text}` : update.text); }
      setTimeout(() => this.adjustTextareaHeight(), 0);
    });
    effect(() => {
      if (this.chatState.scrollToBottomTrigger() > 0) {
        const behavior: "smooth" | "auto" = this.initialScrollState.value ? 'smooth' : 'auto';
        if (this.streamScroll?.nativeElement) { this.scrollSvc.triggerDynamicScrollToBottom(this.streamScroll.nativeElement, behavior, this.initialScrollState); }
      }
    });
    effect(() => {
      if (this.chatState.maintainScrollTrigger() > 0) {
        const scrollEl: HTMLDivElement | undefined = this.streamScroll?.nativeElement;
        if (scrollEl) {
          const prevH: number = scrollEl.scrollHeight;
          const prevT: number = scrollEl.scrollTop;
          setTimeout(() => { scrollEl.scrollTop = prevT + (scrollEl.scrollHeight - prevH); }, 50);
        }
      }
    });
    effect(() => {
      if (!this.isLoadingHistory()) { setTimeout(() => { this.initialScrollState.value = true; }, 500); }
    });
  }

  public getUsername(): string {
    return this.authSvc.getUserId() || 'Friend';
  }

  public getGreeting(): string {
    const hour: number = new Date().getHours();
    if (hour < 5) { return 'Up late'; }
    if (hour < 12) { return 'Good morning'; }
    if (hour < 17) { return 'Good afternoon'; }
    if (hour < 22) { return 'Good evening'; }
    return 'Up late';
  }

  public ionViewWillEnter(): void {
    const currentEmail: string = this.authSvc.getEmail() || 'guest@mirror.tech';
    if (!this.chatState.initialChatLoadedGlobally() || this.chatState.loadedEmail() !== currentEmail) {
      this.initialScrollState.value = false;
      this.store.dispatch(chatActions.loadChatHistory());
    } else {
      this.initialScrollState.value = true;
    }
  }

  public ionViewDidEnter(): void {
    this.focusInput();
    const scrollEl: HTMLDivElement | undefined = this.streamScroll?.nativeElement;
    if (scrollEl) { this.initScrollForView(scrollEl); }
  }

  private initScrollForView(scrollEl: HTMLDivElement): void {
    const currentEmail: string = this.authSvc.getEmail() || 'guest@mirror.tech';
    const isSameUser: boolean = this.chatState.loadedEmail() === currentEmail;
    
    if (!this.chatState.isInitialLoad() && isSameUser) {
      this.scrollSvc.triggerDynamicScrollToBottom(scrollEl, 'auto', this.initialScrollState);
    }
    this.scrollSvc.setupScrollListener(scrollEl, this.initialScrollState, () => this.isLoadingMore()); 
  }

  public focusInput(): void {
    if (Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth < 768)) {return;}
    setTimeout(() => {
      const inputEl: HTMLTextAreaElement | undefined = this.textInput ? this.textInput.nativeElement : undefined;
      const scrollEl: HTMLDivElement | undefined = this.streamScroll ? this.streamScroll.nativeElement : undefined;
      
      if (inputEl) {
        inputEl.focus();
        const len: number = inputEl.value.length;
        inputEl.setSelectionRange(len, len);
        setTimeout(() => { if (scrollEl) { this.scrollSvc.scrollToBottom(scrollEl, 'auto'); } }, 50);
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
    const textarea: HTMLTextAreaElement | undefined = this.textInput ? this.textInput.nativeElement : undefined;
    if (textarea) {
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
          handler: async () => {
            this.authSvc.logout();
            await this.navCtrl.navigateRoot('/signup', { animated: true });
          }
        }
      ]
    });
    await alert.present();
  }

  public trackByMessageId(_index: number, message: Message): string {
    return message.id;
  }

  public readonly todayMessagesFormatted: Signal<(Message & { emotionClass: string; isUser: boolean; isMirror: boolean; })[]> = computed(() => {
    return this.todayMessages().map(msg => ({
      ...msg,
      emotionClass: msg.emotion ? `emotion-${msg.emotion.toLowerCase()}` : '',
      isUser: msg.sender === 'user',
      isMirror: msg.sender === 'mirror'
    }));
  });

  public readonly currentEmotionLowercase: Signal<string> = computed(() => this.currentEmotion() ? this.currentEmotion().toLowerCase() : '');
  public readonly isSendDisabled: Signal<boolean> = computed(() => !this.chatInput().trim() || this.isWaitingForResponse());

  public showWelcomeBanner(): boolean {
    return this.todayMessagesFormatted().length === 0 && !this.isLoadingHistory();
  }

  public getContainerClasses(): string {
    return `chat-content-container ${this.activeStyle()} emotion-${this.currentEmotionLowercase()}`;
  }

  public getMessageBubbleClass(msg: { isTyping?: boolean; emotionClass: string }): string {
    return 'message-bubble ' + (msg.isTyping ? 'typing-bubble ' : '') + msg.emotionClass;
  }

  public showVibeBadge(msg: { isMirror: boolean; emotion?: string }): boolean {
    return !!(msg.isMirror && msg.emotion && msg.emotion !== 'NEUTRAL' && this.isAdmin());
  }

  public ngOnDestroy(): void {
    this.ttsSvc.cancel();
    this.voiceRecognitionSvc.destroy();
    this.chatState.destroy();
  }
}
