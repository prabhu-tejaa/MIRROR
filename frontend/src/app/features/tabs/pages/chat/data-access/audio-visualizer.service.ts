import { Injectable, NgZone, signal, OnDestroy, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioVisualizerService implements OnDestroy {
  public readonly isPlaying = signal<boolean>(false);
  public readonly isLoadingAudio = signal<boolean>(false);
  public readonly isRealtimeSync = signal<boolean>(false);
  
  public readonly scale1 = signal<number>(0);
  public readonly scale2 = signal<number>(0);
  public readonly scale3 = signal<number>(0);
  public readonly scale4 = signal<number>(0);

  private audioObj: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private duckInterval: ReturnType<typeof setInterval> | null = null;
  private isDucked = false;

  private ngZone = inject(NgZone);

  constructor() {}

  private fadeIn() {
    if (!this.audioObj) return;
    
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    
    const targetVolume = 1;
    const fadeSteps = 25;
    const fadeDuration = 800;
    const stepTime = fadeDuration / fadeSteps;
    const volumeStep = targetVolume / fadeSteps;

    this.fadeInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        return;
      }
      let newVolume = this.audioObj.volume + volumeStep;
      if (newVolume >= targetVolume) {
        newVolume = targetVolume;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
      this.audioObj.volume = newVolume;
    }, stepTime);
  }

  private fadeOut(callback: () => void) {
    if (!this.audioObj) {
      callback();
      return;
    }

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const fadeSteps = 25;
    const fadeDuration = 500;
    const stepTime = fadeDuration / fadeSteps;
    const volumeStep = (this.audioObj.volume || 1) / fadeSteps;

    this.fadeInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        callback();
        return;
      }
      let newVolume = this.audioObj.volume - volumeStep;
      if (newVolume <= 0.02) {
        newVolume = 0;
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.audioObj.volume = newVolume;
        callback();
      } else {
        this.audioObj.volume = newVolume;
      }
    }, stepTime);
  }

  public duckVolume(targetVolume = 0.18): void {
    if (!this.audioObj || !this.isPlaying()) return;
    this.isDucked = true;

    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }

    const steps = 20;
    const duration = 400;
    const stepTime = duration / steps;
    const currentVol = this.audioObj.volume;
    const volumeStep = (currentVol - targetVolume) / steps;

    this.duckInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.duckInterval) clearInterval(this.duckInterval);
        return;
      }
      let newVol = this.audioObj.volume - volumeStep;
      if (newVol <= targetVolume) {
        newVol = targetVolume;
        if (this.duckInterval) clearInterval(this.duckInterval);
        this.duckInterval = null;
      }
      this.audioObj.volume = newVol;
    }, stepTime);
  }

  public restoreVolume(): void {
    if (!this.audioObj || !this.isDucked) return;
    this.isDucked = false;

    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }

    const steps = 25;
    const duration = 600;
    const stepTime = duration / steps;
    const targetVolume = 1;
    const currentVol = this.audioObj.volume;
    const volumeStep = (targetVolume - currentVol) / steps;

    this.duckInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.duckInterval) clearInterval(this.duckInterval);
        return;
      }
      let newVol = this.audioObj.volume + volumeStep;
      if (newVol >= targetVolume) {
        newVol = targetVolume;
        if (this.duckInterval) clearInterval(this.duckInterval);
        this.duckInterval = null;
      }
      this.audioObj.volume = newVol;
    }, stepTime);
  }

  public stopAudio(): void {
    if (this.audioObj) {
      this.audioObj.pause();
      this.audioObj.src = '';
    }
    this.isPlaying.set(false);
    this.isLoadingAudio.set(false);
    this.cancelAnalysisLoop();
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }
    this.isDucked = false;
  }

  public togglePlay(audioUrl: string) {
    if (this.isLoadingAudio()) return;

    if (this.isPlaying()) {
      this.isPlaying.set(false);
      this.fadeOut(() => {
        if (this.audioObj) {
          this.audioObj.pause();
        }
      });
    } else {
      if (!this.audioObj) {
        this.audioObj = new Audio();
        this.audioObj.crossOrigin = 'anonymous';
        
        this.audioObj.addEventListener('loadstart', () => this.isLoadingAudio.set(true));
        this.audioObj.addEventListener('waiting', () => this.isLoadingAudio.set(true));
        
        this.audioObj.addEventListener('playing', async () => {
          this.isLoadingAudio.set(false);
          this.isPlaying.set(true);
          await this.setupAudioAnalysis();
          this.fadeIn();
        });
        
        this.audioObj.addEventListener('pause', () => {
          this.isPlaying.set(false);
          this.isLoadingAudio.set(false);
          this.cancelAnalysisLoop();
        });
        
        this.audioObj.addEventListener('error', () => {
          this.isLoadingAudio.set(false);
          this.isPlaying.set(false);
          this.cancelAnalysisLoop();
        });

        this.audioObj.src = audioUrl;
        this.audioObj.loop = true;
      } else {
        this.audioObj.src = audioUrl;
      }
      
      this.isLoadingAudio.set(true);
      if (this.audioObj) {
        this.audioObj.volume = 0;
      }
      this.audioObj.play()
        .catch(() => {
          this.isPlaying.set(false);
          this.isLoadingAudio.set(false);
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
        });
    }
  }

  private async setupAudioAnalysis(): Promise<void> {
    if (!this.audioObj) return;

    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 32;
        this.analyser.smoothingTimeConstant = 0.78;

        this.source = this.audioCtx.createMediaElementSource(this.audioObj);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.isRealtimeSync.set(true);
      this.startAnalysisLoop();
    } catch {
      this.isRealtimeSync.set(false);
    }
  }

  private startAnalysisLoop() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      if (!this.audioObj || this.audioObj.paused || !this.analyser) {
        this.cancelAnalysisLoop();
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      const sum = dataArray.reduce((acc, val) => acc + val, 0);
      const isSilent = sum === 0;

      let s1, s2, s3, s4;

      if (isSilent) {
        const time = Date.now() * 0.005;
        const groove = 0.5 + Math.sin(time * 0.6) * 0.45;
        
        s1 = 0.12 + Math.pow(Math.sin(time * 1.3 + 0.1), 2) * 0.75 * groove;
        s2 = 0.12 + Math.pow(Math.sin(time * 0.9 + 0.5), 2) * 0.85 * groove;
        s3 = 0.12 + Math.pow(Math.sin(time * 1.5 + 1.0), 2) * 0.80 * groove;
        s4 = 0.12 + Math.pow(Math.sin(time * 1.1 + 1.5), 2) * 0.65 * groove;
      } else {
        const v1 = dataArray[3] || 0;
        const v2 = dataArray[5] || 0;
        const v3 = dataArray[7] || 0;
        const v4 = dataArray[9] || 0;

        s1 = Math.min(1.4, 0.12 + Math.pow(v1 / 255, 2) * 1.3);
        s2 = Math.min(1.4, 0.12 + Math.pow(v2 / 255, 2) * 1.3);
        s3 = Math.min(1.4, 0.12 + Math.pow(v3 / 255, 2) * 1.3);
        s4 = Math.min(1.4, 0.12 + Math.pow(v4 / 255, 2) * 1.3);
      }

      this.scale1.set(s1);
      this.scale2.set(s2);
      this.scale3.set(s3);
      this.scale4.set(s4);

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.ngZone.runOutsideAngular(() => {
      this.animationFrameId = requestAnimationFrame(update);
    });
  }

  private cancelAnalysisLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public ngOnDestroy() {
    this.cancelAnalysisLoop();
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }
    if (this.audioObj) {
      this.audioObj.pause();
      this.audioObj = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
