import { Component, ChangeDetectionStrategy, signal, computed, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, NavController, AlertController
} from '@ionic/angular/standalone';
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
  stopCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';

interface Message {
  id: string;
  sender: 'user' | 'mirror';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatPage {
  private authSvc = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private navCtrl = inject(NavController);

  public readonly isGuest = computed(() => this.authSvc.getEmail() === 'guest@mirror.com');

  private get guestChatCount(): number {
    const val = localStorage.getItem('mirror_guest_chat_count');
    return val ? parseInt(val, 10) : 0;
  }

  private incrementGuestChatCount(): void {
    const current = this.guestChatCount;
    localStorage.setItem('mirror_guest_chat_count', (current + 1).toString());
  }

  public readonly activeStyle = signal<'cyberpunk' | 'aurora'>('aurora');
  public readonly chatInput = signal<string>('');
  public readonly isRecording = signal<boolean>(false);
  public readonly isWaitingForResponse = signal<boolean>(false);


  public readonly messages = signal<Message[]>([
    {
      id: 'welcome',
      sender: 'mirror',
      text: 'I am your reflection companion, designed to help you capture your daily wins, track your emotional patterns and preserve key life lessons before they fade. How are you feeling today? Share a moment, a win or a pain, and let\'s begin reflecting.',
      timestamp: new Date()
    }
  ]);

  @ViewChild('streamScroll', { static: false }) private streamScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('textInput', { static: false }) private textInput?: ElementRef<HTMLInputElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private speechTimeout: any = null;

  public readonly suggestionChips = [
    { label: 'Tell a Joke', icon: 'happy-outline', text: 'Tell me a funny, geeky programming joke!' },
    { label: 'Draft Email', icon: 'code-slash-outline', text: 'Draft a quick, high-end professional email for a project sync.' },
    { label: 'System Health', icon: 'pulse-outline', text: 'What is the status of our system and services?' },
    { label: 'Philosophy', icon: 'globe-outline', text: 'Explain the philosophy of the MIRROR concept.' }
  ];

  constructor() {
    effect(() => {
      // Trigger effect when messages signal changes
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

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
      stopCircleOutline
    });

    this.initSpeechRecognition();
  }

  private clearSpeechTimeout() {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
  }

  private initSpeechRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording.set(true);
        // Initial safety timeout: stop if they don't say anything for 4 seconds
        this.clearSpeechTimeout();
        this.speechTimeout = setTimeout(() => {
          if (this.isRecording()) {
            try {
              this.recognition.stop();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Speech recognition stop error in safety timeout:', e);
            }
          }
        }, 4000);
      };

      this.recognition.onspeechstart = () => {
        // User started speaking! Clear the safety timeout so they aren't cut off
        this.clearSpeechTimeout();
      };

      this.recognition.onspeechend = () => {
        // User stopped speaking! Start a short 2-second fallback timeout to cleanup if the engine hangs
        this.clearSpeechTimeout();
        this.speechTimeout = setTimeout(() => {
          if (this.isRecording()) {
            try {
              this.recognition.stop();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Speech recognition stop error in speechend timeout:', e);
            }
          }
        }, 2000);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        this.clearSpeechTimeout();
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this.chatInput.update((curr: string) => curr ? `${curr} ${transcript}` : transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onerror = (event: any) => {
        this.clearSpeechTimeout();
        // eslint-disable-next-line no-console
        console.error('Speech recognition error:', event.error);
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.clearSpeechTimeout();
        this.isRecording.set(false);
      };
    }
  }

