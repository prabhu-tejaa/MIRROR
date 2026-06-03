import { StarfieldConfig, Star, Meteor, Sparkle } from './starfield.models';
import { ShapeType } from './starfield.service';

export class StarfieldPhysics {
  public static update(
    dt: number,
    width: number,
    height: number,
    stars: Star[],
    meteors: Meteor[],
    sparkles: Sparkle[],
    config: StarfieldConfig,
    targetShape: ShapeType
  ): void {
    const margin = 10;
    const now = performance.now();

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      
      if (targetShape !== 'none' && star.isTransitioning && star.targetX !== undefined && star.targetY !== undefined) {
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

      if (config.twinkle) {
        star.twinklePhase += star.twinkleSpeed;
        star.opacity = star.baseOpacity * (0.8 + 0.2 * Math.sin(star.twinklePhase));
      }

      if (
        star.x < -margin || star.x > width + margin ||
        star.y < -margin || star.y > height + margin
      ) {
        Object.assign(star, StarfieldPhysics.createStar(false, width, height, config));
      }
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * (dt / 16);
      m.y += m.vy * (dt / 16);
      m.life -= m.decay * (dt / 16);

      if (m.life > 0.2 && sparkles.length < 30 && Math.random() > 0.5) {
        sparkles.push({
          x: m.x + (Math.random() - 0.5) * 3,
          y: m.y + (Math.random() - 0.5) * 3,
          size: 0.3 + Math.random() * 0.4,
          life: 0.5 + Math.random() * 0.3,
          decay: 0.02 + Math.random() * 0.015,
        });
      }

      if (m.life <= 0) {
        meteors.splice(i, 1);
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].life -= sparkles[i].decay * (dt / 16);
      if (sparkles[i].life <= 0) {
        sparkles.splice(i, 1);
      }
    }
  }

  public static spawnMeteor(width: number, height: number, meteors: Meteor[]): void {
    const goRight = Math.random() > 0.5;
    const x = goRight
      ? Math.random() * width * 0.4
      : width * 0.6 + Math.random() * width * 0.4;
    const y = -10 + Math.random() * height * 0.25;

    const baseAngle = (25 + Math.random() * 25) * (Math.PI / 180);
    const angle = goRight ? baseAngle : Math.PI - baseAngle;
    const speed = 8 + Math.random() * 8;

    meteors.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.008 + Math.random() * 0.006,
      length: 80 + Math.random() * 100,
      width: 0.8 + Math.random() * 0.7,
    });
  }

  public static createStar(randomPosition: boolean, width: number, height: number, config: StarfieldConfig): Star {
    const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
    const opacity = config.minOpacity + Math.random() * (config.maxOpacity - config.minOpacity);
    
    const speedFactor = 0.2 + (size / config.maxSize) * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const starSpeed = config.speed * speedFactor;
    const depth = (size - config.minSize) / (config.maxSize - config.minSize);

    const x = randomPosition
      ? Math.random() * width
      : width / 2 + (Math.random() - 0.5) * width * 0.4;
    const y = randomPosition
      ? Math.random() * height
      : height / 2 + (Math.random() - 0.5) * height * 0.4;

    const starColors: string[] = [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff',
      '#cce5ff', '#b8d4ff', '#ffefc1', '#ffd6a5', '#e8d0ff', '#ffc9de',
    ];

    const color = config.colorVariety
      ? starColors[Math.floor(Math.random() * starColors.length)]
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
}
