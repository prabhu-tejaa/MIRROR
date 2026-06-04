import { ShapeType } from './starfield.service';
import { Star } from './starfield.models';

export class StarfieldShapeGenerator {
  public static applyShape(stars: Star[], type: ShapeType, width: number, height: number): void {
    if (type === 'none') {
      for (const star of stars) {
        star.isTransitioning = false;
        star.transitionProgress = 0;
        star.vx += (Math.random() - 0.5) * 0.4;
        star.vy += (Math.random() - 0.5) * 0.4;
        star.color = star.originalColor || star.color;
      }
      return;
    }

    const CX = width / 2;
    const CY = height / 2;
    let S = Math.min(width, height) / 45;

    if (height > width) {
      S = width / 34;
    }

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const t = Math.random() * Math.PI * 2;
      let xBase = 0;
      let yBase = 0;
      let rScale = 0.6 + Math.random() * 0.5;

      switch (type) {
        case 'heart': {
          xBase = 16 * Math.pow(Math.sin(t), 3);
          yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          yBase *= -1;
          // Make the outline thinner and more elegant
          rScale = 0.92 + Math.random() * 0.15; 
          break;
        }
        case 'circle': {
          xBase = 20 * Math.cos(t);
          yBase = 20 * Math.sin(t);
          break;
        }
        case 'square': {
          const side = Math.floor(Math.random() * 4);
          const pos = Math.random() * 40 - 20;
          if (side === 0) { xBase = pos; yBase = -20; }
          else if (side === 1) { xBase = 20; yBase = pos; }
          else if (side === 2) { xBase = pos; yBase = 20; }
          else { xBase = -20; yBase = pos; }
          rScale = 0.95 + Math.random() * 0.1;
          break;
        }
        case 'star': {
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
        }
        case 'smiley': {
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
        default:
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
}
