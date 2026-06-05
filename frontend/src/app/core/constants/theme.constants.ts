export const THEME_COLORS = {
  emotions: {
    JOY: { primary: '#ffb700', secondary: '#ff5e00', fallbackName: 'Joy' },
    HAPPY: { primary: '#ffb700', secondary: '#ff5e00', fallbackName: 'Joy' },
    EXCITE: { primary: '#ffb700', secondary: '#ff5e00', fallbackName: 'Joy' },
    SAD: { primary: '#00ffd5', secondary: '#0099ff', fallbackName: 'Sad' },
    LONELY: { primary: '#00ffd5', secondary: '#0099ff', fallbackName: 'Sad' },
    MELANCHOLY: { primary: '#00ffd5', secondary: '#0099ff', fallbackName: 'Sad' },
    NOSTALGIA: { primary: '#00ffd5', secondary: '#0099ff', fallbackName: 'Sad' },
    ANXIOUS: { primary: '#a855f7', secondary: '#06b6d4', fallbackName: 'Anxious' },
    WORRY: { primary: '#a855f7', secondary: '#06b6d4', fallbackName: 'Anxious' },
    FEAR: { primary: '#a855f7', secondary: '#06b6d4', fallbackName: 'Anxious' },
    STRESS: { primary: '#a855f7', secondary: '#06b6d4', fallbackName: 'Anxious' },
    ANGER: { primary: '#ff0055', secondary: '#e11d48', fallbackName: 'Anger' },
    FRUSTRATION: { primary: '#ff0055', secondary: '#e11d48', fallbackName: 'Anger' },
    MAD: { primary: '#ff0055', secondary: '#e11d48', fallbackName: 'Anger' },
    CREATIVITY: { primary: '#10b981', secondary: '#06b6d4', fallbackName: 'Calm' },
    FOCUS: { primary: '#10b981', secondary: '#06b6d4', fallbackName: 'Calm' },
    CALM: { primary: '#10b981', secondary: '#06b6d4', fallbackName: 'Calm' },
    INSIGHT: { primary: '#10b981', secondary: '#06b6d4', fallbackName: 'Calm' },
    DEFAULT: { primary: '#7928ca', secondary: '#ff0080', fallbackName: 'Neutral' },
  }
};

export function getEmotionColors(emotionText: string): { primary: string, secondary: string, name: string } {
  const e: string = (emotionText || '').toUpperCase();
  for (const [key, value]: any of Object.entries(THEME_COLORS.emotions)) {
    if (e.includes(key)) {
      return { primary: value.primary, secondary: value.secondary, name: value.fallbackName };
    }
  }
  return { primary: THEME_COLORS.emotions.DEFAULT.primary, secondary: THEME_COLORS.emotions.DEFAULT.secondary, name: THEME_COLORS.emotions.DEFAULT.fallbackName };
}
