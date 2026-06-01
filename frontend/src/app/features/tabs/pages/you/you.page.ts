import { Component, ChangeDetectionStrategy, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

interface Reflection {
  content: string;
  emotion: string;
  createdAt: string;
  sender?: string;
}

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnDestroy {
  private http = inject(HttpClient);
  private authSvc = inject(AuthService);
  private router = inject(Router);

  public readonly isLoading = signal<boolean>(false);
  public readonly isLoadingAudio = signal<boolean>(false);
  
  // Vibrant dummy/demo initial values so user sees full visual effects instantly
  public readonly totalCount = signal<number>(49);
  public readonly emotionCounts = signal<Record<string, number>>({
    JOY: 21, SAD: 8, ANXIOUS: 6, CALM: 14
  });

  // Interactive UI Focus
  public readonly selectedEmotion = signal<string | null>(null);

  // Reflections history list with preset stunning dummy reflections
  public readonly reflectionsList = signal<Reflection[]>([
    { content: 'Had a wonderful day walking through the sunlit park.', emotion: 'JOY', createdAt: new Date().toISOString() },
    { content: 'Stressed about the upcoming final presentations.', emotion: 'ANXIOUS', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { content: 'Missing old childhood school friends today.', emotion: 'SAD', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { content: 'Found peace meditating under the night sky.', emotion: 'CALM', createdAt: new Date(Date.now() - 14400000).toISOString() },
    { content: 'Feeling extremely passionate and determined about the new project roadmap!', emotion: 'JOY', createdAt: new Date(Date.now() - 86400000).toISOString() }
  ]);

  // Ambient Sound Player Properties
  public readonly isPlaying = signal<boolean>(false);
  public readonly isRealtimeSync = signal<boolean>(false);
  private audioObj: HTMLAudioElement | null = null;
  private readonly groovesaladUrl = 'https://ice1.somafm.com/groovesalad-128-mp3';

  // Web Audio API analysis properties
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  public username = computed(() => {
    return this.authSvc.getUserId() || 'Soul';
  });

  public readonly dominantEmotion = computed(() => {
    const counts = this.emotionCounts();
    const total = this.totalCount();
    if (total === 0) return 'CALM';
    
    return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['CALM', 0])[0];
  });

  public readonly activeStreak = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.max(1, Math.min(12, Math.floor(total / 4) + 1));
  });

  public readonly emotionStats = computed(() => {
    const counts = this.emotionCounts();
    const total = this.totalCount() || 1;
    
    return Object.entries(counts).map(([emotion, count]) => {
      const percentage = Math.round((count / total) * 100);
      return {
        key: emotion,
        name: this.formatEmotionName(emotion),
        count,
        percentage,
        color: this.getEmotionColor(emotion),
        glow: this.getEmotionGlow(emotion)
      };
    }).sort((a, b) => b.count - a.count);
  });

  // Computed timeline reflections for the selected emotion
  public readonly filteredReflections = computed(() => {
    const selected = this.selectedEmotion();
    if (!selected) return [];
    return this.reflectionsList()
      .filter(ref => {
        if (!ref.emotion) return false;
        const k = ref.emotion.toUpperCase();
        let norm = 'CALM';
        if (k.includes('JOY') || k.includes('HAPPY') || k.includes('EXCITE') || k.includes('ANGER') || k.includes('FRUSTRATION') || k.includes('MAD')) norm = 'JOY';
        else if (k.includes('SAD') || k.includes('LONELY') || k.includes('MELANCHOLY') || k.includes('NOSTALGIA')) norm = 'SAD';
        else if (k.includes('ANXIOUS') || k.includes('WORRY') || k.includes('FEAR') || k.includes('STRESS') || k.includes('NEUTRAL')) norm = 'ANXIOUS';
        return norm === selected;
      });
  });

  // Generates a stunning, custom conic-gradient color wheel based strictly on real emotions
  public readonly auraGradient = computed(() => {
    const stats = this.emotionStats();
    const total = this.totalCount();
    if (total === 0) {
      return 'conic-gradient(var(--color-calm, #2ecc71) 0% 100%)';
    }

    let currentPercent = 0;
    const gradientParts: string[] = [];

    stats.forEach(stat => {
      if (stat.percentage > 0) {
        const nextPercent = currentPercent + stat.percentage;
        gradientParts.push(`${stat.color} ${currentPercent}% ${nextPercent}%`);
        currentPercent = nextPercent;
      }
    });

    if (currentPercent < 100 && gradientParts.length > 0) {
      gradientParts.push(`${stats[0].color} ${currentPercent}% 100%`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  });

  constructor() {}

  public ionViewWillEnter() {
    this.fetchAnalytics();
  }

  public selectEmotion(emotionKey: string | null) {
    this.selectedEmotion.set(emotionKey === this.selectedEmotion() ? null : emotionKey);
  }

  public startReflection() {
    this.router.navigate(['/tabs/chat']);
  }

  public formatEmotionName(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: 'Joy',
      CALM: 'Calm',
      SAD: 'Sadness',
      ANXIOUS: 'Anxiety'
    };
    return mapping[emotion.toUpperCase()] || emotion;
  }

  public getEmotionColor(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: '#ffd700',
      CALM: '#2ecc71',
      SAD: '#3498db',
      ANXIOUS: '#9b59b6'
    };
    return mapping[emotion.toUpperCase()] || '#7f8c8d';
  }

  public getEmotionGlow(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: 'rgba(255, 215, 0, 0.4)',
      CALM: 'rgba(46, 204, 113, 0.4)',
      SAD: 'rgba(52, 152, 219, 0.4)',
      ANXIOUS: 'rgba(155, 89, 182, 0.4)'
    };
    return mapping[emotion.toUpperCase()] || 'rgba(127, 140, 141, 0.4)';
  }

  // Audio player methods
  public togglePlay() {
    if (this.isLoadingAudio()) return;

    if (this.isPlaying()) {
      if (this.audioObj) {
        this.audioObj.pause();
      }
      this.isPlaying.set(false);
      this.cancelAnalysisLoop();
    } else {
      if (!this.audioObj) {
        this.audioObj = new Audio();
        this.audioObj.crossOrigin = 'anonymous';
        
        // Listeners for load start and buffering state
        this.audioObj.addEventListener('loadstart', () => this.isLoadingAudio.set(true));
        this.audioObj.addEventListener('waiting', () => this.isLoadingAudio.set(true));
        
        this.audioObj.addEventListener('playing', () => {
          this.isLoadingAudio.set(false);
          this.isPlaying.set(true);
          this.setupAudioAnalysis();
        });
        
        this.audioObj.addEventListener('pause', () => {
          this.isPlaying.set(false);
          this.isLoadingAudio.set(false);
        });
        
        this.audioObj.addEventListener('error', () => {
          this.isLoadingAudio.set(false);
          this.isPlaying.set(false);
        });

        this.audioObj.src = this.groovesaladUrl;
        this.audioObj.loop = true;
      }
      
      this.isLoadingAudio.set(true);
      this.audioObj.play()
        .catch(() => {
          this.isPlaying.set(false);
          this.isLoadingAudio.set(false);
        });
    }
  }

  private setupAudioAnalysis() {
    if (!this.audioObj) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
        this.audioCtx.resume();
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
      if (!this.isPlaying() || !this.analyser) {
        this.cancelAnalysisLoop();
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      // Check if all frequency bins are zero (indicating CORS blockage or silent browser policy)
      const sum = dataArray.reduce((acc, val) => acc + val, 0);
      const isSilent = sum === 0;

      let scale1: number;
      let scale2: number;
      let scale3: number;
      let scale4: number;

      if (isSilent) {
        // Procedurally generate highly dynamic breathing lofi groove scales that stay compressed at the bottom and pop up on beats!
        const time = Date.now() * 0.005;
        const groove = 0.5 + Math.sin(time * 0.6) * 0.45;
        
        // Squaring the sine waves makes the bars hover near the low baseline and pop up sharply on rhythmic accents!
        scale1 = 0.12 + Math.pow(Math.sin(time * 1.3 + 0.1), 2) * 0.75 * groove;
        scale2 = 0.12 + Math.pow(Math.sin(time * 0.9 + 0.5), 2) * 0.85 * groove;
        scale3 = 0.12 + Math.pow(Math.sin(time * 1.5 + 1.0), 2) * 0.80 * groove;
        scale4 = 0.12 + Math.pow(Math.sin(time * 1.1 + 1.5), 2) * 0.65 * groove;
      } else {
        // Highly dynamic live scaling that compresses to the bottom and pops on peaks!
        const v1 = dataArray[3] || 0;
        const v2 = dataArray[5] || 0;
        const v3 = dataArray[7] || 0;
        const v4 = dataArray[9] || 0;

        // Squaring the normalized audio volume keeps the visualizer low and reacts logarithmically to snare/kick peaks
        scale1 = Math.min(1.4, 0.12 + Math.pow(v1 / 255, 2) * 1.3);
        scale2 = Math.min(1.4, 0.12 + Math.pow(v2 / 255, 2) * 1.3);
        scale3 = Math.min(1.4, 0.12 + Math.pow(v3 / 255, 2) * 1.3);
        scale4 = Math.min(1.4, 0.12 + Math.pow(v4 / 255, 2) * 1.3);
      }

      const container = document.querySelector('.playing-spectrum') as HTMLElement;
      if (container) {
        container.style.setProperty('--bar1-scale', `${scale1}`);
        container.style.setProperty('--bar2-scale', `${scale2}`);
        container.style.setProperty('--bar3-scale', `${scale3}`);
        container.style.setProperty('--bar4-scale', `${scale4}`);
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  private cancelAnalysisLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.isLoading.set(true);

    // 1. Fetch live metrics counts
    this.http.get<Record<string, number>>(`${environment.apiUrl}/api/memory/analytics`, {
      headers: { 'X-User-Email': email }
    }).subscribe({
      next: (data) => {
        const normalized: Record<string, number> = { JOY: 0, SAD: 0, ANXIOUS: 0, CALM: 0 };
        let total = 0;
        
        if (data && Object.keys(data).length > 0) {
          Object.entries(data).forEach(([key, count]) => {
            const k = key.toUpperCase();
            let norm = 'CALM';
            if (k.includes('JOY') || k.includes('HAPPY') || k.includes('EXCITE') || k.includes('ANGER') || k.includes('FRUSTRATION') || k.includes('MAD')) norm = 'JOY';
            else if (k.includes('SAD') || k.includes('LONELY') || k.includes('MELANCHOLY') || k.includes('NOSTALGIA')) norm = 'SAD';
            else if (k.includes('ANXIOUS') || k.includes('WORRY') || k.includes('FEAR') || k.includes('STRESS') || k.includes('NEUTRAL')) norm = 'ANXIOUS';
            normalized[norm] += count;
            total += count;
          });
        }

        // Only override if live data actually exists to ensure full dummy preview by default
        if (total > 0) {
          this.emotionCounts.set(normalized);
          this.totalCount.set(total);
        }
        this.isLoading.set(false);
      },
      error: () => {
        // Safe fallback is already preset in initial signals
        this.isLoading.set(false);
      }
    });

    // 2. Fetch full memory logs to create dynamic timeline
    this.http.get<Reflection[]>(`${environment.apiUrl}/api/memory/all`, {
      headers: { 'X-User-Email': email }
    }).subscribe({
      next: (memories) => {
        if (memories && memories.length > 0) {
          this.reflectionsList.set(memories.filter(m => m.sender === 'user'));
        }
      },
      error: () => {
        // Safe fallback is already preset in initial signals
      }
    });
  }

  public ngOnDestroy() {
    this.cancelAnalysisLoop();
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
