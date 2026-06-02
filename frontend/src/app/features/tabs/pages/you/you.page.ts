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
  
  // Initial empty state before backend loads
  public readonly totalCount = signal<number>(0);
  public readonly emotionCounts = signal<Record<string, number>>({});

  // Interactive UI Focus
  public readonly selectedEmotion = signal<string | null>(null);
  public readonly isAllEmotionsOpen = signal<boolean>(false);

  // Reflections history list initialized empty
  public readonly reflectionsList = signal<Reflection[]>([]);

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
    
    return Object.entries(counts).map(([rawKey, count]) => {
      const percentage = Math.round((count / total) * 100);
      const parsed = this.parseEmotionTag(rawKey);
      return {
        key: rawKey,
        name: parsed.name,
        count,
        percentage,
        primaryColor: parsed.primaryColor,
        secondaryColor: parsed.secondaryColor
      };
    }).sort((a, b) => b.count - a.count);
  });

  public readonly topOrbs = computed(() => {
    return this.emotionStats().slice(0, 4);
  });

  public readonly orbClasses = [
    'top-left-orb',
    'top-right-orb',
    'bottom-left-orb',
    'bottom-right-orb'
  ];

  // Computed timeline reflections for the selected emotion
  public readonly filteredReflections = computed(() => {
    const selected = this.selectedEmotion();
    if (!selected) return [];
    return this.reflectionsList()
      .filter(ref => ref.emotion === selected)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  // Generates a stunning, custom conic-gradient color wheel based strictly on real emotions
  public readonly auraGradient = computed(() => {
    const stats = this.emotionStats();
    const total = this.totalCount();
    if (total === 0) {
      return 'transparent';
    }

    let currentPercent = 0;
    const gradientParts: string[] = [];

    stats.forEach(stat => {
      if (stat.percentage > 0) {
        const nextPercent = currentPercent + stat.percentage;
        gradientParts.push(`${stat.primaryColor} ${currentPercent}% ${nextPercent}%`);
        currentPercent = nextPercent;
      }
    });

    if (currentPercent < 100 && gradientParts.length > 0) {
      gradientParts.push(`${stats[0].primaryColor} ${currentPercent}% 100%`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  });

  public getEmotionScale(emotionKey: string): number {
    const stats = this.emotionStats();
    const stat = stats.find(s => s.key === emotionKey);
    if (!stat) return 0.7;

    // Scale from 0.7 (0%) up to 1.6 (100%)
    return 0.7 + (stat.percentage / 100) * 0.9;
  }

  constructor() {}

  public ionViewWillEnter() {
    this.fetchAnalytics();
  }

  public selectEmotion(emotionKey: string | null) {
    this.selectedEmotion.set(emotionKey === this.selectedEmotion() ? null : emotionKey);
  }

  public selectFromAllEmotions(emotionKey: string) {
    this.selectEmotion(emotionKey);
    this.isAllEmotionsOpen.set(false);
  }

  public startReflection() {
    this.router.navigate(['/tabs/chat']);
  }

  public parseEmotionTag(rawTag: string) {
    if (!rawTag) return { name: 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
    const parts = rawTag.split('|');
    const name = parts[0] || rawTag;
    
    // Legacy mapping fallback for static old tags if they don't have hex codes
    let primaryColor = parts[1];
    let secondaryColor = parts[2];

    if (!primaryColor || !secondaryColor) {
      const up = name.toUpperCase();
      if (up.includes('JOY')) { primaryColor = '#ffd700'; secondaryColor = 'rgba(255, 215, 0, 0.4)'; }
      else if (up.includes('SAD')) { primaryColor = '#3498db'; secondaryColor = 'rgba(52, 152, 219, 0.4)'; }
      else if (up.includes('ANXIOUS')) { primaryColor = '#9b59b6'; secondaryColor = 'rgba(155, 89, 182, 0.4)'; }
      else { primaryColor = '#2ecc71'; secondaryColor = 'rgba(46, 204, 113, 0.4)'; }
    }

    return { name, primaryColor, secondaryColor };
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

  private dataLoadedOnce = false;
  public shouldAnimateIntro = true;

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    
    // Only trigger the visual "Syncing Aura..." loader on the very first visit
    if (!this.dataLoadedOnce) {
      this.isLoading.set(true);
    }

    // 1. Fetch live metrics counts in the background
    this.http.get<Record<string, number>>(`${environment.apiUrl}/api/memory/analytics`, {
      headers: { 'X-User-Email': email }
    }).subscribe({
      next: (data) => {
        const normalized: Record<string, number> = {};
        let total = 0;
        
        if (data && Object.keys(data).length > 0) {
          Object.entries(data).forEach(([key, count]) => {
            normalized[key] = (normalized[key] || 0) + count;
            total += count;
          });
        }

        // Always override with real backend data, even if total is 0
        this.emotionCounts.set(normalized);
        this.totalCount.set(total);
        if (!this.dataLoadedOnce) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        }
        this.dataLoadedOnce = true;
        this.isLoading.set(false);
      },
      error: () => {
        if (!this.dataLoadedOnce) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        }
        this.dataLoadedOnce = true;
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
