import { Injectable, NgZone, signal, OnDestroy, inject, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioVisualizerService implements OnDestroy {
  public readonly isPlaying: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isLoadingAudio: WritableSignal<boolean> = signal<boolean>(false);
  public readonly isRealtimeSync: WritableSignal<boolean> = signal<boolean>(false);
  
  private spectrumElement: HTMLElement | null = null;
  public registerSpectrumElement(el: HTMLElement): void { this.spectrumElement = el; }

  private audioObj: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private duckInterval: ReturnType<typeof setInterval> | null = null;
  private isDucked: boolean = false;

  private ngZone: NgZone = inject(NgZone);


  private fadeIn(): void {
    if (!this.audioObj) {return;}
    
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    
    const targetVolume: number = 1;
    const fadeSteps: number = 25;
    const fadeDuration: number = 800;
    const stepTime: number = fadeDuration / fadeSteps;
    const volumeStep: number = targetVolume / fadeSteps;

    this.fadeInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.fadeInterval) {clearInterval(this.fadeInterval);}
        return;
      }
      let newVolume: number = this.audioObj.volume + volumeStep;
      if (newVolume >= targetVolume) {
        newVolume = targetVolume;
        if (this.fadeInterval) {clearInterval(this.fadeInterval);}
        this.fadeInterval = null;
      }
      this.audioObj.volume = newVolume;
    }, stepTime);
  }

  private fadeOut(callback: () => void): void {
    if (!this.audioObj) {
      callback();
      return;
    }

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const fadeSteps: number = 25;
    const fadeDuration: number = 500;
    const stepTime: number = fadeDuration / fadeSteps;
    const volumeStep: number = (this.audioObj.volume || 1) / fadeSteps;

    this.fadeInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.fadeInterval) {clearInterval(this.fadeInterval);}
        callback();
        return;
      }
      let newVolume: number = this.audioObj.volume - volumeStep;
      if (newVolume <= 0.02) {
        newVolume = 0;
        if (this.fadeInterval) {clearInterval(this.fadeInterval);}
        this.fadeInterval = null;
        this.audioObj.volume = newVolume;
        callback();
      } else {
        this.audioObj.volume = newVolume;
      }
    }, stepTime);
  }

  public duckVolume(targetVolume: number = 0.18): void {
    if (!this.audioObj || !this.isPlaying()) {return;}
    this.isDucked = true;

    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }

    const steps: number = 20;
    const duration: number = 400;
    const stepTime: number = duration / steps;
    const currentVol: number = this.audioObj.volume;
    const volumeStep: number = (currentVol - targetVolume) / steps;

    this.duckInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.duckInterval) {clearInterval(this.duckInterval);}
        return;
      }
      let newVol: number = this.audioObj.volume - volumeStep;
      if (newVol <= targetVolume) {
        newVol = targetVolume;
        if (this.duckInterval) {clearInterval(this.duckInterval);}
        this.duckInterval = null;
      }
      this.audioObj.volume = newVol;
    }, stepTime);
  }

  public restoreVolume(): void {
    if (!this.audioObj || !this.isDucked) {return;}
    this.isDucked = false;

    if (this.duckInterval) {
      clearInterval(this.duckInterval);
      this.duckInterval = null;
    }

    const steps: number = 25;
    const duration: number = 600;
    const stepTime: number = duration / steps;
    const targetVolume: number = 1;
    const currentVol: number = this.audioObj.volume;
    const volumeStep: number = (targetVolume - currentVol) / steps;

    this.duckInterval = setInterval(() => {
      if (!this.audioObj) {
        if (this.duckInterval) {clearInterval(this.duckInterval);}
        return;
      }
      let newVol: number = this.audioObj.volume + volumeStep;
      if (newVol >= targetVolume) {
        newVol = targetVolume;
        if (this.duckInterval) {clearInterval(this.duckInterval);}
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

  public togglePlay(audioUrl: string): void {
    if (this.isLoadingAudio()) {return;}

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
        
        this.audioObj.addEventListener('playing', () => {
          this.isLoadingAudio.set(false);
          this.isPlaying.set(true);
          void this.setupAudioAnalysis().then(() => {
            this.fadeIn();
          });
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
      void this.audioObj.play()
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
    if (!this.audioObj) {return;}

    try {
      const AudioContextClass: { new (contextOptions?: AudioContextOptions): AudioContext; prototype: AudioContext; } = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {return;}

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

  private startAnalysisLoop(): void {
    if (!this.analyser) {return;}
    this.cancelAnalysisLoop();

    const bufferLength: number = this.analyser.frequencyBinCount;
    const dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(bufferLength);

    const update: () => void = () => {
      if (!this.audioObj || this.audioObj.paused || !this.analyser) {
        this.cancelAnalysisLoop();
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      const sum: number = dataArray.reduce((acc: number, val: number) => acc + val, 0);
      const isSilent: boolean = sum === 0;

      let s1: number, s2: number, s3: number, s4: number;

      if (isSilent) {
        const time: number = Date.now() * 0.005;
        const groove: number = 0.5 + Math.sin(time * 0.6) * 0.45;
        
        s1 = 0.12 + Math.pow(Math.sin(time * 1.3 + 0.1), 2) * 0.75 * groove;
        s2 = 0.12 + Math.pow(Math.sin(time * 0.9 + 0.5), 2) * 0.85 * groove;
        s3 = 0.12 + Math.pow(Math.sin(time * 1.5 + 1.0), 2) * 0.80 * groove;
        s4 = 0.12 + Math.pow(Math.sin(time * 1.1 + 1.5), 2) * 0.65 * groove;
      } else {
        const v1: number = dataArray[3] || 0;
        const v2: number = dataArray[5] || 0;
        const v3: number = dataArray[7] || 0;
        const v4: number = dataArray[9] || 0;

        s1 = Math.min(1.4, 0.12 + Math.pow(v1 / 255, 2) * 1.3);
        s2 = Math.min(1.4, 0.12 + Math.pow(v2 / 255, 2) * 1.3);
        s3 = Math.min(1.4, 0.12 + Math.pow(v3 / 255, 2) * 1.3);
        s4 = Math.min(1.4, 0.12 + Math.pow(v4 / 255, 2) * 1.3);
      }

      if (this.spectrumElement) {
        this.spectrumElement.style.setProperty('--bar1-scale', s1.toString());
        this.spectrumElement.style.setProperty('--bar2-scale', s2.toString());
        this.spectrumElement.style.setProperty('--bar3-scale', s3.toString());
        this.spectrumElement.style.setProperty('--bar4-scale', s4.toString());
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.ngZone.runOutsideAngular(() => {
      this.animationFrameId = requestAnimationFrame(update);
    });
  }

  private cancelAnalysisLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public ngOnDestroy(): void {
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
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
