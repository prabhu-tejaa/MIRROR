import { StarfieldConfig, Star, Meteor, Sparkle } from './starfield.models';
import { StarfieldPhysics } from './starfield.physics';
import { StarfieldRenderer } from './starfield.renderer';
import { ShapeType } from './starfield.service';
import { StarfieldShapeGenerator } from './starfield.shapes';

export * from './starfield.models';

export class StarfieldEngine {
  private ctx: CanvasRenderingContext2D;
  private renderer: StarfieldRenderer;
  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private sparkles: Sparkle[] = [];
  
  private animationId: number = 0;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private resizeObserver: ResizeObserver;
  
  private reducedMotion: boolean = false;
  private paused: boolean = false;
  private fadeStart: number = 0;
  private targetShape: ShapeType = 'none';
  private pointerX: number = 0;
  private pointerY: number = 0;
  private meteorTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastTime: number = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private config: StarfieldConfig
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new StarfieldRenderer(this.ctx, this.dpr);

    if (this.config.respectReducedMotion) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    this.resize();
    this.initStars();
    this.renderer.renderNebulaLayer(this.width, this.height, this.config);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.renderer.renderNebulaLayer(this.width, this.height, this.config);
    });
    this.resizeObserver.observe(canvas.parentElement as HTMLElement);

    this.fadeStart = performance.now();

    if (this.config.shootingStars && !this.reducedMotion) {
      this.scheduleMeteor();
    }

    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public updateConfig(newConfig: Partial<StarfieldConfig>): void {
    const oldStarCount: number = this.config.starCount;
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.starCount !== undefined && newConfig.starCount !== oldStarCount) {
      this.initStars();
    }
  }

  public setTargetShape(type: ShapeType): void {
    this.targetShape = type;
    StarfieldShapeGenerator.applyShape(this.stars, type, this.width, this.height);
  }

  public onMouseMove(clientX: number, clientY: number): void {
    if (!this.config.parallax) {return;}
    this.pointerX = (clientX / this.width - 0.5) * 2;
    this.pointerY = (clientY / this.height - 0.5) * 2;
  }

  public pause(): void {
    this.paused = true;
    cancelAnimationFrame(this.animationId);
    if (this.meteorTimeout) {clearTimeout(this.meteorTimeout);}
  }

  public resume(): void {
    this.paused = false;
    this.lastTime = performance.now();
    this.animate(this.lastTime);
    if (this.config.shootingStars && !this.reducedMotion) {
      this.scheduleMeteor();
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    if (this.meteorTimeout) {clearTimeout(this.meteorTimeout);}
  }

  private resize(): void {
    const parent: HTMLElement = this.canvas.parentElement as HTMLElement;
    const oldWidth: number = this.width;
    const oldHeight: number = this.height;
    
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (oldWidth > 0 && oldHeight > 0) {
      const scaleX: number = this.width / oldWidth;
      const scaleY: number = this.height / oldHeight;
      for (const star: Star of this.stars) {
        star.x *= scaleX;
        star.y *= scaleY;
        if (star.targetX !== undefined) {star.targetX *= scaleX;}
        if (star.targetY !== undefined) {star.targetY *= scaleY;}
      }
    }
  }

  private initStars(): void {
    this.stars = [];
    for (let i: number = 0; i < this.config.starCount; i++) {
      this.stars.push(StarfieldPhysics.createStar(true, this.width, this.height, this.config));
    }
  }

  private scheduleMeteor(): void {
    const [min, max]: any = this.config.shootingStarInterval;
    const delay: any = min + Math.random() * (max - min);
    this.meteorTimeout = setTimeout(() => {
      StarfieldPhysics.spawnMeteor(this.width, this.height, this.meteors);
      this.scheduleMeteor();
    }, delay);
  }

  private animate: (now: number) => void = (now: number): void => {
    if (this.paused) {return;}
    
    const dt: number = Math.min(now - this.lastTime, 100); 
    this.lastTime = now;

    let globalAlpha: number = 1;
    if (this.config.fadeInDuration > 0) {
      const elapsed: number = now - this.fadeStart;
      globalAlpha = Math.min(1, elapsed / this.config.fadeInDuration);
    }

    this.renderer.draw(
      this.width, this.height, 
      this.stars, this.meteors, this.sparkles, 
      this.config, globalAlpha, 
      this.pointerX, this.pointerY
    );

    if (!this.reducedMotion) {
      StarfieldPhysics.update(
        dt, this.width, this.height, 
        this.stars, this.meteors, this.sparkles, 
        this.config, this.targetShape
      );
    }
    
    this.animationId = requestAnimationFrame(this.animate);
  };
}
