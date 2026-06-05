import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { AlertController } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  stop: () => void;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private alertCtrl: AlertController = inject(AlertController);
  private isNative: boolean = Capacitor.isNativePlatform();

  public isRecording: ReturnType<typeof signal<boolean>> = signal<boolean>(false);

  public transcriptionUpdate: Subject<{ text: string; isPartial: boolean; }> = new Subject<{ text: string; isPartial: boolean }>();

  private nativeListenerHandle: import('@capacitor/core').PluginListenerHandle | null = null;
  private nativeStateListenerHandle: import('@capacitor/core').PluginListenerHandle | null = null;
  private speechTimeout: ReturnType<typeof setTimeout> | null = null;
  private recognition: SpeechRecognitionInstance | null = null;

  constructor() {
    this.initSpeechRecognition();
  }

  private clearSpeechTimeout(): void {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
  }

  private getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
    const globalWindow: Record<string, unknown> = window as unknown as Record<string, unknown>;
    const ctor: unknown = globalWindow['SpeechRecognition'] ?? globalWindow['webkitSpeechRecognition'];
    return ctor ? (ctor as SpeechRecognitionConstructor) : null;
  }

  private bindRecognitionHandlers(): void {
    if (!this.recognition) {
      return;
    }
    this.recognition.onstart = () => {
      this.isRecording.set(true);
      this.clearSpeechTimeout();
      this.speechTimeout = setTimeout(() => {
        if (this.isRecording() && this.recognition) {
          this.recognition.stop();
        }
      }, 4000);
    };
    this.recognition.onspeechstart = () => { this.clearSpeechTimeout(); };
    this.recognition.onspeechend = () => {
      this.clearSpeechTimeout();
      this.speechTimeout = setTimeout(() => {
        if (this.isRecording() && this.recognition) {
          this.recognition.stop();
        }
      }, 2000);
    };
    this.recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      this.clearSpeechTimeout();
      const transcript: string = event.results[0][0].transcript;
      if (transcript) {
        this.transcriptionUpdate.next({ text: transcript, isPartial: false });
      }
    };
    this.recognition.onerror = () => {
      this.clearSpeechTimeout();
      this.isRecording.set(false);
    };
    this.recognition.onend = () => {
      this.clearSpeechTimeout();
      this.isRecording.set(false);
    };
  }

  private initSpeechRecognition(): void {
    if (this.isNative) {
      return;
    }
    const ctor: SpeechRecognitionConstructor | null = this.getSpeechRecognitionCtor();
    if (!ctor) {
      return;
    }
    this.recognition = new ctor();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.bindRecognitionHandlers();
  }

  public async toggleRecording(): Promise<void> {
    if (this.isNative) {
      await this.toggleNativeRecording();
    } else {
      this.toggleBrowserRecording();
    }
  }

  private async checkNativePermissions(): Promise<boolean> {
    let permStatus: { speechRecognition: string } = await SpeechRecognition.checkPermissions();
    if (permStatus.speechRecognition !== 'granted') {
      permStatus = await SpeechRecognition.requestPermissions();
    }
    if (permStatus.speechRecognition !== 'granted') {
      const alert: HTMLIonAlertElement = await this.alertCtrl.create({
        header: 'Permission Denied',
        message: 'Microphone and speech recognition permissions are required to capture voice input.',
        buttons: ['OK']
      });
      await alert.present();
      return false;
    }
    return true;
  }

  private async checkNativeAvailability(): Promise<boolean> {
    const avail: { available: boolean; } = await SpeechRecognition.available();
    if (!avail.available) {
      const alert: HTMLIonAlertElement = await this.alertCtrl.create({
        header: 'Speech Recognition Unavailable',
        message: 'Speech recognition is not supported on this device.',
        buttons: ['OK']
      });
      await alert.present();
      return false;
    }
    return true;
  }

  private async setupNativeListeners(): Promise<void> {
    if (this.nativeListenerHandle) {
      await this.nativeListenerHandle.remove();
      this.nativeListenerHandle = null;
    }
    if (this.nativeStateListenerHandle) {
      await this.nativeStateListenerHandle.remove();
      this.nativeStateListenerHandle = null;
    }
    this.nativeListenerHandle = await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
      if (data.matches && data.matches.length > 0 && data.matches[0]) {
        this.transcriptionUpdate.next({ text: data.matches[0], isPartial: true });
      }
    });
    this.nativeStateListenerHandle = await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
      if (data.status === 'stopped') {
        void this.stopNativeRecording();
      }
    });
  }

  private async toggleNativeRecording(): Promise<void> {
    try {
      const isListening: { listening: boolean; } = await SpeechRecognition.isListening();
      if (isListening.listening || this.isRecording()) {
        await this.stopRecording();
        return;
      }
      const hasPermission: boolean = await this.checkNativePermissions();
      if (!hasPermission) {
        return;
      }
      const isAvailable: boolean = await this.checkNativeAvailability();
      if (!isAvailable) {
        return;
      }
      this.isRecording.set(true);
      await this.setupNativeListeners();
      await SpeechRecognition.start({ language: 'en-US', partialResults: true, popup: false });
      this.clearSpeechTimeout();
      this.speechTimeout = setTimeout(() => {
        if (this.isRecording()) {
          void this.stopNativeRecording();
        }
      }, 10000);
    } catch {
      this.isRecording.set(false);
      this.clearSpeechTimeout();
    }
  }

  private async stopNativeRecording(): Promise<void> {
    this.clearSpeechTimeout();
    this.isRecording.set(false);
    try {
      await SpeechRecognition.stop();
    } catch {
      return;
    }
    await this.removeNativeListeners();
  }

  private async removeNativeListeners(): Promise<void> {
    if (this.nativeListenerHandle) {
      await this.nativeListenerHandle.remove();
      this.nativeListenerHandle = null;
    }
    if (this.nativeStateListenerHandle) {
      await this.nativeStateListenerHandle.remove();
      this.nativeStateListenerHandle = null;
    }
  }

  private toggleBrowserRecording(): void {
    if (!this.recognition) {
      this.handleSimulatedRecording();
      return;
    }
    if (this.isRecording()) {
      this.stopBrowserRecording();
    } else {
      this.startBrowserRecording();
    }
  }

  private handleSimulatedRecording(): void {
    if (this.isRecording()) {
      this.isRecording.set(false);
      return;
    }
    this.isRecording.set(true);
    setTimeout(() => {
      if (this.isRecording()) {
        this.transcriptionUpdate.next({ text: '[Simulated premium voice input stream]', isPartial: false });
        this.isRecording.set(false);
      }
    }, 3500);
  }

  private stopBrowserRecording(): void {
    this.clearSpeechTimeout();
    this.isRecording.set(false);
    try {
      this.recognition?.stop();
    } catch {
      return;
    }
  }

  private startBrowserRecording(): void {
    try {
      this.isRecording.set(true);
      this.recognition?.start();
    } catch {
      this.isRecording.set(false);
    }
  }

  public async stopRecording(): Promise<void> {
    if (this.isNative) {
      await this.stopNativeRecording();
    } else {
      this.stopBrowserRecording();
    }
  }

  public destroy(): void {
    this.clearSpeechTimeout();
    void this.stopRecording();
  }
}
