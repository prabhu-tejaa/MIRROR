import { Component, ChangeDetectionStrategy, signal, inject, computed, DestroyRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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
export class YouPage implements OnDestroy {
  private userMemorySvc = inject(UserMemoryService);
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toastSvc = inject(ToastService);
  private ngZone = inject(NgZone);

  private audioVisualizerSvc = inject(AudioVisualizerService);

  @ViewChild('auraStage') private stageRef!: ElementRef<HTMLElement>;

  // ── Drag & spring-physics (all plain objects — no signals needed for RAF perf) ──
  private readonly SPRING_K = 0.065;
  private readonly DAMPING   = 0.76;
  private orbOffsets  = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
  private orbVels     = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
  private stageOff    = { x: 0, y: 0 };
  private stageVel    = { x: 0, y: 0 };
  private rafId: number | null = null;
  public  hasDragged  = false;

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

  public readonly displayUsername = computed(() => {
    const name = this.authSvc.getUserId() || 'Soul';
    const MAX = 12;

    if (name.length <= MAX) return name;

    if (name.includes(' ')) {
      const cutIdx = name.lastIndexOf(' ', MAX);
      if (cutIdx > 0) {
        return name.substring(0, cutIdx);
      }
      return name.substring(0, MAX) + '...';
    }

    // Single long word → character truncate with ellipsis
    return name.substring(0, MAX) + '...';
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

  // ── Outer-orb individual drag ────────────────────────────────────────────────
  public onOrbPointerDown(e: PointerEvent, index: number): void {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    this.hasDragged = false;
    let lastX = e.clientX, lastY = e.clientY;
    this.cancelSpring();

    // Grab wrapper reference once so onMove can read its live rotation matrix
    const wrapper = this.stageRef?.nativeElement?.querySelector<HTMLElement>('.outer-orbs-wrapper');

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;

      // Convert screen-space drag into the wrapper's local (rotated) coordinate space
      let localDx = dx, localDy = dy;
      if (wrapper) {
        const m = new DOMMatrix(getComputedStyle(wrapper).transform);
        const angle = -Math.atan2(m.b, m.a);
        localDx = dx * Math.cos(angle) - dy * Math.sin(angle);
        localDy = dx * Math.sin(angle) + dy * Math.cos(angle);
      }

      this.orbOffsets[index].x += localDx;
      this.orbOffsets[index].y += localDy;
      this.orbVels[index].x = localDx;
      this.orbVels[index].y = localDy;
      if (Math.abs(this.orbOffsets[index].x) + Math.abs(this.orbOffsets[index].y) > 4) this.hasDragged = true;
      el.style.setProperty('--orb-drag-x', `${this.orbOffsets[index].x}px`);
      el.style.setProperty('--orb-drag-y', `${this.orbOffsets[index].y}px`);
    };

    const onUp = () => {
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerup', onUp);
      this.startSpring();
    };

    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerup', onUp);
  }

  // ── Center-orb drag → whole stage moves ──────────────────────────────────────
  public onCenterPointerDown(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    this.hasDragged = false;
    let lastX = e.clientX, lastY = e.clientY;
    this.cancelSpring();

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      this.stageOff.x += dx;
      this.stageOff.y += dy;
      this.stageVel.x = dx;
      this.stageVel.y = dy;
      if (Math.abs(this.stageOff.x) + Math.abs(this.stageOff.y) > 4) this.hasDragged = true;
      const stageEl = this.stageRef?.nativeElement;
      if (stageEl) stageEl.style.transform = `translate(${this.stageOff.x}px,${this.stageOff.y}px)`;
    };

    const onUp = () => {
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerup', onUp);
      this.startSpring();
    };

    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerup', onUp);
  }

  // ── Spring-physics loop (RAF outside Angular zone for max perf) ──────────────
  private startSpring(): void {
    if (this.rafId !== null) return;
    const K = this.SPRING_K;
    const D = this.DAMPING;

    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        let active = false;
        const stageEl = this.stageRef?.nativeElement;

        // — stage spring —
        this.stageVel.x = this.stageVel.x * D + (0 - this.stageOff.x) * K;
        this.stageVel.y = this.stageVel.y * D + (0 - this.stageOff.y) * K;
        this.stageOff.x += this.stageVel.x;
        this.stageOff.y += this.stageVel.y;
        if (Math.abs(this.stageOff.x) > 0.15 || Math.abs(this.stageOff.y) > 0.15) {
          active = true;
          if (stageEl) stageEl.style.transform = `translate(${this.stageOff.x}px,${this.stageOff.y}px)`;
        } else {
          this.stageOff.x = this.stageOff.y = this.stageVel.x = this.stageVel.y = 0;
          if (stageEl) stageEl.style.transform = '';
        }

        // — orb springs —
        const orbEls = stageEl
          ? Array.from(stageEl.querySelectorAll<HTMLElement>('.outer-orbs-wrapper .aura-orb'))
          : [];

        for (let i = 0; i < this.orbOffsets.length; i++) {
          const o = this.orbOffsets[i];
          const v = this.orbVels[i];
          if (o.x === 0 && o.y === 0 && v.x === 0 && v.y === 0) continue;
          v.x = v.x * D + (0 - o.x) * K;
          v.y = v.y * D + (0 - o.y) * K;
          o.x += v.x;
          o.y += v.y;
          const orbEl = orbEls[i];
          if (Math.abs(o.x) > 0.15 || Math.abs(o.y) > 0.15) {
            active = true;
            if (orbEl) {
              orbEl.style.setProperty('--orb-drag-x', `${o.x}px`);
              orbEl.style.setProperty('--orb-drag-y', `${o.y}px`);
            }
          } else {
            o.x = o.y = v.x = v.y = 0;
            if (orbEl) { orbEl.style.removeProperty('--orb-drag-x'); orbEl.style.removeProperty('--orb-drag-y'); }
          }
        }

        this.rafId = active ? requestAnimationFrame(tick) : null;
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  private cancelSpring(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  public ngOnDestroy(): void {
    this.cancelSpring();
  }
}