  private scrollToBottom() {
    if (this.streamScroll?.nativeElement) {
      const el = this.streamScroll.nativeElement;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  public ionViewDidEnter() {
    this.focusInput();
  }

  private focusInput() {
    setTimeout(() => {
      if (this.textInput?.nativeElement) {
        this.textInput.nativeElement.focus();
      }
    }, 150);
  }

  public toggleRecording() {
    if (!this.recognition) {
      // Graceful fallback for browsers without speech recognition support
      if (this.isRecording()) {
        this.isRecording.set(false);
      } else {
        this.isRecording.set(true);
        // Simulate a voice transcription after 3.5 seconds
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
        // eslint-disable-next-line no-console
        console.error('Error stopping speech recognition:', e);
      }
    } else {
      try {
        this.isRecording.set(true);
        this.recognition.start();
      } catch (e) {
        // eslint-disable-next-line no-console
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
    if (this.isGuest() && this.guestChatCount >= 2) {
      this.showSignupPopup();
      return;
    }
    this.sendMessage(chipText);
  }

  public handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const input = this.chatInput().trim();
      if (input && !this.isWaitingForResponse()) {
        if (this.isGuest() && this.guestChatCount >= 2) {
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
      if (this.isGuest() && this.guestChatCount >= 2) {
        this.showSignupPopup();
        return;
      }
      this.sendMessage(input);
    }
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

  private sendMessage(text: string) {
    if (this.isGuest()) {
      this.incrementGuestChatCount();
    }

    this.isWaitingForResponse.set(true);

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update(prev => [...prev, userMsg]);
    this.chatInput.set('');
    
    if (this.textInput?.nativeElement) {
      this.textInput.nativeElement.blur();
    }

    // Trigger AI response simulation
    this.simulateMirrorResponse(text);
  }

  private simulateMirrorResponse(prompt: string) {
    const typingId = 'typing-' + Math.random().toString(36).substring(7);
    const typingMsg: Message = {
      id: typingId,
      sender: 'mirror',
      text: '',
      timestamp: new Date(),
      isTyping: true
    };

    // Add typing indicator
    this.messages.update(prev => [...prev, typingMsg]);

    // Delay for realism (typing simulation)
    setTimeout(() => {
      // Remove typing indicator and add final response
      this.messages.update(prev => prev.filter(m => m.id !== typingId));

      const replyText = this.generateAIResponse(prompt);
      const mirrorReply: Message = {
        id: Math.random().toString(36).substring(7),
        sender: 'mirror',
        text: replyText,
        timestamp: new Date()
      };

      this.messages.update(prev => [...prev, mirrorReply]);
      this.isWaitingForResponse.set(false);
    }, 1500 + Math.random() * 1000);
  }

  private generateAIResponse(prompt: string): string {
    const query = prompt.toLowerCase();

    if (query.includes('joke')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🪲",
        "There are 10 kinds of people in this world: Those who understand binary, and those who don't.",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem!",
        "['hip', 'hip'] (hip hip array!) 🏎️"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    if (query.includes('email') || query.includes('draft')) {
      return `Subject: Sync & Review: MIRROR Frontend & Microservices Integration

Dear Team,

I hope you are doing well. 

I wanted to send a quick update on our MIRROR synchronization module. The frontend layouts and safe area paddings are now fully synced across web, android live-reload, and production packaging.

We have successfully refined our telemetry dashboard and active memory gateway routing. Our next focus will be verifying performance telemetry statistics in the real-time console. Let's touch base tomorrow morning at 10:00 AM.

Best regards,
MIRROR Core`;
    }

    if (query.includes('status') || query.includes('health') || query.includes('system')) {
      return `🌐 [SYSTEM DIAGNOSTICS - LIVE]
- Auth Microservice: ONLINE (Port 8081, Latency: 12ms)
- Memory Postgres Node: ONLINE (Port 8082, Latency: 22ms)
- Gateway Proxy Routing: ACTIVE (Active routes: 2)
- Telemetry Broker: SUCCESS (48.5K telemetry events processed today)
- System Health Score: 100% Correct and Synchronized!`;
    }

    if (query.includes('philosophy') || query.includes('mirror')) {
      return "The philosophy of MIRROR centers on pure digital convergence. It operates on the premise that your coding workflows, interface design, and backing microservices should exist as a single, beautifully synchronized entity. Like a physical mirror reflects your form, MIRROR projects a harmonious reflection of elegant software engineering and high-end aesthetic fidelity.";
    }

    return "Thank you! This feature is currently under development.";
  }
}
