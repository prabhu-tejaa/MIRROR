import { Component, Input, OnDestroy, ElementRef, ViewChild, AfterViewInit, OnInit, NgZone, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ShapeType, StarfieldService } from './starfield.service';

@Component({
  selector: 'app-starfield',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './starfield.component.html',
  styleUrls: ['./starfield.component.scss'],
})
export class StarfieldComponent implements OnInit, AfterViewInit, OnDestroy {
  private ngZone = inject(NgZone);
  private starfieldSvc = inject(StarfieldService);

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
  private lastTime = 0;
  private paused = false;
  private visibilityHandler = () => this.onVisibilityChange();

  private targetShape: ShapeType = 'none';
  private shapeSub!: Subscription;

  private pointerX = 0;
  private pointerY = 0;

  private nebulae: Nebula[] = [];
  private nebulaCanvas!: HTMLCanvasElement; 
  private meteorTimeout: any;

  private readonly STAR_COLORS = [
    '#ffffff', '#ffffff', '#ffffff', '#ffffff',
    '#cce5ff', '#b8d4ff', '#ffefc1', '#ffd6a5', '#e8d0ff', '#ffc9de',
  ];

  ngOnInit(): void {
    this.shapeSub = this.starfieldSvc.shape$.subscribe((type: ShapeType) => {
      this.setTargetShape(type);
    });
  }

  private setTargetShape(type: ShapeType) {
    this.targetShape = type;
    if (type === 'none') {
      for (let star of this.stars) {
        star.isTransitioning = false;
        star.transitionProgress = 0;
        star.vx += (Math.random() - 0.5) * 0.4;
        star.vy += (Math.random() - 0.5) * 0.4;
        star.color = star.originalColor || star.color;
      }
      return;
    }

    const CX = this.width / 2;
    const CY = this.height / 2;
    const S = Math.min(this.width, this.height) / 45;

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const t = Math.random() * Math.PI * 2;
      let xBase = 0;
      let yBase = 0;
      let rScale = 0.6 + Math.random() * 0.5;

      switch (type) {
        case 'heart':
          xBase = 16 * Math.pow(Math.sin(t), 3);
          yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          yBase *= -1; // Correct orientation
          break;
        case 'circle':
          xBase = 20 * Math.cos(t);
          yBase = 20 * Math.sin(t);
          break;
        case 'square':
          const side = Math.floor(Math.random() * 4);
          const pos = Math.random() * 40 - 20;
          if (side === 0) { xBase = pos; yBase = -20; }
          else if (side === 1) { xBase = 20; yBase = pos; }
          else if (side === 2) { xBase = pos; yBase = 20; }
          else { xBase = -20; yBase = pos; }
          rScale = 0.95 + Math.random() * 0.1;
          break;
        case 'star':
          const spikes = 5;
          const outerRadius = 22;
          const innerRadius = 10;
          const rot = Math.PI / 2 * 3;
          const step = Math.PI / spikes;
          const pointIndex = Math.floor(Math.random() * (spikes * 2));
          const pointT = pointIndex * step + rot;
          const nextT = (pointIndex + 1) * step + rot;
          const r1 = (pointIndex % 2 === 0) ? outerRadius : innerRadius;
          const r2 = (pointIndex % 2 === 0) ? innerRadius : outerRadius;
          const lerp = Math.random();
          xBase = (r1 * Math.cos(pointT)) + (r2 * Math.cos(nextT) - r1 * Math.cos(pointT)) * lerp;
          yBase = (r1 * Math.sin(pointT)) + (r2 * Math.sin(nextT) - r1 * Math.sin(pointT)) * lerp;
          rScale = 0.9 + Math.random() * 0.2;
          break;
        case 'smiley':
          const part = Math.random();
          if (part < 0.6) {
            xBase = 20 * Math.cos(t);
            yBase = 20 * Math.sin(t);
          } else if (part < 0.7) {
            xBase = -7 + (Math.random() - 0.5) * 2;
            yBase = -7 + (Math.random() - 0.5) * 2;
          } else if (part < 0.8) {
            xBase = 7 + (Math.random() - 0.5) * 2;
            yBase = -7 + (Math.random() - 0.5) * 2;
          } else {
            const mouthT = Math.PI * 0.2 + Math.random() * Math.PI * 0.6;
            xBase = 12 * Math.cos(mouthT);
            yBase = 12 * Math.sin(mouthT);
          }
          break;
      }

      star.startX = star.x;
      star.startY = star.y;
      star.targetX = CX + S * xBase * rScale;
      star.targetY = CY + S * yBase * rScale;
      star.transitionProgress = 0;
      star.transitionDelay = Math.random() * 800;
      star.transitionDuration = 1200 + Math.random() * 1000;
      star.isTransitioning = true;
      const dx = star.targetX - star.startX;
      const dy = star.targetY - star.startY;
      const dist = Math.hypot(dx, dy);
      star.curveX = (-dy / dist) * (20 + Math.random() * 40);
      star.curveY = (dx / dist) * (20 + Math.random() * 40);
      if (Math.random() > 0.5) {
        star.curveX *= -1;
        star.curveY *= -1;
      }
    }
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
    this.lastTime = performance.now();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  ngOnDestroy(): void {
    if (this.shapeSub) this.shapeSub.unsubscribe();
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
      this.lastTime = performance.now();
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
      originalColor: color,
      transitionProgress: 0,
      transitionDuration: 0,
      transitionDelay: 0
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
    
    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 100); 
    this.lastTime = now;

    this.draw();
    if (!this.reducedMotion) {
      this.update(dt);
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

  private update(dt: number): void {
    const margin = 10;
    const now = performance.now();

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      
      if (this.targetShape !== 'none' && star.isTransitioning && star.targetX !== undefined && star.targetY !== undefined) {
        if (star.transitionDelay > 0) {
          star.transitionDelay -= dt;
          star.x += star.vx * (dt / 16);
          star.y += star.vy * (dt / 16);
        } else {
          star.transitionProgress = Math.min(1, (star.transitionProgress || 0) + dt / star.transitionDuration!);
          
          const t = star.transitionProgress;
          const ease = 1 - Math.pow(1 - t, 3);
          
          const baseX = star.startX! + (star.targetX - star.startX!) * ease;
          const baseY = star.startY! + (star.targetY - star.startY!) * ease;
          
          const curveMagnitude = Math.sin(t * Math.PI) * (1 - t);
          star.x = baseX + (star.curveX || 0) * curveMagnitude;
          star.y = baseY + (star.curveY || 0) * curveMagnitude;

          star.color = star.originalColor || star.color;

          if (t >= 1) {
            const pulse = Math.sin(now / 400 + i) * 1.5;
            star.x = star.targetX + (Math.cos(now / 1000 + i * 0.5) * 2);
            star.y = star.targetY + pulse;
          }
        }
      } else {
        star.x += star.vx * (dt / 16);
        star.y += star.vy * (dt / 16);
        star.color = star.originalColor || star.color;
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
      m.x += m.vx * (dt / 16);
      m.y += m.vy * (dt / 16);
      m.life -= m.decay * (dt / 16);

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
      this.sparkles[i].life -= this.sparkles[i].decay * (dt / 16);
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
  startX?: number; startY?: number;
  curveX?: number; curveY?: number;
  transitionProgress?: number;
  transitionDuration?: number;
  transitionDelay: number;
  isTransitioning?: boolean;
  originalColor?: string;
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
