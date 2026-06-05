import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject, computed, effect, DestroyRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { selectUserEmail, selectUsername } from '../../auth/data-access/store/auth.selectors';
import { AudioVisualizerService } from '../../chat/data-access/audio-visualizer.service';
import { YouActions } from '../data-access/store/you.actions';
import { selectAnalytics, selectMemories, selectDataLoadedOnce, selectLoadingAnalytics } from '../data-access/store/you.selectors';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnDestroy {
  private store: Store = inject(Store);
  private router: Router = inject(Router);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private toastSvc: ToastService = inject(ToastService);
  private ngZone: NgZone = inject(NgZone);

  private audioVisualizerSvc: AudioVisualizerService = inject(AudioVisualizerService);

  @ViewChild('auraStage') private stageRef!: ElementRef<HTMLElement>;

  private readonly springK: 0.065 = 0.065;
  private readonly damping: 0.76   = 0.76;
  private stageOff: { x: number; y: number; }    = { x: 0, y: 0 };
  private stageVel: { x: number; y: number; }    = { x: 0, y: 0 };
  private rafId: number | null = null;
  public  hasDragged: boolean  = false;

  private initialAnalytics = this.store.selectSignal(selectAnalytics);
  private initialMemories = this.store.selectSignal(selectMemories);
  private dataLoadedOnce = this.store.selectSignal(selectDataLoadedOnce);

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

  private readonly groovesaladUrl: string = (environment as Record<string, unknown>)['grooveSaladUrl'] as string || 'https://ice1.somafm.com/groovesalad-128-mp3';

  public username = computed(() => {
    return this.store.selectSignal(selectUsername)() || 'Soul';
  });

  public readonly displayUsername = computed(() => {
    const name: string = this.store.selectSignal(selectUsername)() || 'Soul';
    const MAX: 12 = 12;

    if (name.length <= MAX) {return name;}

    if (name.includes(' ')) {
      const cutIdx: number = name.lastIndexOf(' ', MAX);
      if (cutIdx > 0) {
        return name.substring(0, cutIdx);
      }
      return name.substring(0, MAX) + '...';
    }

    return name.substring(0, MAX) + '...';
  });

  public readonly topOrbs = computed(() => {
    return this.emotionStats().slice(0, 4).map(stat => ({
      ...stat,
      orbScale: 0.7 + (stat.percentage / 100) * 0.9
    }));
  });

  public readonly orbClasses: string[] = [
    'top-left-orb',
    'top-right-orb',
    'bottom-left-orb',
    'bottom-right-orb'
  ];

  public readonly filteredReflections = computed(() => {
    const selected: string | null = this.selectedEmotion();
    if (!selected) {return [];}
    return this.reflectionsList()
      .filter(ref => ref.emotion === selected)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  public readonly selectedEmotionStat = computed(() => {
    const key = this.selectedEmotion();
    if (!key) {return { name: 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };}
    const stat = this.emotionStats().find(s => s.key === key);
    return stat || { name: key || 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
  });

  private introAnimated: boolean = false;

  constructor() {
    const initiallyLoaded: boolean = this.dataLoadedOnce();
    effect(() => {
      const count: number = this.totalCount();
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

  public ionViewWillEnter(): void {
    this.isTabActive.set(true);
    const email: string = this.store.selectSignal(selectUserEmail)() || 'guest@mirror.tech';
    
    if (!this.dataLoadedOnce()) {
      this.store.dispatch(YouActions.loadAnalytics({ email }));
      this.store.dispatch(YouActions.loadMemories({ email }));
    }
  }

  public ionViewDidLeave(): void {
    this.isTabActive.set(false);
  }

  public selectEmotion(emotionKey: string | null): void {
    this.selectedEmotion.set(emotionKey === this.selectedEmotion() ? null : emotionKey);
    this.openedFromAllEmotions.set(false);
  }

  public selectFromAllEmotions(emotionKey: string): void {
    this.selectedEmotion.set(emotionKey);
    this.openedFromAllEmotions.set(true);
  }

  public goBackToAllEmotions(): void {
    this.selectedEmotion.set(null);
    this.openedFromAllEmotions.set(false);
  }

  public closeModals(): void {
    this.selectedEmotion.set(null);
    this.isAllEmotionsOpen.set(false);
    this.openedFromAllEmotions.set(false);
  }

  public modalBorderColor = computed(() => {
    const emotion: string | null = this.selectedEmotion();
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

  public startReflection(): void {
    void this.router.navigate(['/tabs/chat']);
  }



  public togglePlay(): void {
    this.audioVisualizerSvc.togglePlay(this.groovesaladUrl);
  }

  public shouldAnimateIntro: boolean = false;
  public isFirstVisit: boolean = false;

  public onCenterPointerDown(e: PointerEvent): void {
    const el: HTMLElement = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    this.hasDragged = false;
    let lastX: number = e.clientX, lastY: number = e.clientY;
    this.cancelSpring();

    const onMove: (ev: PointerEvent) => void = (ev: PointerEvent) => {
      const dx: number = ev.clientX - lastX;
      const dy: number = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      this.stageOff.x += dx;
      this.stageOff.y += dy;
      this.stageVel.x = dx;
      this.stageVel.y = dy;
      if (Math.abs(this.stageOff.x) + Math.abs(this.stageOff.y) > 4) {this.hasDragged = true;}
      const stageEl: HTMLElement = this.stageRef?.nativeElement;
      if (stageEl) {stageEl.style.transform = `translate(${this.stageOff.x}px,${this.stageOff.y}px)`;}
    };

    const onUp: () => void = () => {
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerup', onUp);
      this.startSpring();
    };

    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerup', onUp);
  }

  private startSpring(): void {
    if (this.rafId !== null) {return;}
    const K: 0.065 = this.springK;
    const D: 0.76 = this.damping;

    this.ngZone.runOutsideAngular(() => {
      const tick: () => void = () => {
        let active: boolean = false;
        const stageEl: HTMLElement = this.stageRef?.nativeElement;

        this.stageVel.x = this.stageVel.x * D + (0 - this.stageOff.x) * K;
        this.stageVel.y = this.stageVel.y * D + (0 - this.stageOff.y) * K;
        this.stageOff.x += this.stageVel.x;
        this.stageOff.y += this.stageVel.y;
        if (Math.abs(this.stageOff.x) > 0.15 || Math.abs(this.stageOff.y) > 0.15) {
          active = true;
          if (stageEl) {stageEl.style.transform = `translate(${this.stageOff.x}px,${this.stageOff.y}px)`;}
        } else {
          this.stageOff.x = this.stageOff.y = this.stageVel.x = this.stageVel.y = 0;
          if (stageEl) {stageEl.style.transform = '';}
        }

        this.rafId = active ? requestAnimationFrame(tick) : null;
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  private cancelSpring(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  public get isTabActiveValue() { return this.isTabActive(); }
  public get totalCountValue() { return this.totalCount(); }
  public get displayUsernameValue() { return this.displayUsername(); }
  public get auraGradientValue() { return this.auraGradient(); }
  public get isAllEmotionsOpenValue() { return this.isAllEmotionsOpen(); }
  public get topOrbsValue() { return this.topOrbs(); }
  public get isLoadingValue() { return this.isLoading(); }
  public get selectedEmotionValue() { return this.selectedEmotion(); }
  public get modalBorderColorValue() { return this.modalBorderColor(); }
  public get openedFromAllEmotionsValue() { return this.openedFromAllEmotions(); }
  public get filteredReflectionsValue() { return this.filteredReflections(); }
  public get emotionStatsValue() { return this.emotionStats(); }
  public get isPlayingValue() { return this.isPlaying(); }
  public get isLoadingAudioValue() { return this.isLoadingAudio(); }
  public get scale1Value() { return this.scale1(); }
  public get scale2Value() { return this.scale2(); }
  public get scale3Value() { return this.scale3(); }
  public get scale4Value() { return this.scale4(); }
  public get selectedEmotionStatValue() { return this.selectedEmotionStat(); }

  public ngOnDestroy(): void {
    this.cancelSpring();
  }
}
