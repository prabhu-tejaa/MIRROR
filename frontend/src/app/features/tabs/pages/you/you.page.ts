import { Component, ChangeDetectionStrategy, signal, inject, computed, DestroyRef, NgZone } from '@angular/core';
import { AudioVisualizerService } from '../../../../core/services/audio-visualizer.service';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserMemoryService, Reflection } from '../../../../core/services/user-memory.service';
import { environment } from '../../../../../environments/environment';
import { getEmotionColors } from '../../../../core/constants/theme.constants';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage {
  private userMemorySvc = inject(UserMemoryService);
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toastSvc = inject(ToastService);
  private ngZone = inject(NgZone);

  private audioVisualizerSvc = inject(AudioVisualizerService);

  // Ambient Sound Player Properties
  public readonly isPlaying = this.audioVisualizerSvc.isPlaying;
  public readonly isLoadingAudio = this.audioVisualizerSvc.isLoadingAudio;
  public readonly isRealtimeSync = this.audioVisualizerSvc.isRealtimeSync;
  
  public readonly scale1 = this.audioVisualizerSvc.scale1;
  public readonly scale2 = this.audioVisualizerSvc.scale2;
  public readonly scale3 = this.audioVisualizerSvc.scale3;
  public readonly scale4 = this.audioVisualizerSvc.scale4;

  public isLoading = signal<boolean>(false);
  public isTabActive = signal<boolean>(true);
  public selectedEmotion = signal<string | null>(null);
  public isAllEmotionsOpen = signal<boolean>(false);
  public emotionCounts = signal<Record<string, number>>({});
  public totalCount = signal<number>(0);
  public reflectionsList = signal<Reflection[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly groovesaladUrl = (environment as any).grooveSaladUrl || 'https://ice1.somafm.com/groovesalad-128-mp3';

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
    this.isTabActive.set(true);
    this.fetchAnalytics();
  }

  public ionViewDidLeave() {
    this.isTabActive.set(false);
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
    if (!rawTag) return { pillar: 'FEELINGS', name: 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
    const parts = rawTag.split('|');
    
    let pillar = 'FEELINGS';
    let name = rawTag;
    let primaryColor: string | undefined;
    let secondaryColor: string | undefined;

    if (parts.length === 4) {
      pillar = parts[0];
      name = parts[1];
      primaryColor = parts[2];
      secondaryColor = parts[3];
    } else if (parts.length === 3) {
      name = parts[0];
      primaryColor = parts[1];
      secondaryColor = parts[2];
    } else {
      name = parts[0] || rawTag;
    }

    // Legacy mapping fallback for static old tags if they don't have hex codes
    if (!primaryColor || !secondaryColor) {
      const colors = getEmotionColors(name);
      primaryColor = colors.primary;
      secondaryColor = colors.secondary;
    }

    return { pillar, name, primaryColor, secondaryColor };
  }

  public togglePlay() {
    this.audioVisualizerSvc.togglePlay(this.groovesaladUrl);
  }

  private static dataLoadedOnceGlobally = false;
  public shouldAnimateIntro = !YouPage.dataLoadedOnceGlobally;

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    
    // Only trigger the visual "Syncing Aura..." loader on the very first visit
    if (!YouPage.dataLoadedOnceGlobally) {
      this.isLoading.set(true);
    }

    // 1. Fetch live metrics counts in the background
    this.userMemorySvc.getAnalytics(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        const normalized: Record<string, number> = {};
        let total = 0;
        
        if (data && Object.keys(data).length > 0) {
          Object.entries(data).forEach(([key, count]) => {
            normalized[key] = (normalized[key] || 0) + count;
            total += count;
          });
        }

        this.emotionCounts.set(normalized);
        this.totalCount.set(total);
        if (!YouPage.dataLoadedOnceGlobally) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        } else {
          this.shouldAnimateIntro = false;
        }
        YouPage.dataLoadedOnceGlobally = true;
        this.isLoading.set(false);
      },
      error: async (_err) => {
        if (!YouPage.dataLoadedOnceGlobally) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        } else {
          this.shouldAnimateIntro = false;
        }
        YouPage.dataLoadedOnceGlobally = true;
        this.isLoading.set(false);
        this.toastSvc.showError('Failed to sync your aura. Please try again.');
      }
    });

    // 2. Fetch full memory logs to create dynamic timeline
    this.userMemorySvc.getAllMemories(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (memories) => {
        if (memories && memories.length > 0) {
          const normalizedMemories = memories.map((m: any) => ({
            ...m,
            createdAt: typeof m.createdAt === 'number'
              ? new Date(m.createdAt < 9999999999 ? m.createdAt * 1000 : m.createdAt).toISOString()
              : String(m.createdAt)
          }));
          this.reflectionsList.set((normalizedMemories as Reflection[]).filter(m => m.sender === 'user'));
        }
      },
      error: async () => {
        this.toastSvc.showInfo('Could not load past reflections.');
      }
    });
  }
}
