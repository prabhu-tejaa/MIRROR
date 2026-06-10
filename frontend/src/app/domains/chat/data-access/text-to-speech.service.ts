import { Injectable, inject, signal } from '@angular/core';

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
    if (this.currentlySpeakingId() === msgId) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
      this.audioVisualizer.restoreVolume();
      return;
    }

    window.speechSynthesis.cancel();

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

    utterance.onend = () => {
      if (this.currentlySpeakingId() === msgId) {
        this.currentlySpeakingId.set(null);
      }
      this.audioVisualizer.restoreVolume();
    };
    utterance.onerror = () => {

      if (this.currentlySpeakingId() === msgId) {
        this.currentlySpeakingId.set(null);
      }
      this.audioVisualizer.restoreVolume();
    };

    this.currentlySpeakingId.set(msgId);

    this.audioVisualizer.duckVolume(0.18);

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  }

  public cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
      this.audioVisualizer.restoreVolume();
    }
  }
}
