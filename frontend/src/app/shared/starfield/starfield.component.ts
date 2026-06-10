
import { Component, Input, OnDestroy, ElementRef, ViewChild, AfterViewInit, OnInit, NgZone, HostListener, inject, OnChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import { StarfieldEngine, StarfieldConfig } from './starfield.engine';
import { ShapeType, StarfieldService } from './starfield.service';

@Component({
  selector: 'app-starfield',
  standalone: true,
  imports: [],
  templateUrl: './starfield.component.html',
  styleUrls: ['./starfield.component.scss'],
})
export class StarfieldComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  private ngZone: NgZone = inject(NgZone);
  private starfieldSvc: StarfieldService = inject(StarfieldService);

  @Input() public starCount: number = 100;
  @Input() public speed: number = 0.05;
  @Input() public minSize: number = 0.2;
  @Input() public maxSize: number = 1.2;
  @Input() public minOpacity: number = 0.4;
  @Input() public maxOpacity: number = 1;
  @Input() public twinkle: boolean = true;
  @Input() public backgroundColor: string = '#000000';
  @Input() public shootingStars: boolean = false;
  @Input() public shootingStarInterval: [number, number] = [6000, 14000];
  @Input() public nebulaGlow: boolean = true;
  @Input() public parallax: boolean = false;
  @Input() public parallaxStrength: number = 12;
  @Input() public colorVariety: boolean = true;
  @Input() public fadeInDuration: number = 1500;
  @Input() public respectReducedMotion: boolean = true;

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private engine!: StarfieldEngine;
  private shapeSub!: Subscription;
  private visibilityHandler: () => void = () => this.onVisibilityChange();

  public ngOnInit(): void {
    this.shapeSub = this.starfieldSvc.shape$.subscribe((type: ShapeType) => {
      if (this.engine) {
        this.engine.setTargetShape(type);
      }
    });
  }

  public ngAfterViewInit(): void {
    const config: StarfieldConfig = this.getConfig();
    
    this.ngZone.runOutsideAngular(() => {
      this.engine = new StarfieldEngine(this.canvasRef.nativeElement, config);
    });

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  public ngOnChanges(): void {
    if (this.engine) {
      this.engine.updateConfig(this.getConfig());
    }
  }

  public ngOnDestroy(): void {
    if (this.shapeSub) {
      this.shapeSub.unsubscribe();
    }
    if (this.engine) {
      this.engine.destroy();
    }
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  @HostListener('window:mousemove', ['$event'])
  public onMouseMove(e: MouseEvent): void {
    if (this.engine) {
      this.engine.onMouseMove(e.clientX, e.clientY);
    }
  }

  @HostListener('window:touchmove', ['$event'])
  public onTouchMove(e: TouchEvent): void {
    if (this.engine && e.touches.length > 0) {
      const t: Touch = e.touches[0];
      this.engine.onMouseMove(t.clientX, t.clientY);
    }
  }

  private onVisibilityChange(): void {
    if (!this.engine) {return;}
    
    if (document.hidden) {
      this.engine.pause();
    } else {
      this.ngZone.runOutsideAngular(() => this.engine.resume());
    }
  }

  private getConfig(): StarfieldConfig {
    return {
      starCount: this.starCount,
      speed: this.speed,
      minSize: this.minSize,
      maxSize: this.maxSize,
      minOpacity: this.minOpacity,
      maxOpacity: this.maxOpacity,
      twinkle: this.twinkle,
      backgroundColor: this.backgroundColor,
      shootingStars: this.shootingStars,
      shootingStarInterval: this.shootingStarInterval,
      nebulaGlow: this.nebulaGlow,
      parallax: this.parallax,
      parallaxStrength: this.parallaxStrength,
      colorVariety: this.colorVariety,
      fadeInDuration: this.fadeInDuration,
      respectReducedMotion: this.respectReducedMotion,
    };
  }
}
