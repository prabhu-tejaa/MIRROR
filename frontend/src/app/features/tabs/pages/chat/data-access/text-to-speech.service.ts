/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {
  public availableVoices = signal<SpeechSynthesisVoice[]>([]);
  public currentlySpeakingId = signal<string | null>(null);

  constructor() {
    this.preCacheVoices();
  }

  private preCacheVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        this.availableVoices.set(voices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }
  }

  public speakText(msgId: string, text: string) {
    if (this.currentlySpeakingId() === msgId) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    console.log('[MIRROR TTS] Available voices on this device:', voices.map(v => `${v.name} (${v.lang})`));

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

    utterance.rate = 0.95;
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

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  }

  public cancel() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentlySpeakingId.set(null);
    }
  }
}
