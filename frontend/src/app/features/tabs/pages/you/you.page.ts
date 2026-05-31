import { Component, ChangeDetectionStrategy, signal, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';


@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage implements AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private authSvc = inject(AuthService);

  @ViewChild('fluidCanvas', { static: false }) public fluidCanvasRef!: ElementRef<HTMLCanvasElement>;

  public readonly isLoading = signal<boolean>(false);
  public readonly totalCount = signal<number>(0);
  public readonly emotionCounts = signal<Record<string, number>>({
    JOY: 0, SAD: 0, ANXIOUS: 0, ANGER: 0, CALM: 0
  });

  // Canvas engine
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private timeOffset = 0;
  private resizeListener: any = null;
  private touchListeners: { el: HTMLElement | Window; name: string; cb: any }[] = [];

  // Personal mandala DNA — seeded uniquely per user, computed once
  private dna: MandalaGenome | null = null;

  // Ambient space: orbiting constellation particles + background glow orbs
  private orbitParticles: OrbitParticle[] = [];
  private ambientOrbs: AmbientOrb[] = [];

  // ── LIVING WORLD systems ──────────────────────────────────────────────────
  // Spirit particles: tiny souls drifting across the whole canvas
  private spiritParticles: SpiritParticle[] = [];
  // Heartbeat pulse rings expanding from the mandala center
  private pulseRings: PulseRing[] = [];
  private lastPulseTime = 0;

  // Interaction
  private mouse = { x: 0, y: 0, active: false };


  constructor() {}

  public ngAfterViewInit() {
    this.initCanvas();
    this.resizeListener = () => this.resizeCanvas();
    window.addEventListener('resize', this.resizeListener);
    this.startLoop();
  }

  public ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
    this.touchListeners.forEach(t => t.el.removeEventListener(t.name, t.cb));
  }

  public ionViewWillEnter() {
    this.fetchAnalytics();
  }

  public ionViewWillLeave() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public ionViewDidEnter() {
    this.startLoop();
  }

  // ─── Canvas Init ──────────────────────────────────────────────────────────

  private initCanvas() {
    const canvas = this.fluidCanvasRef?.nativeElement;
    if (!canvas) return;
    this.canvasCtx = canvas.getContext('2d');
    this.resizeCanvas();
    this.setupTouchListeners(canvas);
    this.buildDNA(); // Build the personal mandala seed
  }

  private resizeCanvas() {
    const canvas = this.fluidCanvasRef?.nativeElement;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  private setupTouchListeners(canvas: HTMLCanvasElement) {
    const start = (e: MouseEvent | TouchEvent) => { this.mouse.active = true; this.updateCoords(e, canvas); };
    const move  = (e: MouseEvent | TouchEvent) => { this.updateCoords(e, canvas); };
    const end   = () => { this.mouse.active = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: true });
    canvas.addEventListener('touchmove', move, { passive: true });
    canvas.addEventListener('touchend', end);

    this.touchListeners = [
      { el: canvas, name: 'mousedown', cb: start },
      { el: canvas, name: 'mousemove', cb: move },
      { el: window, name: 'mouseup', cb: end },
      { el: canvas, name: 'touchstart', cb: start },
      { el: canvas, name: 'touchmove', cb: move },
      { el: canvas, name: 'touchend', cb: end },
    ];
  }

  private updateCoords(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      this.mouse.x = e.touches[0].clientX - rect.left;
      this.mouse.y = e.touches[0].clientY - rect.top;
    } else if ('clientX' in e) {
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    }
  }

  // ─── Personal DNA Generation ──────────────────────────────────────────────

  /**
   * Hashes a string into a stable integer seed.
   * Same username → same hash every time → same mandala always.
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash >>> 0); // Unsigned 32-bit int
  }

  /** Seeded random — deterministic from a given seed */
  private seededRand(seed: number, index: number): number {
    const x = Math.sin(seed + index) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * Builds the personal MandalaGenome from the user's identity.
   * This is computed once and determines the visual fingerprint of this user forever.
   */
  private buildDNA() {
    const username = this.authSvc.getUserId() || this.authSvc.getEmail() || 'soul';
    const seed = this.hashString(username);
    const r = (i: number) => this.seededRand(seed, i);

    // Number of petals/arms: 4, 6, 7, or 8 — seeded uniquely
    const petalOptions = [4, 5, 6, 7, 8, 9, 12];
    const petals = petalOptions[Math.floor(r(0) * petalOptions.length)];

    // Layering: how many concentric rings (2–4)
    const layers = 2 + Math.floor(r(1) * 3);

    // Primary hue (0-360) — the user's dominant personal color
    const primaryHue = Math.floor(r(2) * 360);
    // Secondary hue — complementary offset
    const secondaryHue = (primaryHue + 120 + Math.floor(r(3) * 60)) % 360;
    // Accent hue
    const accentHue = (primaryHue + 240 + Math.floor(r(4) * 30)) % 360;

    // Spiral tightness (how wound the inner spiral is)
    const spiralTightness = 0.3 + r(5) * 1.4;

    // Wave frequency of each arm's edge
    const edgeWaves = 2 + Math.floor(r(6) * 5);

    // Rotation speed direction (-1 or +1)
    const rotDir = r(7) > 0.5 ? 1 : -1;

    // Inner detail pattern
    const innerPattern: 'star' | 'rose' | 'lace' = (['star', 'rose', 'lace'] as const)[Math.floor(r(8) * 3)];

    this.dna = { seed, petals, layers, primaryHue, secondaryHue, accentHue, spiralTightness, edgeWaves, rotDir, innerPattern };

    // Spawn constellation orbit ring — 36 particles evenly around the mandala
    this.orbitParticles = [];
    const orbitCount = 36 + Math.floor(r(9) * 20);
    const hues = [primaryHue, secondaryHue, accentHue];
    for (let i = 0; i < orbitCount; i++) {
      const ri = (idx: number) => this.seededRand(seed + i * 97, idx);
      this.orbitParticles.push({
        angle: (i / orbitCount) * Math.PI * 2 + ri(0) * 0.3,
        orbitRadiusFraction: 0.52 + ri(1) * 0.25, // fraction of min(W,H)/2
        speed: (ri(2) > 0.5 ? 1 : -1) * (0.0003 + ri(3) * 0.0006),
        size: 1.5 + ri(4) * 3.5,
        hue: hues[Math.floor(ri(5) * 3)],
        alpha: 0.35 + ri(6) * 0.55,
        connected: ri(7) > 0.45, // whether this particle draws a line to the next
      });
    }

    // Spawn ambient background orbs — large soft glowing blobs drifting in the edges/corners
    this.ambientOrbs = [];
    const orbCount = 6 + Math.floor(r(10) * 5);
    for (let i = 0; i < orbCount; i++) {
      const ri = (idx: number) => this.seededRand(seed + i * 137, idx);
      this.ambientOrbs.push({
        // Position as a fraction of screen (placed in outer 40% of screen area)
        xFrac: ri(0) > 0.5 ? (0.7 + ri(1) * 0.3) : (ri(1) * 0.3),
        yFrac: ri(2) > 0.5 ? (0.7 + ri(3) * 0.3) : (ri(3) * 0.3),
        driftX: (ri(4) - 0.5) * 0.00012,
        driftY: (ri(5) - 0.5) * 0.00012,
        radiusFraction: 0.12 + ri(6) * 0.18, // fraction of min(W,H)
        hue: hues[Math.floor(ri(7) * 3)],
        alpha: 0.04 + ri(8) * 0.08,
        pulseSpeed: 0.4 + ri(9) * 0.8,
        pulsePhase: ri(10) * Math.PI * 2,
      });
    }

    // Spawn spirit particles — tiny glowing souls drifting across the whole canvas
    // These make the world feel inhabited and alive between renders
    this.spiritParticles = [];
    const spiritCount = 220;
    for (let i = 0; i < spiritCount; i++) {
      const ri = (idx: number) => this.seededRand(seed + i * 53 + 9999, idx);
      this.spiritParticles.push({
        x: ri(0),         // fraction of W
        y: ri(1),         // fraction of H
        vx: (ri(2) - 0.5) * 0.00025,
        vy: -(0.00008 + ri(3) * 0.00018), // upward drift
        size: 0.8 + ri(4) * 2.2,
        hue: hues[Math.floor(ri(5) * 3)],
        alpha: 0.2 + ri(6) * 0.6,
        twinkleSpeed: 0.8 + ri(7) * 2.5,
        twinklePhase: ri(8) * Math.PI * 2,
        life: ri(9),      // start at random phase so they don't all appear at once
        maxLife: 0.6 + ri(10) * 0.4, // fraction — wraps 0..1
      });
    }
  }

  // ─── Animation Loop ───────────────────────────────────────────────────────

  private startLoop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    const draw = () => {
      this.renderMandala();
      this.animationFrameId = requestAnimationFrame(draw);
    };
    this.animationFrameId = requestAnimationFrame(draw);
  }

  // ─── Mandala Renderer ─────────────────────────────────────────────────────

  private renderMandala() {
    const ctx = this.canvasCtx;
    const canvas = this.fluidCanvasRef?.nativeElement;
    if (!ctx || !canvas || !this.dna) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    const dna = this.dna;
    this.timeOffset += 0.004;
    const t = this.timeOffset;

    // ── Emotion-driven palette override ──────────────────────────────────────
    // Dominant emotion subtly shifts the HSL lightness/saturation/hue tint
    // but the base palette remains uniquely the user's own
    const counts = this.emotionCounts();
    const total = this.totalCount() || 1;
    const joyPct     = (counts['JOY']     || 0) / total;
    const calmPct    = (counts['CALM']    || 0) / total;
    const sadPct     = (counts['SAD']     || 0) / total;
    const anxiousPct = (counts['ANXIOUS'] || 0) / total;
    const angerPct   = (counts['ANGER']   || 0) / total;

    // Emotional energy score: how "charged" the session is
    const emotionalEnergy = (joyPct * 1.4) + (anxiousPct * 1.3) + (angerPct * 1.6) + (calmPct * 0.6) + (sadPct * 0.5);
    const baseSpeed = 0.4 + emotionalEnergy * 0.5;

    // Hue tint from dominant emotion
    let hueShift = 0;
    const dominant = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['CALM', 0])[0];
    if (dominant === 'JOY')     hueShift = 20;   // Warm shift
    if (dominant === 'ANGER')   hueShift = -30;  // Hot red shift
    if (dominant === 'SAD')     hueShift = -60;  // Cool blue shift
    if (dominant === 'ANXIOUS') hueShift = 40;   // Purple-violet shift
    if (dominant === 'CALM')    hueShift = -20;  // Green-teal shift

    const pH = (dna.primaryHue   + hueShift + 360) % 360;
    const sH = (dna.secondaryHue + hueShift + 360) % 360;
    const aH = (dna.accentHue    + hueShift + 360) % 360;

    // ── Journal depth: total entries drive mandala complexity ─────────────────
    // More entries → more layers fully visible, more detail
    const journalDepth = Math.min(1.0, this.totalCount() / 50); // Saturates at 50 entries

    // ── Interaction: mouse breathing ──────────────────────────────────────────
    let breathExtra = 0;
    if (this.mouse.active) {
      const dx = this.mouse.x - cx;
      const dy = this.mouse.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      breathExtra = Math.max(0, 1 - dist / (Math.min(W, H) * 0.5)) * 0.3;
    }

    const maxRadius = Math.min(W, H) * 0.42;

    // ── 1. Ambient Background Orbs (drifting nebula clouds) ──────────────────
    for (const orb of this.ambientOrbs) {
      orb.xFrac = ((orb.xFrac + orb.driftX + 1) % 1);
      orb.yFrac = ((orb.yFrac + orb.driftY + 1) % 1);
      const ox = orb.xFrac * W;
      const oy = orb.yFrac * H;
      const orbR = orb.radiusFraction * Math.min(W, H);
      const pulse = 1 + Math.sin(t * orb.pulseSpeed + orb.pulsePhase) * 0.22;
      const finalR = orbR * pulse;
      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, finalR);
      grad.addColorStop(0,   `hsla(${orb.hue}, 75%, 62%, ${orb.alpha * 1.4})`);
      grad.addColorStop(0.5, `hsla(${orb.hue}, 65%, 50%, ${orb.alpha * 0.5})`);
      grad.addColorStop(1,   `hsla(${orb.hue}, 60%, 40%, 0)`);
      ctx.beginPath();
      ctx.arc(ox, oy, finalR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── 2. Aurora Ribbons — sweeping sinusoidal color bands across the screen ──
    // 3 bands at different heights, phases, frequencies — all in personal palette
    const auroraHues = [pH, sH, aH];
    const auroraHeights   = [H * 0.15, H * 0.25, H * 0.08];
    const auroraAmps      = [H * 0.04, H * 0.03, H * 0.05];
    const auroraFreqs     = [0.004, 0.006, 0.003];
    const auroraPhases    = [0, Math.PI * 0.6, Math.PI * 1.3];
    const auroraWidths    = [H * 0.12, H * 0.09, H * 0.07];
    const auroraAlphas    = [0.06, 0.05, 0.04];

    for (let b = 0; b < 3; b++) {
      const bH    = auroraHues[b];
      const bAmp  = auroraAmps[b] * (1 + emotionalEnergy * 0.4);
      const bFreq = auroraFreqs[b];
      const bPhase = auroraPhases[b];
      const bWidth = auroraWidths[b];
      const bAlpha = auroraAlphas[b];
      const bY0   = auroraHeights[b];

      // Draw the ribbon as a filled sine path
      ctx.beginPath();
      ctx.moveTo(0, bY0);
      for (let x = 0; x <= W; x += 4) {
        const y = bY0 + Math.sin(x * bFreq + t * 0.7 + bPhase) * bAmp
                      + Math.sin(x * bFreq * 1.7 - t * 0.4 + bPhase) * bAmp * 0.4;
        ctx.lineTo(x, y);
      }
      for (let x = W; x >= 0; x -= 4) {
        const y = bY0 + Math.sin(x * bFreq + t * 0.7 + bPhase) * bAmp
                      + Math.sin(x * bFreq * 1.7 - t * 0.4 + bPhase) * bAmp * 0.4 + bWidth;
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      const auroraGrad = ctx.createLinearGradient(0, bY0, 0, bY0 + bWidth);
      auroraGrad.addColorStop(0,   `hsla(${bH}, 80%, 65%, 0)`);
      auroraGrad.addColorStop(0.4, `hsla(${bH}, 85%, 68%, ${bAlpha * 1.5})`);
      auroraGrad.addColorStop(0.6, `hsla(${bH}, 80%, 60%, ${bAlpha})`);
      auroraGrad.addColorStop(1,   `hsla(${bH}, 70%, 50%, 0)`);
      ctx.fillStyle = auroraGrad;
      ctx.fill();
    }

    // ── 3. Spirit Particles — tiny souls drifting upward across the whole canvas ──
    for (const sp of this.spiritParticles) {
      sp.x = ((sp.x + sp.vx + 1) % 1);
      sp.y = ((sp.y + sp.vy + 1) % 1); // wraps — respawns from bottom
      sp.life = (sp.life + 0.0018) % sp.maxLife;

      const lifeFrac = sp.life / sp.maxLife;
      // Life cycle: fade in, hold, fade out
      let lifeAlpha = lifeFrac < 0.15 ? lifeFrac / 0.15
                    : lifeFrac > 0.8  ? (1 - lifeFrac) / 0.2
                    : 1.0;

      // Twinkle: brightness oscillation
      const twinkle = 0.6 + Math.sin(t * sp.twinkleSpeed + sp.twinklePhase) * 0.4;
      const finalAlpha = sp.alpha * lifeAlpha * twinkle;

      if (finalAlpha < 0.01) continue;

      const spx = sp.x * W;
      const spy = sp.y * H;

      // Soft glow halo
      const spGlow = ctx.createRadialGradient(spx, spy, 0, spx, spy, sp.size * 5);
      spGlow.addColorStop(0,   `hsla(${sp.hue}, 90%, 85%, ${finalAlpha * 0.7})`);
      spGlow.addColorStop(0.5, `hsla(${sp.hue}, 80%, 70%, ${finalAlpha * 0.2})`);
      spGlow.addColorStop(1,   `hsla(${sp.hue}, 70%, 55%, 0)`);
      ctx.beginPath();
      ctx.arc(spx, spy, sp.size * 5, 0, Math.PI * 2);
      ctx.fillStyle = spGlow;
      ctx.fill();

      // Crisp core dot
      ctx.beginPath();
      ctx.arc(spx, spy, sp.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${sp.hue}, 100%, 92%, ${finalAlpha})`;
      ctx.fill();
    }

    // ── 4. Heartbeat Pulse Rings — expanding waves from the mandala center ────
    const now = t;
    if (now - this.lastPulseTime > 3.2) { // Fire every ~3.2 seconds
      this.pulseRings.push({ radius: 0, maxRadius: maxRadius * 2.2, alpha: 0.55, hue: pH });
      this.lastPulseTime = now;
    }
    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ring = this.pulseRings[i];
      ring.radius += maxRadius * 0.012 * (1 + emotionalEnergy * 0.3);
      ring.alpha  -= 0.008;
      if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
        this.pulseRings.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${ring.hue}, 85%, 72%, ${ring.alpha})`;
      ctx.lineWidth = 1.5 + ring.alpha * 2;
      ctx.stroke();
    }

    // ── 5. Constellation Ring ── orbiting particles around the mandala ─────────
    const constellationR = maxRadius * 1.28;
    for (let i = 0; i < this.orbitParticles.length; i++) {
      const p = this.orbitParticles[i];
      p.angle += p.speed * (1 + emotionalEnergy * 0.4);
      const orbitR = constellationR * p.orbitRadiusFraction / 0.65;
      const px = cx + Math.cos(p.angle) * orbitR;
      const py = cy + Math.sin(p.angle) * orbitR;
      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);
      glowGrad.addColorStop(0,   `hsla(${pH}, 90%, 80%, ${p.alpha * 0.6})`);
      glowGrad.addColorStop(0.5, `hsla(${p.hue}, 80%, 65%, ${p.alpha * 0.2})`);
      glowGrad.addColorStop(1,   `hsla(${p.hue}, 70%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${pH}, 95%, 88%, ${p.alpha * 0.9})`;
      ctx.fill();
      if (p.connected && i < this.orbitParticles.length - 1) {
        const next = this.orbitParticles[i + 1];
        const nextOrbitR = constellationR * next.orbitRadiusFraction / 0.65;
        const npx = cx + Math.cos(next.angle) * nextOrbitR;
        const npy = cy + Math.sin(next.angle) * nextOrbitR;
        const lineDist = Math.sqrt((npx - px) ** 2 + (npy - py) ** 2);
        if (lineDist < constellationR * 0.55) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(npx, npy);
          ctx.strokeStyle = `hsla(${pH}, 80%, 70%, ${0.06 + p.alpha * 0.08})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // ── Draw mandala layers from outer to inner ───────────────────────────────
    const totalLayers = dna.layers + Math.floor(journalDepth * 2); // More depth = more rings visible

    for (let layer = totalLayers; layer >= 0; layer--) {
      const layerFraction = layer / totalLayers;
      const r = maxRadius * (0.18 + layerFraction * 0.82);
      const layerAlpha = 0.12 + layerFraction * 0.5;
      const rotSpeed = dna.rotDir * baseSpeed * (0.6 + layerFraction * 0.8) * (layer % 2 === 0 ? 1 : -1);
      const rotation = t * rotSpeed * 0.012;

      // Alternate color between layers
      const hue = layer % 3 === 0 ? pH : layer % 3 === 1 ? sH : aH;
      const sat = 65 + Math.sin(t * 0.4 + layer) * 15;
      const lig = 45 + Math.sin(t * 0.3 + layer * 0.7) * 12;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // ── Petal arms ─────────────────────────────────────────────────────────
      for (let p = 0; p < dna.petals; p++) {
        const baseAngle = (p / dna.petals) * Math.PI * 2;

        // Each petal is a curved organic arc
        ctx.beginPath();
        const tipX = Math.cos(baseAngle) * r;
        const tipY = Math.sin(baseAngle) * r;

        // Control points for the petal curve
        const cpDist = r * (0.55 + dna.spiralTightness * 0.2);
        const cpAngle1 = baseAngle - (Math.PI / dna.petals) * 0.55;
        const cpAngle2 = baseAngle + (Math.PI / dna.petals) * 0.55;
        const cp1x = Math.cos(cpAngle1) * cpDist;
        const cp1y = Math.sin(cpAngle1) * cpDist;
        const cp2x = Math.cos(cpAngle2) * cpDist;
        const cp2y = Math.sin(cpAngle2) * cpDist;

        // Edge wave on the petal tip — dramatically breathing amplitude
        const breathDepth = 0.14 + Math.sin(t * 0.5) * 0.06 + breathExtra * 0.15;
        const wave = Math.sin(t * 0.8 + p * dna.edgeWaves) * r * breathDepth;
        const wavedTipX = tipX + Math.cos(baseAngle + Math.PI / 2) * wave;
        const wavedTipY = tipY + Math.sin(baseAngle + Math.PI / 2) * wave;

        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(cp1x, cp1y, wavedTipX, wavedTipY, cp2x, cp2y);
        ctx.bezierCurveTo(cp2x * 0.5, cp2y * 0.5, 0, 0, 0, 0);
        ctx.closePath();

        // Gradient fill per petal for depth
        const grad = ctx.createRadialGradient(0, 0, r * 0.05, tipX * 0.5, tipY * 0.5, r);
        grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${lig + 20}%, ${layerAlpha * 0.9})`);
        grad.addColorStop(0.6, `hsla(${hue}, ${sat}%, ${lig}%, ${layerAlpha * 0.6})`);
        grad.addColorStop(1, `hsla(${hue}, ${sat - 10}%, ${lig - 10}%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // ── Inner detail pattern (unique per user) ──────────────────────────────
      if (layer < 3) {
        const detailR = r * 0.4;
        if (dna.innerPattern === 'star') {
          this.drawStar(ctx, 0, 0, dna.petals, detailR, detailR * 0.45, hue, sat, lig, layerAlpha * 0.7);
        } else if (dna.innerPattern === 'rose') {
          this.drawRose(ctx, 0, 0, detailR, dna.edgeWaves, t, hue, sat, lig, layerAlpha * 0.7);
        } else {
          this.drawLaceRing(ctx, 0, 0, detailR, dna.petals * 2, t, hue, sat, lig, layerAlpha * 0.6);
        }
      }

      ctx.restore();
    }

    // ── Glowing center orb ────────────────────────────────────────────────────
    const pulse = 1 + Math.sin(t * 1.2) * (0.08 + breathExtra);
    const coreR = maxRadius * 0.07 * pulse;

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3.5);
    coreGrad.addColorStop(0,   `hsla(${pH}, 90%, 92%, 0.95)`);
    coreGrad.addColorStop(0.3, `hsla(${pH}, 80%, 70%, 0.6)`);
    coreGrad.addColorStop(0.7, `hsla(${pH}, 70%, 50%, 0.15)`);
    coreGrad.addColorStop(1,   `hsla(${pH}, 60%, 40%, 0)`);

    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Crisp bright center dot
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${pH}, 100%, 96%, 0.9)`;
    ctx.fill();
  }

  // ─── Inner Pattern Drawing Helpers ───────────────────────────────────────

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, points: number, outerR: number, innerR: number, hue: number, sat: number, lig: number, alpha: number) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lig + 10}%, ${alpha})`;
    ctx.fill();
  }

  private drawRose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petals: number, t: number, hue: number, sat: number, lig: number, alpha: number) {
    ctx.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const rho = r * Math.cos(petals * angle + t * 0.5);
      const px = x + rho * Math.cos(angle);
      const py = y + rho * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lig}%, ${alpha})`;
    ctx.fill();
  }

  private drawLaceRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, t: number, hue: number, sat: number, lig: number, alpha: number) {
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2 + t * 0.3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      const dotR = r * 0.08;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lig + 20}%, ${alpha})`;
      ctx.fill();

      // Connect with thin lines to next dot
      const nextAngle = ((i + 1) / points) * Math.PI * 2 + t * 0.3;
      const npx = x + Math.cos(nextAngle) * r;
      const npy = y + Math.sin(nextAngle) * r;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(npx, npy);
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lig}%, ${alpha * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // ─── Analytics Fetch ──────────────────────────────────────────────────────

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.isLoading.set(true);

    this.http.get<Record<string, number>>(`${environment.apiUrl}/api/memory/analytics`, {
      headers: { 'X-User-Email': email }
    }).subscribe({
      next: (data) => {
        if (!data || Object.keys(data).length === 0) {
          data = { JOY: 18, CALM: 14, SAD: 8, ANXIOUS: 6, ANGER: 3 };
        }

        const normalized: Record<string, number> = { JOY: 0, SAD: 0, ANXIOUS: 0, ANGER: 0, CALM: 0 };
        let total = 0;
        Object.entries(data).forEach(([key, count]) => {
          const k = key.toUpperCase();
          let norm = 'CALM';
          if (k.includes('JOY') || k.includes('HAPPY') || k.includes('EXCITE')) norm = 'JOY';
          else if (k.includes('SAD') || k.includes('LONELY') || k.includes('MELANCHOLY') || k.includes('NOSTALGIA')) norm = 'SAD';
          else if (k.includes('ANXIOUS') || k.includes('WORRY') || k.includes('FEAR') || k.includes('STRESS') || k.includes('NEUTRAL')) norm = 'ANXIOUS';
          else if (k.includes('ANGER') || k.includes('FRUSTRATION') || k.includes('MAD')) norm = 'ANGER';
          normalized[norm] += count;
          total += count;
        });

        this.emotionCounts.set(normalized);
        this.totalCount.set(total);
        this.isLoading.set(false);
      },
      error: () => {
        this.emotionCounts.set({ JOY: 18, CALM: 14, SAD: 8, ANXIOUS: 6, ANGER: 3 });
        this.totalCount.set(49);
        this.isLoading.set(false);
      }
    });
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MandalaGenome {
  seed: number;
  petals: number;
  layers: number;
  primaryHue: number;
  secondaryHue: number;
  accentHue: number;
  spiralTightness: number;
  edgeWaves: number;
  rotDir: number;
  innerPattern: 'star' | 'rose' | 'lace';
}

interface OrbitParticle {
  angle: number;
  orbitRadiusFraction: number;
  speed: number;
  size: number;
  hue: number;
  alpha: number;
  connected: boolean;
}

interface AmbientOrb {
  xFrac: number;
  yFrac: number;
  driftX: number;
  driftY: number;
  radiusFraction: number;
  hue: number;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface SpiritParticle {
  x: number;           // fraction of W
  y: number;           // fraction of H
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  life: number;
  maxLife: number;
}

interface PulseRing {
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
}
