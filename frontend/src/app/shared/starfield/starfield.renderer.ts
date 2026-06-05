import { StarfieldConfig, Star, Meteor, Sparkle, Nebula } from './starfield.models';

export class StarfieldRenderer {
  private nebulaCanvas: HTMLCanvasElement | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private dpr: number
  ) {}

  public renderNebulaLayer(width: number, height: number, config: StarfieldConfig): void {
    if (!config.nebulaGlow) {
      this.nebulaCanvas = null;
      return;
    }

    this.nebulaCanvas = document.createElement('canvas');
    this.nebulaCanvas.width = width * this.dpr;
    this.nebulaCanvas.height = height * this.dpr;
    const nCtx: CanvasRenderingContext2D = this.nebulaCanvas.getContext('2d') as CanvasRenderingContext2D;
    nCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const nebulaColors: string[] = [
      'rgba(60, 20, 120, 0.045)',
      'rgba(20, 60, 130, 0.04)',
      'rgba(15, 80, 90, 0.035)',
      'rgba(90, 20, 60, 0.03)',
    ];

    for (let i: number = 0; i < 4; i++) {
      const n: Nebula = {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 200 + Math.random() * 300,
        color: nebulaColors[i],
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
      };

      const gradient: CanvasGradient = nCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      gradient.addColorStop(0, n.color);
      gradient.addColorStop(1, 'transparent');
      nCtx.fillStyle = gradient;
      nCtx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
    }
  }

  public draw(
    width: number, height: number, 
    stars: Star[], meteors: Meteor[], sparkles: Sparkle[], 
    config: StarfieldConfig, globalAlpha: number,
    pointerX: number, pointerY: number
  ): void {
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = config.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    if (config.nebulaGlow && this.nebulaCanvas) {
      this.ctx.globalAlpha = globalAlpha;
      this.ctx.drawImage(this.nebulaCanvas, 0, 0, width, height);
    }

    const px: number = config.parallax ? pointerX * config.parallaxStrength : 0;
    const py: number = config.parallax ? pointerY * config.parallaxStrength : 0;

    for (const star: Star of stars) {
      const drawX: number = star.x + px * star.depth;
      const drawY: number = star.y + py * star.depth;

      this.ctx.globalAlpha = globalAlpha * star.opacity;
      this.ctx.fillStyle = star.color;
      
      this.ctx.fillRect(
        drawX - star.size,
        drawY - star.size,
        star.size * 2,
        star.size * 2
      );
    }

    this.drawMeteors(meteors, sparkles, globalAlpha);
    this.ctx.globalAlpha = 1;
  }

  private drawMeteors(meteors: Meteor[], sparkles: Sparkle[], globalAlpha: number): void {
    for (const s: Sparkle of sparkles) {
      this.ctx.globalAlpha = s.life * globalAlpha * 0.7;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(s.x - s.size, s.y - s.size, s.size * 2, s.size * 2);
    }

    for (const m: Meteor of meteors) {
      const speed: number = Math.hypot(m.vx, m.vy);
      const dirX: number = m.vx / speed;
      const dirY: number = m.vy / speed;
      const tailX: number = m.x - dirX * m.length;
      const tailY: number = m.y - dirY * m.length;

      const gradient: CanvasGradient = this.ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${m.life * globalAlpha})`);
      gradient.addColorStop(0.3, `rgba(200, 220, 255, ${m.life * 0.6 * globalAlpha})`);
      gradient.addColorStop(1, 'rgba(180, 160, 255, 0)');

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = m.width;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(tailX, tailY);
      this.ctx.stroke();

      this.ctx.globalAlpha = m.life * 0.9 * globalAlpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(m.x, m.y, m.width * 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
