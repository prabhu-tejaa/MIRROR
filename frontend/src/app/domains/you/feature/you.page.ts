import { CommonModule } from '@angular/common';
import {
  Component, ChangeDetectionStrategy, Signal, signal, inject,
  computed, effect, NgZone, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';

import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { selectUserEmail, selectUsername } from '../../auth/data-access/store/auth.selectors';
import { AudioVisualizerService } from '../../chat/data-access/audio-visualizer.service';
import { YouActions } from '../data-access/store/you.actions';
import { EmotionStat, AnalyticsResponse, Reflection } from '../data-access/store/you.actions';
import { selectAnalytics, selectMemories, selectDataLoadedOnce, selectLoadingAnalytics } from '../data-access/store/you.selectors';

const DEFAULT_EMOTION_STAT = { name: 'Calm', primaryColor: '#2ecc71', secondaryColor: 'rgba(46, 204, 113, 0.4)' };
const MAX_USERNAME_LENGTH = 12 as const;
const SPRING_K = 0.065 as const;
const SPRING_DAMPING = 0.76 as const;

type OrbStat = EmotionStat & { orbScale: number };

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements OnDestroy {
  private store: Store<object> = inject(Store);
  private router: Router = inject(Router);
  private toastSvc: ToastService = inject(ToastService);
  private ngZone: NgZone = inject(NgZone);
  private audioVisualizerSvc: AudioVisualizerService = inject(AudioVisualizerService);

  @ViewChild('auraStage') private stageRef!: ElementRef<HTMLElement>;

  private stageOff: { x: number; y: number; } = { x: 0, y: 0 };
  private stageVel: { x: number; y: number; } = { x: 0, y: 0 };
  private rafId: number | null = null;
  private introAnimated: boolean = false;

  private readonly groovesaladUrl: string = (environment as Record<string, unknown>)['grooveSaladUrl'] as string || 'https://ice1.somafm.com/groovesalad-128-mp3';

  private readonly analyticsSignal: Signal<AnalyticsResponse | null> = this.store.selectSignal(selectAnalytics);
  private readonly memoriesSignal: Signal<Reflection[]> = this.store.selectSignal(selectMemories);
  private readonly dataLoadedOnce: Signal<boolean> = this.store.selectSignal(selectDataLoadedOnce);

  public hasDragged: boolean = false;
  public shouldAnimateIntro: boolean = false;
  public isFirstVisit: boolean = false;

  public readonly isPlaying: Signal<boolean> = this.audioVisualizerSvc.isPlaying;
  public readonly isLoadingAudio: Signal<boolean> = this.audioVisualizerSvc.isLoadingAudio;
  public readonly isRealtimeSync: Signal<boolean> = this.audioVisualizerSvc.isRealtimeSync;
  public readonly scale1: Signal<number> = this.audioVisualizerSvc.scale1;
  public readonly scale2: Signal<number> = this.audioVisualizerSvc.scale2;
  public readonly scale3: Signal<number> = this.audioVisualizerSvc.scale3;
  public readonly scale4: Signal<number> = this.audioVisualizerSvc.scale4;

  public readonly isLoading: Signal<boolean> = this.store.selectSignal(selectLoadingAnalytics);
  public readonly isTabActive: Signal<boolean> = signal<boolean>(true);
  public readonly selectedEmotion: Signal<string | null> = signal<string | null>(null);
  public readonly isAllEmotionsOpen: Signal<boolean> = signal<boolean>(false);
  public readonly openedFromAllEmotions: Signal<boolean> = signal<boolean>(false);

  public readonly totalCount: Signal<number> = computed(() => this.analyticsSignal()?.totalMemories ?? 0);
  public readonly dominantEmotion: Signal<string> = computed(() => this.analyticsSignal()?.dominantEmotion ?? 'CALM');
  public readonly activeStreak: Signal<number> = computed(() => this.analyticsSignal()?.activeStreak ?? 0);
  public readonly emotionStats: Signal<EmotionStat[]> = computed(() => this.analyticsSignal()?.emotionStats ?? []);
  public readonly auraGradient: Signal<string> = computed(() => this.analyticsSignal()?.auraGradient ?? 'transparent');
  public readonly reflectionsList: Signal<Reflection[]> = computed(() => this.memoriesSignal() ?? []);

  public readonly username: Signal<string> = computed(() => this.store.selectSignal(selectUsername)() || 'Soul');
  public readonly displayUsername: Signal<string> = computed(() => this.buildDisplayUsername());

  public readonly topOrbs: Signal<OrbStat[]> = computed(() =>
    this.emotionStats().slice(0, 4).map((stat: EmotionStat): OrbStat => ({
      ...stat,
      orbScale: 0.7 + (stat.percentage / 100) * 0.9
    }))
  );

  public readonly orbClasses: string[] = ['top-left-orb', 'top-right-orb', 'bottom-left-orb', 'bottom-right-orb'];

  public readonly filteredReflections: Signal<Reflection[]> = computed(() => {
    const selected: string | null = this.selectedEmotion();
    if (!selected) { return []; }
    return this.reflectionsList()
      .filter((ref: Reflection) => ref.emotion === selected)
      .sort((a: Reflection, b: Reflection) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  public readonly selectedEmotionStat: Signal<typeof DEFAULT_EMOTION_STAT | EmotionStat> = computed(() => {
    const key: string | null = this.selectedEmotion();
    if (!key) { return DEFAULT_EMOTION_STAT; }
    return this.emotionStats().find((s: EmotionStat) => s.key === key) ?? DEFAULT_EMOTION_STAT;
  });

  public readonly modalBorderColor: Signal<string> = computed(() => {
    const emotion: string | null = this.selectedEmotion();
    if (!emotion) { return 'rgba(255, 255, 255, 0.2)'; }
    const stat: EmotionStat | undefined = this.emotionStats().find((s: EmotionStat) => s.key === emotion);
    return stat?.primaryColor ?? 'rgba(255, 255, 255, 0.2)';
  });

  constructor() {
    effect(() => { this.handleIntroEffect(); });
  }

  public ionViewWillEnter(): void {
    (this.isTabActive as ReturnType<typeof signal<boolean>>).set(true);
    const email: string = this.store.selectSignal(selectUserEmail)() || 'guest@mirror.tech';
    if (!this.dataLoadedOnce()) {
      this.store.dispatch(YouActions.loadAnalytics({ email }));
      this.store.dispatch(YouActions.loadMemories({ email }));
    }
  }

  public ionViewDidLeave(): void {
    (this.isTabActive as ReturnType<typeof signal<boolean>>).set(false);
  }

  public selectEmotion(emotionKey: string | null): void {
    (this.selectedEmotion as ReturnType<typeof signal<string | null>>).set(emotionKey === this.selectedEmotion() ? null : emotionKey);
    (this.openedFromAllEmotions as ReturnType<typeof signal<boolean>>).set(false);
  }

  public selectFromAllEmotions(emotionKey: string): void {
    (this.selectedEmotion as ReturnType<typeof signal<string | null>>).set(emotionKey);
    (this.openedFromAllEmotions as ReturnType<typeof signal<boolean>>).set(true);
  }

  public goBackToAllEmotions(): void {
    (this.selectedEmotion as ReturnType<typeof signal<string | null>>).set(null);
    (this.openedFromAllEmotions as ReturnType<typeof signal<boolean>>).set(false);
  }

  public closeModals(): void {
    (this.selectedEmotion as ReturnType<typeof signal<string | null>>).set(null);
    (this.isAllEmotionsOpen as ReturnType<typeof signal<boolean>>).set(false);
    (this.openedFromAllEmotions as ReturnType<typeof signal<boolean>>).set(false);
  }

  public trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }

  public trackByCreatedAt(_index: number, item: { createdAt: string }): string {
    return item.createdAt;
  }

  public startReflection(): void {
    void this.router.navigate(['/tabs/chat']);
  }

  public togglePlay(): void {
    this.audioVisualizerSvc.togglePlay(this.groovesaladUrl);
  }

  public onCenterPointerDown(e: PointerEvent): void {
    const el: HTMLElement = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    this.hasDragged = false;
    this.cancelSpring();
    this.attachDragListeners(el, e);
  }

  public ngOnDestroy(): void {
    this.cancelSpring();
  }

  public get isTabActiveValue(): boolean { return this.isTabActive(); }
  public get totalCountValue(): number { return this.totalCount(); }
  public get displayUsernameValue(): string { return this.displayUsername(); }
  public get auraGradientValue(): string { return this.auraGradient(); }
  public get isAllEmotionsOpenValue(): boolean { return this.isAllEmotionsOpen(); }
  public get topOrbsValue(): OrbStat[] { return this.topOrbs(); }
  public get isLoadingValue(): boolean { return this.isLoading(); }
  public get selectedEmotionValue(): string | null { return this.selectedEmotion(); }
  public get modalBorderColorValue(): string { return this.modalBorderColor(); }
  public get openedFromAllEmotionsValue(): boolean { return this.openedFromAllEmotions(); }
  public get filteredReflectionsValue(): Reflection[] { return this.filteredReflections(); }
  public get emotionStatsValue(): EmotionStat[] { return this.emotionStats(); }
  public get isPlayingValue(): boolean { return this.isPlaying(); }
  public get isLoadingAudioValue(): boolean { return this.isLoadingAudio(); }
  public get scale1Value(): number { return this.scale1(); }
  public get scale2Value(): number { return this.scale2(); }
  public get scale3Value(): number { return this.scale3(); }
  public get scale4Value(): number { return this.scale4(); }
  public get selectedEmotionStatValue(): typeof DEFAULT_EMOTION_STAT | EmotionStat { return this.selectedEmotionStat(); }

  private buildDisplayUsername(): string {
    const name: string = this.store.selectSignal(selectUsername)() || 'Soul';
    if (name.length <= MAX_USERNAME_LENGTH) { return name; }
    if (name.includes(' ')) {
      const cutIdx: number = name.lastIndexOf(' ', MAX_USERNAME_LENGTH);
      return cutIdx > 0 ? name.substring(0, cutIdx) : name.substring(0, MAX_USERNAME_LENGTH) + '...';
    }
    return name.substring(0, MAX_USERNAME_LENGTH) + '...';
  }

  private handleIntroEffect(): void {
    const count: number = this.totalCount();
    if (count > 0 && !this.dataLoadedOnce() && !this.introAnimated) {
      this.introAnimated = true;
      this.shouldAnimateIntro = true;
      this.isFirstVisit = true;
      setTimeout(() => {
        this.shouldAnimateIntro = false;
        this.isFirstVisit = false;
      }, 4500);
    }
  }

  private attachDragListeners(el: HTMLElement, e: PointerEvent): void {
    let lastX: number = e.clientX;
    let lastY: number = e.clientY;

    const onMove: (ev: PointerEvent) => void = (ev: PointerEvent): void => {
      const dx: number = ev.clientX - lastX;
      const dy: number = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      this.stageOff.x += dx;
      this.stageOff.y += dy;
      this.stageVel.x = dx;
      this.stageVel.y = dy;
      if (Math.abs(this.stageOff.x) + Math.abs(this.stageOff.y) > 4) { this.hasDragged = true; }
      this.applyStageTransform();
    };

    const onUp: () => void = (): void => {
      el.removeEventListener('pointermove', onMove as EventListener);
      el.removeEventListener('pointerup', onUp);
      this.startSpring();
    };

    el.addEventListener('pointermove', onMove as EventListener);
    el.addEventListener('pointerup', onUp);
  }

  private applyStageTransform(): void {
    const stageEl: HTMLElement | undefined = this.stageRef?.nativeElement;
    if (stageEl) {
      stageEl.style.transform = `translate(${this.stageOff.x}px,${this.stageOff.y}px)`;
    }
  }

  private startSpring(): void {
    if (this.rafId !== null) { return; }
    this.ngZone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(() => { this.springTick(); });
    });
  }

  private springTick(): void {
    this.stageVel.x = this.stageVel.x * SPRING_DAMPING + (0 - this.stageOff.x) * SPRING_K;
    this.stageVel.y = this.stageVel.y * SPRING_DAMPING + (0 - this.stageOff.y) * SPRING_K;
    this.stageOff.x += this.stageVel.x;
    this.stageOff.y += this.stageVel.y;
    const moving: boolean = Math.abs(this.stageOff.x) > 0.15 || Math.abs(this.stageOff.y) > 0.15;
    if (moving) {
      this.applyStageTransform();
      this.rafId = requestAnimationFrame(() => { this.springTick(); });
    } else {
      this.stageOff.x = this.stageOff.y = this.stageVel.x = this.stageVel.y = 0;
      this.applyStageTransform();
      this.rafId = null;
    }
  }

  private cancelSpring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
