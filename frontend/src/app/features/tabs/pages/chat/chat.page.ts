import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  micOutline,
  sendOutline,
  sparklesOutline,
  chatbubbleEllipsesOutline,
  refreshOutline,
  colorPaletteOutline,
  flashOutline,
  globeOutline,
  moonOutline,
  happyOutline,
  codeSlashOutline,
  pulseOutline
} from 'ionicons/icons';

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
  // Styles can be 'cyberpunk' | 'aurora'
  public readonly activeStyle = signal<'cyberpunk' | 'aurora'>('cyberpunk');
  public readonly chatInput = signal<string>('');
  public readonly isRecording = signal<boolean>(false);
  public readonly messages = signal<Message[]>([
    {
      id: 'welcome',
      sender: 'mirror',
      text: 'Hello there, traveler of the digital realms. I am MIRROR, your synchronized companion. Speak or type your request, and let us build something sublime.',
      timestamp: new Date()
    }
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  public readonly suggestionChips = [
    { label: 'Tell a Joke', icon: 'happy-outline', text: 'Tell me a funny, geeky programming joke!' },
    { label: 'Draft Email', icon: 'code-slash-outline', text: 'Draft a quick, high-end professional email for a project sync.' },
    { label: 'System Health', icon: 'pulse-outline', text: 'What is the status of our system and services?' },
    { label: 'Philosophy', icon: 'globe-outline', text: 'Explain the philosophy of the MIRROR concept.' }
  ];

  constructor() {
    addIcons({
      micOutline,
      sendOutline,
      sparklesOutline,
      chatbubbleEllipsesOutline,
      refreshOutline,
      colorPaletteOutline,
      flashOutline,
      globeOutline,
      moonOutline,
      happyOutline,
      codeSlashOutline,
      pulseOutline
    });

    this.initSpeechRecognition();
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
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this.chatInput.update((curr: string) => curr ? `${curr} ${transcript}` : transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onerror = (event: any) => {
        // eslint-disable-next-line no-console
        console.error('Speech recognition error:', event.error);
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    }
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
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch {
        // Fallback in case of quick start/stop errors
        this.isRecording.set(false);
      }
    }
  }

  public selectStyle(style: 'cyberpunk' | 'aurora') {
    this.activeStyle.set(style);
  }

  public useChip(chipText: string) {
    this.sendMessage(chipText);
  }

  public handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const input = this.chatInput().trim();
      if (input) {
        this.sendMessage(input);
      }
    }
  }

  public triggerSend() {
    const input = this.chatInput().trim();
    if (input) {
      this.sendMessage(input);
    }
  }

  private sendMessage(text: string) {
    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.update(prev => [...prev, userMsg]);
    this.chatInput.set('');

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

    const standardReplies = [
      "Fascinating request. I have parsed your query through the MIRROR semantic core. Let me know how you'd like to integrate this into your workflow.",
      "I hear you loud and clear. That request is well within my synthesis capability. Let's make it look premium!",
      "An excellent proposal. We should write a plan or directly execute it to maintain absolute workflow momentum. What are your thoughts?",
      "MIRROR semantic model initialized. Your voice transcription has been fully mapped to active session context. Ready for the next sync!"
    ];

    return standardReplies[Math.floor(Math.random() * standardReplies.length)];
  }
}
