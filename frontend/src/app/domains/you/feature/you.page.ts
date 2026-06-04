import { Component, ChangeDetectionStrategy, signal, inject, computed, effect, DestroyRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AudioVisualizerService } from '../../chat/data-access/audio-visualizer.service';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { ToastService } from '../../../core/services/toast.service';
import { Store } from '@ngrx/store';
import { selectUserEmail, selectUsername } from '../../auth/data-access/store/auth.selectors';
import { YouActions } from '../data-access/store/you.actions';
import { selectAnalytics, selectMemories, selectDataLoadedOnce, selectLoadingAnalytics } from '../data-access/store/you.selectors';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private toastSvc = inject(ToastService);
  private ngZone = inject(NgZone);

  private audioVisualizerSvc = inject(AudioVisualizerService);

  @ViewChild('auraStage') private stageRef!: ElementRef<HTMLElement>;

  // ── Drag & spring-physics (all plain objects — no signals needed for RAF perf) ──
  private readonly springK = 0.065;
  private readonly damping   = 0.76;
  private stageOff    = { x: 0, y: 0 };
  private stageVel    = { x: 0, y: 0 };
  private rafId: number | null = null;
  public  hasDragged  = false;

  private initialAnalytics = this.store.selectSignal(selectAnalytics);
  private initialMemories = this.store.selectSignal(selectMemories);
  private dataLoadedOnce = this.store.selectSignal(selectDataLoadedOnce);

  // Ambient Sound Player Properties
  public readonly isPlaying = this.audioVisualizerSvc.isPlaying;
  public readonly isLoadingAudio = this.audioVisualizerSvc.isLoadingAudio;
  public readonly isRealtimeSync = this.audioVisualizerSvc.isRealtimeSync;

  public readonly scale1 = this.audioVisualizerSvc.scale1;
  public readonly scale2 = this.audioVisualizerSvc.scale2;
  public readonly scale3 = this.audioVisualizerSvc.scale3;
  public readonly scale4 = this.audioVisualizerSvc.scale4;

  public isLoading = this.store.selectSignal(selectLoadingAnalytics);
  public isTabActive = signal<boolean>(true);
  public selectedEmotion = signal<string | null>(null);
  public isAllEmotionsOpen = signal<boolean>(false);
  public openedFromAllEmotions = signal<boolean>(false);
  
  public totalCount = computed(() => this.initialAnalytics()?.totalMemories ?? 0);
  public dominantEmotion = computed(() => this.initialAnalytics()?.dominantEmotion ?? 'CALM');
  public activeStreak = computed(() => this.initialAnalytics()?.activeStreak ?? 0);
  public emotionStats = computed(() => this.initialAnalytics()?.emotionStats ?? []);
  public auraGradient = computed(() => this.initialAnalytics()?.auraGradient ?? 'transparent');
  public reflectionsList = computed(() => this.initialMemories() ?? []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly groovesaladUrl = (environment as any).grooveSaladUrl || 'https://ice1.somafm.com/groovesalad-128-mp3';

  public username = computed(() => {
    return this.store.selectSignal(selectUsername)() || 'Soul';
  });

  public readonly displayUsername = computed(() => {
    const name = this.store.selectSignal(selectUsername)() || 'Soul';
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

  private introAnimated = false;

  constructor() {
    const initiallyLoaded = this.dataLoadedOnce();
    effect(() => {
      const count = this.totalCount();
      if (count > 0 && !initiallyLoaded && !this.introAnimated) {
        this.introAnimated = true;
        this.shouldAnimateIntro = true;
        this.isFirstVisit = true;
        setTimeout(() => {
          this.shouldAnimateIntro = false;
          this.isFirstVisit = false;
        }, 4500);
      }
    });
  }

  public ionViewWillEnter() {
    this.isTabActive.set(true);
    const email = this.store.selectSignal(selectUserEmail)() || 'guest@mirror.tech';
    
    if (!this.dataLoadedOnce()) {
      this.store.dispatch(YouActions.loadAnalytics({ email }));
      this.store.dispatch(YouActions.loadMemories({ email }));
    }
  }

  public ionViewDidLeave() {
    this.isTabActive.set(false);
  }

  public selectEmotion(emotionKey: string | null) {
    this.selectedEmotion.set(emotionKey === this.selectedEmotion() ? null : emotionKey);
    this.openedFromAllEmotions.set(false);
  }

  public selectFromAllEmotions(emotionKey: string) {
    this.selectedEmotion.set(emotionKey);
    // Leave isAllEmotionsOpen true so that navigating back is seamless
    this.openedFromAllEmotions.set(true);
  }

  public goBackToAllEmotions() {
    this.selectedEmotion.set(null);
    this.openedFromAllEmotions.set(false);
    // isAllEmotionsOpen is already true, so the view swaps automatically
  }

  public closeModals() {
    this.selectedEmotion.set(null);
    this.isAllEmotionsOpen.set(false);
    this.openedFromAllEmotions.set(false);
  }

  public modalBorderColor = computed(() => {
    const emotion = this.selectedEmotion();
    if (emotion) {
      return this.getSelectedEmotionStat(emotion).primaryColor;
    }
    return 'rgba(255, 255, 255, 0.2)';
  });

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

  public shouldAnimateIntro = false;
  public isFirstVisit = false;

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
    const K = this.springK;
    const D = this.damping;

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
