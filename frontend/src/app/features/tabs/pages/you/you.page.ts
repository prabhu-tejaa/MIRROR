import { Component, ChangeDetectionStrategy, signal, inject, computed, DestroyRef, NgZone } from '@angular/core';
import { AudioVisualizerService } from '../chat/data-access/audio-visualizer.service';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserMemoryService, Reflection, EmotionStat } from '../chat/data-access/user-memory.service';
import { environment } from '../../../../../environments/environment';

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

  // Initialize signals from cached values in the service if available
  private initialAnalytics = this.userMemorySvc.getAnalyticsCached();
  private initialMemories = this.userMemorySvc.getMemoriesCached();

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
  public totalCount = signal<number>(this.initialAnalytics?.totalMemories ?? 0);
  public dominantEmotion = signal<string>(this.initialAnalytics?.dominantEmotion ?? 'CALM');
  public activeStreak = signal<number>(this.initialAnalytics?.activeStreak ?? 0);
  public emotionStats = signal<EmotionStat[]>(this.initialAnalytics?.emotionStats ?? []);
  public auraGradient = signal<string>(this.initialAnalytics?.auraGradient ?? 'transparent');
  public reflectionsList = signal<Reflection[]>(
    this.initialMemories 
      ? this.initialMemories
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((m: any) => ({
            ...m,
            createdAt: typeof m.createdAt === 'number'
              ? new Date(m.createdAt < 9999999999 ? m.createdAt * 1000 : m.createdAt).toISOString()
              : String(m.createdAt)
          }))
          .filter(m => m.sender === 'user')
      : []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly groovesaladUrl = (environment as any).grooveSaladUrl || 'https://ice1.somafm.com/groovesalad-128-mp3';

  public username = computed(() => {
    return this.authSvc.getUserId() || 'Soul';
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


  public getEmotionScale(emotionKey: string): number {
    const stats = this.emotionStats();
    const stat = stats.find(s => s.key === emotionKey);
    if (!stat) return 0.7;

    // Scale from 0.7 (0%) up to 1.6 (100%)
    return 0.7 + (stat.percentage / 100) * 0.9;
  }

  constructor() { }

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

  public trackByKey(index: number, item: { key: string }): string {
    return item.key;
  }

  public trackByCreatedAt(index: number, item: { createdAt: string }): string {
    return item.createdAt;
  }

  public startReflection() {
    this.router.navigate(['/tabs/chat']);
  }

  public getSelectedEmotionStat(key: string | null) {
    if (!key) return { name: 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
    const stat = this.emotionStats().find(s => s.key === key);
    return stat || { name: key || 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
  }

  public togglePlay() {
    this.audioVisualizerSvc.togglePlay(this.groovesaladUrl);
  }

  public shouldAnimateIntro = !this.userMemorySvc.isDataLoadedOnce();

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.tech';

    // Only trigger the visual "Syncing Aura..." loader on the very first visit
    if (!this.userMemorySvc.isDataLoadedOnce()) {
      this.isLoading.set(true);
    }

    // 1. Fetch live metrics counts in the background
    this.userMemorySvc.getAnalytics(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (data) {
          this.totalCount.set(data.totalMemories ?? this.totalCount() ?? 0);
          this.dominantEmotion.set(data.dominantEmotion || this.dominantEmotion() || 'CALM');
          this.activeStreak.set(data.activeStreak ?? this.activeStreak() ?? 0);
          this.emotionStats.set(data.emotionStats || this.emotionStats() || []);
          this.auraGradient.set(data.auraGradient || this.auraGradient() || 'transparent');
        }

        if (!this.userMemorySvc.isDataLoadedOnce()) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        } else {
          this.shouldAnimateIntro = false;
        }
        this.userMemorySvc.setDataLoadedOnce(true);
        this.isLoading.set(false);
      },
      error: async (_err) => {
        if (!this.userMemorySvc.isDataLoadedOnce()) {
          setTimeout(() => { this.shouldAnimateIntro = false; }, 3000);
        } else {
          this.shouldAnimateIntro = false;
        }
        this.userMemorySvc.setDataLoadedOnce(true);
        this.isLoading.set(false);
        this.toastSvc.showError('Failed to sync your aura. Please try again.');
      }
    });

    // 2. Fetch full memory logs to create dynamic timeline
    this.userMemorySvc.getAllMemories(email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (memories) => {
        if (memories && memories.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
