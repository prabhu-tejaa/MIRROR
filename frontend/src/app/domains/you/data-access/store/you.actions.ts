import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface EmotionStat {
  key: string;
  pillar: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  count: number;
  percentage: number;
}

export interface Reflection {
  content: string;
  emotion: string;
  createdAt: string;
  sender?: string;
  originalEmotionName?: string;
}

export interface AnalyticsResponse {
  totalMemories: number;
  dominantEmotion: string;
  activeStreak: number;
  emotionStats: EmotionStat[];
  auraGradient: string;
}

export const YouActions = createActionGroup({
  source: 'You',
  events: {
    'Load Analytics': props<{ email: string }>(),
    'Load Analytics Success': props<{ data: AnalyticsResponse }>(),
    'Load Analytics Failure': props<{ error: unknown }>(),
    
    'Load Memories': props<{ email: string }>(),
    'Load Memories Success': props<{ memories: Reflection[] }>(),
    'Load Memories Failure': props<{ error: unknown }>(),
    
    'Clear Data': emptyProps(),
  }
});
