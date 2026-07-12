export interface StarfieldConfig {
  starCount: number;
  speed: number;
  minSize: number;
  maxSize: number;
  minOpacity: number;
  maxOpacity: number;
  twinkle: boolean;
  backgroundColor: string;
  shootingStars: boolean;
  shootingStarInterval: [number, number];
  nebulaGlow: boolean;
  parallax: boolean;
  parallaxStrength: number;
  colorVariety: boolean;
  fadeInDuration: number;
  respectReducedMotion: boolean;
}

export interface Star {
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

export interface Meteor {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  length: number; width: number;
}

export interface Sparkle {
  x: number; y: number;
  size: number; life: number; decay: number;
}

export interface Nebula {
  x: number; y: number;
  radius: number; color: string;
  vx: number; vy: number;
}
