/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Component, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, OnDestroy, DestroyRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, NavController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import {
  micOutline,
  sendOutline,
  journalOutline,
  contrastOutline,
  apertureOutline,
  prismOutline,
  waterOutline,
  infiniteOutline,
  eyeOutline,
  fingerPrint,
  chatbubbleEllipsesOutline,
  refreshOutline,
  colorPaletteOutline,
  flashOutline,
  globeOutline,
  moonOutline,
  happyOutline,
  codeSlashOutline,
  pulseOutline,
  stopCircleOutline,
  volumeHighOutline,
  volumeMuteOutline
} from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { RoleService } from '../../../../core/services/role.service';
import { ChatService } from '../../../../core/services/chat.service';
import { getEmotionColors } from '../../../../core/constants/theme.constants';
import { StorageService } from '../../../../core/services/storage.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StorageKeys } from '../../../../core/constants/storage.constants';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface Message {
  id: string;
  sender: 'user' | 'mirror';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
  emotion?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isCurrentSession?: boolean;
}

interface Quote {
  text: string;
  author: string;
}

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
  private toastCtrl = inject(ToastController);
  private toastSvc = inject(ToastService);
  private chatSvc = inject(ChatService);
  private destroyRef = inject(DestroyRef);
  private storageSvc = inject(StorageService);
  private isNative = false;
  private nativeListenerHandle: any = null;
  private nativeStateListenerHandle: any = null;
  private initialInputText = '';
  private isSpeechToggleInFlight = false;
  private navCtrl = inject(NavController);
  private activeTypingIntervals: any[] = [];

  public readonly isGuest = computed(() => this.authSvc.getEmail() === 'guest@mirror.com');
  public readonly isAdmin = computed(() => this.roleSvc.hasRole('ADMIN'));

  public getUsername(): string {
    return this.authSvc.getUserId() || 'Friend';
  }

  public getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good evening';
    } else {
      return 'Up late';
    }
  }

  // A clean, high-fidelity default to prevent layout shift and handle offline scenarios elegantly
  public readonly activeQuote = signal<Quote>({
    text: 'Who looks outside, dreams; who looks inside, awakes.',
    author: 'Carl Jung'
  });

  /**
   * Fetches a fresh dynamic quote from a free public API.
   * Leverages safe navigation and fallback strategies in case of CORS or connection failures.
   */
  private fetchDynamicQuote(): void {
    this.chatSvc.getRandomQuote().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res?.quote && res?.author) {
          this.activeQuote.set({
            text: res.quote,
            author: res.author
          });
        }
      },
      error: async (err) => {
        console.warn('[ChatPage] Failed to fetch dynamic quote from public API, using local fallback:', err);
        const toast = await this.toastCtrl.create({
          message: 'Using local quotes (offline mode).',
          duration: 2000,
          color: 'medium'
        });
        toast.present();
      }
    });
  }


  private checkGuestLimit(): boolean {
    if (this.authSvc.isAuthenticated()) {
      return true;
    }
    const val = this.storageSvc.get(StorageKeys.GUEST_CHAT_COUNT);
    const current = val ? parseInt(val, 10) : 0;
    
    if (current >= 5) {
      return false;
    }
    
    this.storageSvc.set(StorageKeys.GUEST_CHAT_COUNT, (current + 1).toString());
    return true;
  }

  public readonly activeStyle = signal<'cyberpunk' | 'aurora'>('aurora');
  public readonly currentEmotion = signal<string>('NEUTRAL');
  public readonly currentPrimaryColor = signal<string>('#a855f7');
  public readonly currentSecondaryColor = signal<string>('#06b6d4');
  public readonly chatInput = signal<string>('');
  public readonly isRecording = signal<boolean>(false);
  public readonly isWaitingForResponse = signal<boolean>(false);

  // Pagination state
  public readonly isLoadingHistory = signal<boolean>(false);
  public readonly isLoadingMore = signal<boolean>(false);
  private currentCursor: string | null = null;
  private readonly pageSize = 20;
  private hasMoreHistory = true;
  private isInitialLoad = true;
  private loadedEmail: string | null = null;


  public readonly messages = signal<Message[]>([]);
  public readonly currentlySpeakingId = signal<string | null>(null);
  public readonly availableVoices = signal<SpeechSynthesisVoice[]>([]);
  public readonly selectedVoiceName = signal<string>('');
  private checkMidnightInterval: any = null;
  private currentDayOfMonth = new Date().getDate();

  public readonly todayMessages = computed(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return this.messages().filter(m => m.isCurrentSession || new Date(m.timestamp).getTime() >= midnight.getTime());
  });

  @ViewChild('streamScroll', { static: false }) private streamScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput', { static: false }) private textInput?: ElementRef<HTMLInputElement>;

  private recognition: any = null;
  private speechTimeout: any = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.fetchDynamicQuote();

    addIcons({
      micOutline,
      sendOutline,
      journalOutline,
      contrastOutline,
      apertureOutline,
      prismOutline,
      waterOutline,
      infiniteOutline,
      eyeOutline,
      fingerPrint,
      chatbubbleEllipsesOutline,
      refreshOutline,
      colorPaletteOutline,
      flashOutline,
      globeOutline,
      moonOutline,
      happyOutline,
      codeSlashOutline,
      pulseOutline,
      stopCircleOutline,
      volumeHighOutline,
      volumeMuteOutline
    });

    this.initSpeechRecognition();
    this.setupMidnightChecker();
    this.preCacheVoices();
  }

  private preCacheVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        // Query English system voices
        const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        this.availableVoices.set(voices);

        // Pre-select a comforting female voice by default if available
        if (!this.selectedVoiceName() && voices.length > 0) {
          const defaultFav = voices.find(v => 
            v.name.toLowerCase().includes('samantha') || 
            v.name.toLowerCase().includes('zira') || 
            v.name.toLowerCase().includes('hazel') ||
            v.name.toLowerCase().includes('female')
          ) || voices[0];
          if (defaultFav) {
            this.selectedVoiceName.set(defaultFav.name);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }
  }

  public setVoice(voiceName: string) {
    this.selectedVoiceName.set(voiceName);
  }

  private setupMidnightChecker() {
    this.checkMidnightInterval = setInterval(() => {
      const day = new Date().getDate();
      if (day !== this.currentDayOfMonth) {
        this.currentDayOfMonth = day;
        // Trigger reactive update
        this.messages.update(prev => [...prev]);
      }
      // Check every minute
    }, 60000);
  }

  public ngOnDestroy() {
    this.clearSpeechTimeout();
    
    // Clear all active word-by-word streaming timers to prevent memory leaks on navigation
    this.activeTypingIntervals.forEach(clearInterval);
    this.activeTypingIntervals = [];

    if (this.checkMidnightInterval) {
      clearInterval(this.checkMidnightInterval);
    }
    
    // Stop any active speech synthesis on destroy
    window.speechSynthesis.cancel();

    if (this.isNative) {
      this.stopNativeRecording();
    } else if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition on destroy:', e);
      }
    }
  }

  private clearSpeechTimeout() {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
  }

  private initSpeechRecognition() {
    if (this.isNative) {
      SpeechRecognition.available().then(result => {
        console.log('Native speech recognition availability:', result.available);
      }).catch(err => {
        console.error('Error checking native speech availability:', err);
      });
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording.set(true);
        this.clearSpeechTimeout();
        this.speechTimeout = setTimeout(() => {
          if (this.isRecording()) {
            try {
              this.recognition.stop();
            } catch (e) {
              console.error('Speech recognition stop error in safety timeout:', e);
            }
          }
        }, 4000);
      };

      this.recognition.onspeechstart = () => {
        this.clearSpeechTimeout();
      };

      this.recognition.onspeechend = () => {
        this.clearSpeechTimeout();
        this.speechTimeout = setTimeout(() => {
          if (this.isRecording()) {
            try {
              this.recognition.stop();
            } catch (e) {
              console.error('Speech recognition stop error in speechend timeout:', e);
            }
          }
        }, 2000);
      };

      this.recognition.onresult = (event: any) => {
        this.clearSpeechTimeout();
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this.chatInput.update((curr: string) => curr ? `${curr} ${transcript}` : transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.clearSpeechTimeout();
        console.error('Speech recognition error:', event.error);
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.clearSpeechTimeout();
        this.isRecording.set(false);
      };
    }
  }

  private scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (this.streamScroll?.nativeElement) {
      const el = this.streamScroll.nativeElement;
      el.scrollTo({
        top: el.scrollHeight,
        behavior
      });
    }
  }

  public ionViewWillEnter() {
    const currentEmail = this.authSvc.getEmail() || 'guest@mirror.com';
    if (this.isInitialLoad || this.loadedEmail !== currentEmail) {
      this.loadChatHistory();
    }
  }

  public ionViewDidEnter() {
    this.focusInput();
    const currentEmail = this.authSvc.getEmail() || 'guest@mirror.com';
    if (!(this.isInitialLoad || this.loadedEmail !== currentEmail)) {
      // Scroll multiple times to ensure we are at the absolute bottom
      // during and after tab transitions and input focus.
      this.scrollToBottom('auto');
      setTimeout(() => this.scrollToBottom('auto'), 50);
      setTimeout(() => this.scrollToBottom('auto'), 150);
      setTimeout(() => this.scrollToBottom('auto'), 300);
    }
    this.setupScrollListener();
  }

  private focusInput() {
    // Skip auto-focusing on mobile/native platforms to prevent annoying virtual keyboard popups
    if (this.isNative || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return;
    }
    setTimeout(() => {
      if (this.textInput?.nativeElement) {
        const input = this.textInput.nativeElement;
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
        // Scroll to bottom immediately after focusing to correct any focus-induced layout/keyboard shift
        setTimeout(() => this.scrollToBottom('auto'), 50);
      }
    }, 150);
  }

  public moveCursorToEnd(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      // Small timeout ensures the browser has finished its default focus/click positioning
      setTimeout(() => {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }, 0);
    }
  }

  public async toggleRecording() {
    if (this.isSpeechToggleInFlight) {
      return;
    }
    this.isSpeechToggleInFlight = true;
    try {
      if (this.isNative) {
        await this.toggleNativeRecording();
      } else {
        this.toggleBrowserRecording();
      }
    } finally {
      this.isSpeechToggleInFlight = false;
    }
  }

  private async toggleNativeRecording() {
    try {
      const isListening = await SpeechRecognition.isListening();
      if (isListening.listening || this.isRecording()) {
        await this.stopNativeRecording();
        return;
      }

      // Check / request permissions
      let permStatus = await SpeechRecognition.checkPermissions();
      if (permStatus.speechRecognition !== 'granted') {
        permStatus = await SpeechRecognition.requestPermissions();
      }

      if (permStatus.speechRecognition !== 'granted') {
        const alert = await this.alertCtrl.create({
          header: 'Permission Denied',
          message: 'Microphone and speech recognition permissions are required to capture voice input.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // Check availability
      const avail = await SpeechRecognition.available();
      if (!avail.available) {
        const alert = await this.alertCtrl.create({
          header: 'Speech Recognition Unavailable',
          message: 'Speech recognition is not supported on this device.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // Start recording
      this.initialInputText = this.chatInput();
      this.isRecording.set(true);

      // Clean up previous listener if any to prevent duplicates
      if (this.nativeListenerHandle) {
        await this.nativeListenerHandle.remove();
        this.nativeListenerHandle = null;
      }
      if (this.nativeStateListenerHandle) {
        await this.nativeStateListenerHandle.remove();
        this.nativeStateListenerHandle = null;
      }

      this.nativeListenerHandle = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches && data.matches.length > 0) {
          const match = data.matches[0];
          if (match) {
            this.chatInput.set(this.initialInputText ? `${this.initialInputText} ${match}` : match);
          }
        }
      });

      this.nativeStateListenerHandle = await SpeechRecognition.addListener('listeningState', async (data: { status: 'started' | 'stopped' }) => {
        if (data.status === 'stopped') {
          await this.stopNativeRecording();
        }
      });

      await SpeechRecognition.start({
        language: 'en-US',
        partialResults: true,
        popup: false
      });

      // Safety timeout: 10 seconds max duration
      this.clearSpeechTimeout();
      this.speechTimeout = setTimeout(async () => {
        if (this.isRecording()) {
          await this.stopNativeRecording();
        }
      }, 10000);

    } catch (error) {
      console.error('Error in native speech recognition:', error);
      this.isRecording.set(false);
      this.clearSpeechTimeout();
    }
  }

  private async stopNativeRecording() {
    this.clearSpeechTimeout();
    this.isRecording.set(false);
    try {
      await SpeechRecognition.stop();
    } catch (e) {
      console.error('Error calling SpeechRecognition.stop():', e);
    }
    if (this.nativeListenerHandle) {
      await this.nativeListenerHandle.remove();
      this.nativeListenerHandle = null;
    }
    if (this.nativeStateListenerHandle) {
      await this.nativeStateListenerHandle.remove();
      this.nativeStateListenerHandle = null;
    }
  }

  private toggleBrowserRecording() {
    if (!this.recognition) {
      if (this.isRecording()) {
        this.isRecording.set(false);
      } else {
        this.isRecording.set(true);
        setTimeout(() => {
          if (this.isRecording()) {
            this.chatInput.update(curr => curr ? `${curr} [Simulated premium voice input stream]` : 'Synthesized audio stream captured successfully.');
            this.isRecording.set(false);
          }
        }, 3500);
      }
      return;
    }

    if (this.isRecording()) {
      this.clearSpeechTimeout();
      this.isRecording.set(false);
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping speech recognition:', e);
      }
    } else {
      try {
        this.isRecording.set(true);
        this.recognition.start();
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        this.isRecording.set(false);
      }
    }
  }

  public selectStyle(style: 'cyberpunk' | 'aurora') {
    this.activeStyle.set(style);
  }

  public useChip(chipText: string) {
    if (this.isWaitingForResponse()) {
      return;
    }
    if (!this.checkGuestLimit()) {
      this.showSignupPopup();
      return;
    }
    this.sendMessage(chipText);
  }

  public handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const input = this.chatInput().trim();
      if (input && !this.isWaitingForResponse()) {
        if (!this.checkGuestLimit()) {
          this.showSignupPopup();
          return;
        }
        this.sendMessage(input);
      }
    }
  }

  public triggerSend() {
    const input = this.chatInput().trim();
    if (input && !this.isWaitingForResponse()) {
      if (!this.checkGuestLimit()) {
        this.showSignupPopup();
        return;
      }
      this.sendMessage(input);
    }
  }

  public speakText(msgId: string, text: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    // If currently speaking this specific message, cancel it
    if (this.currentlySpeakingId() === msgId) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
      return;
    }

    // Cancel any other running speaking session
    window.speechSynthesis.cancel();

    // Create speaking request
    const utterance = new SpeechSynthesisUtterance(text);

    // Dynamic voice selection: Query system voices and find a premium, warm, or natural voice
    const voices = window.speechSynthesis.getVoices();
    console.log('[MIRROR TTS] Available voices on this device:', voices.map(v => `${v.name} (${v.lang})`));
    
    // Direct priority lock: Seek Google UK English Female first, with robust comforting soft female fallbacks
    const selectedVoice = voices.find(v => v.name.toLowerCase().includes('google uk english female')) ||
                          voices.find(v => v.name.toLowerCase().includes('google uk english')) ||
                          voices.find(v => v.name.toLowerCase().includes('samantha')) ||
                          voices.find(v => v.name.toLowerCase().includes('zira')) ||
                          voices.find(v => v.name.toLowerCase().includes('hazel')) ||
                          voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.startsWith('en')) || 
                          voices[0];

    if (selectedVoice) {
      console.log('[MIRROR TTS] Speaking using selected female voice:', selectedVoice.name);
      utterance.voice = selectedVoice;
    }

    // Calibrate rate and pitch for an empathetic, calm conversational vibe
    // Slightly relaxed, comfortable pacing
    utterance.rate = 0.95;
    // Warmer, more melodic and friendly frequency pitch
    utterance.pitch = 1.05;
    
    utterance.onend = () => {
      if (this.currentlySpeakingId() === msgId) {
        this.currentlySpeakingId.set(null);
      }
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      if (this.currentlySpeakingId() === msgId) {
        this.currentlySpeakingId.set(null);
      }
    };

    this.currentlySpeakingId.set(msgId);
    
    // A 100ms timeout prevents Android System WebView TTS engine from stalling
    // which happens when cancel() is followed immediately by speak()
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  }

  private async showSignupPopup() {
    const alert = await this.alertCtrl.create({
      header: 'Limit Reached',
      message: 'Please sign up to access all the features and unlock unlimited synchronization.',
      cssClass: 'mirror-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-cancel-btn'
        },
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

  /**
   * Track by function for ngFor loop performance optimization.
   */
  public trackByMessageId(index: number, message: Message): string {
    return message.id;
  }

  private sendMessage(text: string) {
    // We already checked checkGuestLimit() before calling sendMessage

    this.isWaitingForResponse.set(true);

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text,
      timestamp: new Date(),
      isCurrentSession: true
    };

    this.messages.update(prev => [...prev, userMsg]);
    this.chatInput.set('');
    
    if (this.textInput?.nativeElement) {
      this.textInput.nativeElement.focus();
    }

    setTimeout(() => this.scrollToBottom('smooth'), 50);

    this.simulateMirrorResponse(text);
  }

  private parseEmotionAndColors(rawEmotion: string | undefined): { emotion: string, primary: string, secondary: string } {
    if (!rawEmotion) {
      return { emotion: 'NEUTRAL', primary: '#a855f7', secondary: '#06b6d4' };
    }
    const parts = rawEmotion.split('|');
    const emotionText = parts[0] || 'NEUTRAL';
    let primary = parts[1] || '';
    let secondary = parts[2] || '';

    // If no colors are stored, map standard emotions to beautiful fallback hex codes
    if (!primary || !secondary) {
      const colors = getEmotionColors(emotionText);
      primary = colors.primary;
      secondary = colors.secondary;
    }
    return { emotion: emotionText, primary, secondary };
  }

  private loadChatHistory() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.loadedEmail = email;
    this.isLoadingHistory.set(true);
    this.currentCursor = null;
    this.hasMoreHistory = true;
    this.isInitialLoad = true;
    
    // Reset state for the new/loading user
    this.messages.set([]);
    this.currentEmotion.set('NEUTRAL');
    this.currentPrimaryColor.set('#a855f7');
    this.currentSecondaryColor.set('#06b6d4');

    this.chatSvc.getHistory(email, null, this.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data && data.messages && data.messages.length > 0) {
          // Backend returns newest first, reverse for chronological display
          const loadedMessages: Message[] = data.messages.reverse().map((m: any) => {
            const { emotion, primary, secondary } = this.parseEmotionAndColors(m.emotion);
            return {
              id: m.id.toString(),
              sender: m.sender || 'user',
              text: m.content,
              timestamp: new Date(m.createdAt || new Date()),
              emotion,
              primaryColor: primary,
              secondaryColor: secondary
            };
          });
          this.messages.update(prev => [...loadedMessages, ...prev]);

          // Set current active emotion and colors from the last mirrored message
          const lastMirror = [...loadedMessages].reverse().find(m => m.sender === 'mirror');
          if (lastMirror && lastMirror.primaryColor && lastMirror.secondaryColor) {
            this.currentPrimaryColor.set(lastMirror.primaryColor);
            this.currentSecondaryColor.set(lastMirror.secondaryColor);
            this.currentEmotion.set(lastMirror.emotion || 'NEUTRAL');
          }

          this.hasMoreHistory = data.hasMore;
          this.currentCursor = data.nextCursor;
        }
        this.isLoadingHistory.set(false);
        this.isInitialLoad = false;
        setTimeout(() => this.scrollToBottom('auto'), 50);
      },
      error: async (err) => {
        console.error('Failed to load chat history from backend:', err);
        this.isLoadingHistory.set(false);
        this.isInitialLoad = false;
        setTimeout(() => this.scrollToBottom('auto'), 50);
        
        await this.toastSvc.showError('Failed to load chat history.');
      }
    });
  }

  private loadMoreHistory() {
    if (this.isLoadingMore() || !this.hasMoreHistory) {
      return;
    }

    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.isLoadingMore.set(true);

    this.chatSvc.getHistory(email, this.currentCursor, this.pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data && data.messages && data.messages.length > 0) {
          // Preserve scroll position: capture current scroll height before prepending
          const scrollEl = this.streamScroll?.nativeElement;
          const prevScrollHeight = scrollEl ? scrollEl.scrollHeight : 0;

          // Backend returns newest first, reverse for chronological order then prepend
          const olderMessages: Message[] = data.messages.reverse().map((m: any) => {
            const { emotion, primary, secondary } = this.parseEmotionAndColors(m.emotion);
            return {
              id: m.id.toString(),
              sender: m.sender || 'user',
              text: m.content,
              timestamp: new Date(m.createdAt || new Date()),
              emotion,
              primaryColor: primary,
              secondaryColor: secondary
            };
          });

          this.messages.update(prev => [...olderMessages, ...prev]);
          this.hasMoreHistory = data.hasMore;
          this.currentCursor = data.nextCursor;

          // Restore scroll position so the user doesn't jump to the top
          setTimeout(() => {
            if (scrollEl) {
              const newScrollHeight = scrollEl.scrollHeight;
              scrollEl.scrollTop = newScrollHeight - prevScrollHeight;
            }
          }, 50);
        } else {
          this.hasMoreHistory = false;
        }
        this.isLoadingMore.set(false);
      },
      error: async (err) => {
        console.error('Failed to load more history:', err);
        this.isLoadingMore.set(false);
        await this.toastSvc.showError('Failed to load older messages.');
      }
    });
  }

  private scrollListenerAttached = false;

  private setupScrollListener() {
    if (this.scrollListenerAttached) return;
    setTimeout(() => {
      const scrollEl = this.streamScroll?.nativeElement;
      if (scrollEl) {
        this.scrollListenerAttached = true;
        scrollEl.addEventListener('scroll', () => {
          // Trigger load more when scrolled near the top (within 60px)
          if (scrollEl.scrollTop <= 60 && this.hasMoreHistory && !this.isLoadingMore() && !this.isInitialLoad) {
            this.loadMoreHistory();
          }
        });
      }
    }, 300);
  }

  private simulateMirrorResponse(prompt: string) {
    const typingId = 'typing-' + Math.random().toString(36).substring(7);
    const typingMsg: Message = {
      id: typingId,
      sender: 'mirror',
      text: '',
      timestamp: new Date(),
      isTyping: true,
      isCurrentSession: true
    };

    this.messages.update(prev => [...prev, typingMsg]);
    setTimeout(() => this.scrollToBottom('smooth'), 50);

    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.chatSvc.reflect(email, prompt).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.messages.update(prev => prev.filter(m => m.id !== typingId));

        const reflectionText = res.reflection || "Thank you for sharing your thoughts.";
        const { emotion, primary, secondary } = this.parseEmotionAndColors(res.emotion);
        
        this.currentEmotion.set(emotion);
        this.currentPrimaryColor.set(primary);
        this.currentSecondaryColor.set(secondary);

        const replyId = Math.random().toString(36).substring(7);
        const mirrorReply: Message = {
          id: replyId,
          sender: 'mirror',
          text: '',
          timestamp: new Date(),
          emotion,
          primaryColor: primary,
          secondaryColor: secondary,
          isCurrentSession: true
        };

        this.messages.update(prev => [...prev, mirrorReply]);

        // Type out the reflection text character-by-character for a smooth, premium real-time typing feel
        let currentCharIdx = 0;
        const streamInterval = setInterval(() => {
          if (currentCharIdx < reflectionText.length) {
            // Type 3 characters at a time for a fast, organic, and ultra-smooth flow
            currentCharIdx += 3;
            if (currentCharIdx > reflectionText.length) {
              currentCharIdx = reflectionText.length;
            }
            const streamedText = reflectionText.slice(0, currentCharIdx);
            this.messages.update(prev => prev.map(m => m.id === replyId ? { ...m, text: streamedText } : m));
            this.scrollToBottom('smooth');
          } else {
            clearInterval(streamInterval);
            this.activeTypingIntervals = this.activeTypingIntervals.filter(i => i !== streamInterval);
            this.isWaitingForResponse.set(false);
            this.focusInput();
          }
        }, 15);
        this.activeTypingIntervals.push(streamInterval);
      },
      error: async (err) => {
        console.error('Failed to generate backend reflection:', err);
        this.messages.update(prev => prev.filter(m => m.id !== typingId));
        
        let errorMsg = '⚠️ [CONNECTION ERROR] Failed to connect to the MIRROR reflection service. Please ensure the backend is running and try again.';
        
        const detailedMsg = err.error?.message || err.error || err.message || '';
        const isConfigError = typeof detailedMsg === 'string' && 
          (detailedMsg.toLowerCase().includes('key is not configured') || detailedMsg.toLowerCase().includes('apikey'));
        
        if (isConfigError) {
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

        this.messages.update(prev => [...prev, mirrorReply]);
        this.isWaitingForResponse.set(false);
        setTimeout(() => this.scrollToBottom('smooth'), 50);
        this.focusInput();
        
        await this.toastSvc.showError('Connection issue while communicating with MIRROR.');
      }
    });
  }
}
