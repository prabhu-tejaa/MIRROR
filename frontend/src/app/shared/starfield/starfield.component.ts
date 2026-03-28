import {
  Component,
  Input,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  NgZone,
  HostListener,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { StarfieldService } from './starfield.service';

@Component({
  selector: 'app-starfield',
  standalone: true,
  templateUrl: './starfield.component.html',
  styleUrls: ['./starfield.component.scss'],
})
export class StarfieldComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() starCount = 100;
  @Input() speed = 0.05;
  @Input() minSize = 0.2;
  @Input() maxSize = 1.2;
  @Input() minOpacity = 0.4;
  @Input() maxOpacity = 1;
  @Input() twinkle = true;
  @Input() backgroundColor = '#000000';
  @Input() shootingStars = false;
  @Input() shootingStarInterval: [number, number] = [6000, 14000];
  @Input() nebulaGlow = true;
  @Input() parallax = false;
  @Input() parallaxStrength = 12;
  @Input() colorVariety = true;
  @Input() fadeInDuration = 1500;
  @Input() respectReducedMotion = true;

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private sparkles: Sparkle[] = [];
  private animationId = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private resizeObserver!: ResizeObserver;
  private reducedMotion = false;
  private fadeStart = 0;
  private paused = false;
  private visibilityHandler = () => this.onVisibilityChange();

  private targetShape: 'none' | 'heart' = 'none';
  private sub1!: Subscription;
  private sub2!: Subscription;

  private pointerX = 0;
  private pointerY = 0;

  private nebulae: Nebula[] = [];
  private nebulaCanvas!: HTMLCanvasElement; 
  private meteorTimeout: any;

  private readonly STAR_COLORS = [
    '#ffffff', '#ffffff', '#ffffff', '#ffffff',
    '#cce5ff', '#b8d4ff', '#ffefc1', '#ffd6a5', '#e8d0ff', '#ffc9de',
  ];

  constructor(private ngZone: NgZone, private starfieldSvc: StarfieldService) {}

  ngOnInit(): void {
    this.sub1 = this.starfieldSvc.formHeart$.subscribe(() => {
      this.targetShape = 'heart';
      const CX = this.width / 2;
      const CY = this.height / 2;
      const S = Math.min(this.width, this.height) / 45;

      for (let star of this.stars) {
        const t = Math.random() * Math.PI * 2;
        const rScale = 0.6 + Math.random() * 0.5;
        const xBase = 16 * Math.pow(Math.sin(t), 3);
        const yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

        star.targetX = CX + S * xBase * rScale;
        star.targetY = CY - S * yBase * rScale;
        star.isTransitioning = true;
      }
    });

    this.sub2 = this.starfieldSvc.disperse$.subscribe(() => {
      this.targetShape = 'none';
      for (let star of this.stars) {
        star.isTransitioning = false;
        star.vx += (Math.random() - 0.5) * 0.4;
        star.vy += (Math.random() - 0.5) * 0.4;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.respectReducedMotion) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); 
    this.resize();
    this.initStars();
    this.renderNebulaLayer();

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.renderNebulaLayer();
    });
    this.resizeObserver.observe(canvas.parentElement!);

    this.fadeStart = performance.now();

    if (this.shootingStars && !this.reducedMotion) {
      this.scheduleMeteor();
    }

    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnDestroy(): void {
    if (this.sub1) this.sub1.unsubscribe();
    if (this.sub2) this.sub2.unsubscribe();
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    clearTimeout(this.meteorTimeout);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.paused = true;
      cancelAnimationFrame(this.animationId);
      clearTimeout(this.meteorTimeout);
    } else {
      this.paused = false;
      this.ngZone.runOutsideAngular(() => this.animate());
      if (this.shootingStars && !this.reducedMotion) {
        this.scheduleMeteor();
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.parallax) return;
    this.pointerX = (e.clientX / this.width - 0.5) * 2;
    this.pointerY = (e.clientY / this.height - 0.5) * 2;
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.parallax || !e.touches.length) return;
    const t = e.touches[0];
    this.pointerX = (t.clientX / this.width - 0.5) * 2;
    this.pointerY = (t.clientY / this.height - 0.5) * 2;
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const oldWidth = this.width;
    const oldHeight = this.height;
    
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    canvas.style.width = this.width + 'px';
    canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Scale existing stars to fill the new dimensions
    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX = this.width / oldWidth;
      const scaleY = this.height / oldHeight;
      
      for (const star of this.stars) {
        star.x *= scaleX;
        star.y *= scaleY;
        if (star.targetX !== undefined) star.targetX *= scaleX;
        if (star.targetY !== undefined) star.targetY *= scaleY;
      }
    }
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this.createStar(true));
    }
  }

  private createStar(randomPosition: boolean): Star {
    const size = this.minSize + Math.random() * (this.maxSize - this.minSize);
    const opacity = this.minOpacity + Math.random() * (this.maxOpacity - this.minOpacity);
    
    const speedFactor = 0.2 + (size / this.maxSize) * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const starSpeed = this.speed * speedFactor;
    const depth = (size - this.minSize) / (this.maxSize - this.minSize);

    const x = randomPosition
      ? Math.random() * this.width
      : this.width / 2 + (Math.random() - 0.5) * this.width * 0.4;
    const y = randomPosition
      ? Math.random() * this.height
      : this.height / 2 + (Math.random() - 0.5) * this.height * 0.4;

    const color = this.colorVariety
      ? this.STAR_COLORS[Math.floor(Math.random() * this.STAR_COLORS.length)]
      : '#ffffff';

    return {
      x, y, size, baseOpacity: opacity, opacity, color, depth,
      vx: Math.cos(angle) * starSpeed,
      vy: Math.sin(angle) * starSpeed,
      twinkleSpeed: 0.002 + Math.random() * 0.008,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  private renderNebulaLayer(): void {
    if (!this.nebulaGlow) return;

    this.nebulaCanvas = document.createElement('canvas');
    this.nebulaCanvas.width = this.width * this.dpr;
    this.nebulaCanvas.height = this.height * this.dpr;
    const nCtx = this.nebulaCanvas.getContext('2d')!;
    nCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const colors = [
      'rgba(60, 20, 120, 0.045)',
      'rgba(20, 60, 130, 0.04)',
      'rgba(15, 80, 90, 0.035)',
      'rgba(90, 20, 60, 0.03)',
    ];

    this.nebulae = [];
    for (let i = 0; i < 4; i++) {
      const n = {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 200 + Math.random() * 300,
        color: colors[i],
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
      };
      this.nebulae.push(n);

      const gradient = nCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      gradient.addColorStop(0, n.color);
      gradient.addColorStop(1, 'transparent');
      nCtx.fillStyle = gradient;
      nCtx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
    }
  }

  private scheduleMeteor(): void {
    const [min, max] = this.shootingStarInterval;
    const delay = min + Math.random() * (max - min);
    this.meteorTimeout = setTimeout(() => {
      this.spawnMeteor();
      this.scheduleMeteor();
    }, delay);
  }

  private spawnMeteor(): void {
    const goRight = Math.random() > 0.5;
    const x = goRight
      ? Math.random() * this.width * 0.4
      : this.width * 0.6 + Math.random() * this.width * 0.4;
    const y = -10 + Math.random() * this.height * 0.25;

    const baseAngle = (25 + Math.random() * 25) * (Math.PI / 180);
    const angle = goRight ? baseAngle : Math.PI - baseAngle;
    const speed = 8 + Math.random() * 8;

    this.meteors.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.008 + Math.random() * 0.006,
      length: 80 + Math.random() * 100,
      width: 0.8 + Math.random() * 0.7,
    });
  }

  private animate = (): void => {
    if (this.paused) return;
    this.draw();
    if (!this.reducedMotion) {
      this.update();
    }
    this.animationId = requestAnimationFrame(this.animate);
  };

  private draw(): void {
    const { ctx, width, height } = this;

    let globalAlpha = 1;
    if (this.fadeInDuration > 0) {
      const elapsed = performance.now() - this.fadeStart;
      globalAlpha = Math.min(1, elapsed / this.fadeInDuration);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (this.nebulaGlow && this.nebulaCanvas) {
      ctx.globalAlpha = globalAlpha;
      ctx.drawImage(this.nebulaCanvas, 0, 0, width, height);
    }

    const px = this.parallax ? this.pointerX * this.parallaxStrength : 0;
    const py = this.parallax ? this.pointerY * this.parallaxStrength : 0;

    for (const star of this.stars) {
      const drawX = star.x + px * star.depth;
      const drawY = star.y + py * star.depth;

      ctx.globalAlpha = globalAlpha * star.opacity;
      ctx.fillStyle = star.color;
      
      // Use simpler rect for stars
      ctx.fillRect(
        drawX - star.size,
        drawY - star.size,
        star.size * 2,
        star.size * 2
      );
    }

    this.drawMeteors(globalAlpha);
    ctx.globalAlpha = 1;
  }

  private drawMeteors(globalAlpha: number): void {
    const { ctx } = this;

    for (const s of this.sparkles) {
      ctx.globalAlpha = s.life * globalAlpha * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
    }

    for (const m of this.meteors) {
      const speed = Math.hypot(m.vx, m.vy);
      const dirX = m.vx / speed;
      const dirY = m.vy / speed;
      const tailX = m.x - dirX * m.length;
      const tailY = m.y - dirY * m.length;

      const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${m.life * globalAlpha})`);
      gradient.addColorStop(0.3, `rgba(200, 220, 255, ${m.life * 0.6 * globalAlpha})`);
      gradient.addColorStop(1, 'rgba(180, 160, 255, 0)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = m.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.globalAlpha = m.life * 0.9 * globalAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private update(): void {
    const margin = 10;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      
      if (this.targetShape === 'heart' && star.isTransitioning && star.targetX !== undefined && star.targetY !== undefined) {
        star.x += (star.targetX - star.x) * 0.04;
        star.y += (star.targetY - star.y) * 0.04;
      } else {
        star.x += star.vx;
        star.y += star.vy;
      }

      if (this.twinkle) {
        star.twinklePhase += star.twinkleSpeed;
        star.opacity = star.baseOpacity * (0.8 + 0.2 * Math.sin(star.twinklePhase));
      }

      if (
        star.x < -margin || star.x > this.width + margin ||
        star.y < -margin || star.y > this.height + margin
      ) {
        this.stars[i] = this.createStar(false);
      }
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= m.decay;

      if (m.life > 0.2 && this.sparkles.length < 30 && Math.random() > 0.5) {
        this.sparkles.push({
          x: m.x + (Math.random() - 0.5) * 3,
          y: m.y + (Math.random() - 0.5) * 3,
          size: 0.3 + Math.random() * 0.4,
          life: 0.5 + Math.random() * 0.3,
          decay: 0.02 + Math.random() * 0.015,
        });
      }

      if (m.life <= 0) {
        this.meteors.splice(i, 1);
      }
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      this.sparkles[i].life -= this.sparkles[i].decay;
      if (this.sparkles[i].life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }
}

interface Star {
  x: number; y: number; size: number;
  baseOpacity: number; opacity: number;
  color: string; depth: number;
  vx: number; vy: number;
  twinkleSpeed: number; twinklePhase: number;
  targetX?: number; targetY?: number;
  isTransitioning?: boolean;
}

interface Meteor {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  length: number; width: number;
}

interface Sparkle {
  x: number; y: number;
  size: number; life: number; decay: number;
}

interface Nebula {
  x: number; y: number;
  radius: number; color: string;
  vx: number; vy: number;
}
