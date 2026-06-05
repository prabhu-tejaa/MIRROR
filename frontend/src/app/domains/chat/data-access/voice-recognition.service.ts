import { Injectable, inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {
  private alertCtrl = inject(AlertController);
  private isNative = Capacitor.isNativePlatform();

  public isRecording = signal<boolean>(false);
  
  public transcriptionUpdate = new Subject<{text: string, isPartial: boolean}>();

  private nativeListenerHandle: import('@capacitor/core').PluginListenerHandle | null = null;
  private nativeStateListenerHandle: import('@capacitor/core').PluginListenerHandle | null = null;
  private speechTimeout: ReturnType<typeof setTimeout> | null = null;
  private recognition: {
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
  } | null = null;

  constructor() {
    this.initSpeechRecognition();
  }

  private clearSpeechTimeout() {
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
  }

  private initSpeechRecognition() {
    if (this.isNative) {
      SpeechRecognition.available().then(() => {
        
      }).catch(() => {
        
      });return;
    }

    const globalWindow = window as unknown as { SpeechRecognition: new () => NonNullable<typeof this.recognition>; webkitSpeechRecognition: new () => NonNullable<typeof this.recognition> };
    const SpeechRecognitionCtor = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
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
              this.recognition!.stop();
            } catch {

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
              this.recognition!.stop();
            } catch {

            }
          }
        }, 2000);
      };

      this.recognition.onresult = (event: { results: { transcript: string }[][] }) => {
        this.clearSpeechTimeout();
        const transcript = event.results[0][0].transcript;
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
  }

  public async toggleRecording() {
    if (this.isNative) {
      await this.toggleNativeRecording();
    } else {
      this.toggleBrowserRecording();
    }
  }

  private async toggleNativeRecording() {
    try {
      const isListening = await SpeechRecognition.isListening();
      if (isListening.listening || this.isRecording()) {
        await this.stopRecording();
        return;
      }

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

      this.isRecording.set(true);
      
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
            this.transcriptionUpdate.next({ text: match, isPartial: true });
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

      this.clearSpeechTimeout();
      this.speechTimeout = setTimeout(async () => {
        if (this.isRecording()) {
          await this.stopNativeRecording();
        }
      }, 10000);

    } catch {
      this.isRecording.set(false);
      this.clearSpeechTimeout();
    }
  }

  private async stopNativeRecording() {
    this.clearSpeechTimeout();
    this.isRecording.set(false);
    try {
      await SpeechRecognition.stop();
    } catch {

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
            this.transcriptionUpdate.next({ text: '[Simulated premium voice input stream]', isPartial: false });
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
      } catch {

      }
    } else {
      try {
        this.isRecording.set(true);
        this.recognition.start();
      } catch {
        this.isRecording.set(false);
      }
    }
  }

  public async stopRecording() {
    if (this.isNative) {
      await this.stopNativeRecording();
    } else if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {

      }
    }
  }

  public destroy() {
    this.clearSpeechTimeout();
    this.stopRecording();
  }
}
