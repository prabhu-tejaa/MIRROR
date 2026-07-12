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
    loadAnalytics: props<{ email: string }>(),
    loadAnalyticsSuccess: props<{ data: AnalyticsResponse }>(),
    loadAnalyticsFailure: props<{ error: unknown }>(),

    loadMemories: props<{ email: string }>(),
    loadMemoriesSuccess: props<{ memories: Reflection[] }>(),
    loadMemoriesFailure: props<{ error: unknown }>(),

    clearData: emptyProps(),
  }
});
