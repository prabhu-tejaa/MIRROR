import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

import { AudioVisualizerService } from './audio-visualizer.service';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {
  public availableVoices: import('@angular/core').WritableSignal<SpeechSynthesisVoice[]> = signal<SpeechSynthesisVoice[]>([]);
  public currentlySpeakingId: import('@angular/core').WritableSignal<string | null> = signal<string | null>(null);

  private audioVisualizer: AudioVisualizerService = inject(AudioVisualizerService);

  constructor() {
    this.preCacheVoices();
  }

  private preCacheVoices(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      let voicesLoaded: boolean = false;

      const loadVoices: () => void = () => {
        if (voicesLoaded) {return;}
        const voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices().filter((v: SpeechSynthesisVoice) => v.lang.startsWith('en'));
        if (voices.length > 0) {
          voicesLoaded = true;
          this.availableVoices.set(voices);
          if (window.speechSynthesis.removeEventListener) {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          } else {
            window.speechSynthesis.onvoiceschanged = null;
          }
        }
      };

      const handleVoicesChanged: () => void = () => {
        loadVoices();
      };

      loadVoices();

      if (!voicesLoaded) {
        if (window.speechSynthesis.addEventListener) {
          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        } else {
          window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        }
      }
    }
  }

  public speakText(msgId: string, text: string): void {
    if (!Capacitor.isNativePlatform() && (typeof window === 'undefined' || !window.speechSynthesis)) {
      return;
    }

    if (this.currentlySpeakingId() === msgId) {
      this.cancel();
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      window.speechSynthesis.cancel();
    }

    this.currentlySpeakingId.set(msgId);
    this.audioVisualizer.duckVolume(0.18);

    if (Capacitor.isNativePlatform()) {
      this.speakNative(msgId, text);
    } else {
      this.speakWeb(msgId, text);
    }
  }

  private speakNative(msgId: string, text: string): void {
    TextToSpeech.speak({ text, rate: 0.95, pitch: 1.05 }).then(() => {
      this.clearSpeakingId(msgId);
    }).catch(() => {
      this.clearSpeakingId(msgId);
    });
  }

  private speakWeb(msgId: string, text: string): void {
    const utterance: SpeechSynthesisUtterance = new SpeechSynthesisUtterance(text);
    const voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

    const selectedVoice: SpeechSynthesisVoice = voices.find((v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('google uk english female')) ||
      voices.find((v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('google uk english')) ||
      voices.find((v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('samantha')) ||
      voices.find((v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('zira')) ||
      voices.find((v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('hazel')) ||
      voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('en')) ||
      voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => { this.clearSpeakingId(msgId); };
    utterance.onerror = () => { this.clearSpeakingId(msgId); };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  }

  private clearSpeakingId(msgId: string): void {
    if (this.currentlySpeakingId() === msgId) {
      this.currentlySpeakingId.set(null);
    }
    this.audioVisualizer.restoreVolume();
  }

  public cancel(): void {
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop().catch(() => {});
      this.currentlySpeakingId.set(null);
      this.audioVisualizer.restoreVolume();
      return;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
      this.audioVisualizer.restoreVolume();
    }
  }
}
