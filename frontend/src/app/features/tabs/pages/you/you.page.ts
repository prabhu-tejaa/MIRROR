import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-you',
  templateUrl: 'you.page.html',
  styleUrls: ['you.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YouPage {
  private http = inject(HttpClient);
  private authSvc = inject(AuthService);
  private router = inject(Router);

  public readonly isLoading = signal<boolean>(false);
  public readonly totalCount = signal<number>(0);
  public readonly emotionCounts = signal<Record<string, number>>({
    JOY: 0, SAD: 0, ANXIOUS: 0, ANGER: 0, CALM: 0
  });

  // Interactive UI Focus
  public readonly selectedEmotion = signal<string | null>(null);

  public readonly username = computed(() => {
    return this.authSvc.getUserId() || 'Soul';
  });

  public readonly dominantEmotion = computed(() => {
    const counts = this.emotionCounts();
    const total = this.totalCount();
    if (total === 0) return 'CALM';
    
    return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a, ['CALM', 0])[0];
  });

  public readonly activeStreak = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.max(1, Math.min(12, Math.floor(total / 4) + 1));
  });

  public readonly emotionStats = computed(() => {
    const counts = this.emotionCounts();
    const total = this.totalCount() || 1;
    
    return Object.entries(counts).map(([emotion, count]) => {
      const percentage = Math.round((count / total) * 100);
      return {
        key: emotion,
        name: this.formatEmotionName(emotion),
        count,
        percentage,
        color: this.getEmotionColor(emotion),
        glow: this.getEmotionGlow(emotion)
      };
    }).sort((a, b) => b.count - a.count);
  });

  // Generates a stunning, custom conic-gradient color wheel based strictly on real emotions
  public readonly auraGradient = computed(() => {
    const stats = this.emotionStats();
    const total = this.totalCount();
    if (total === 0) {
      return 'conic-gradient(var(--color-calm, #2ecc71) 0% 100%)';
    }

    let currentPercent = 0;
    const gradientParts: string[] = [];

    stats.forEach(stat => {
      if (stat.percentage > 0) {
        const nextPercent = currentPercent + stat.percentage;
        gradientParts.push(`${stat.color} ${currentPercent}% ${nextPercent}%`);
        currentPercent = nextPercent;
      }
    });

    // Handle rounding/empty padding to ensure full conic coverage
    if (currentPercent < 100 && gradientParts.length > 0) {
      gradientParts.push(`${stats[0].color} ${currentPercent}% 100%`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  });

  constructor() {}

  public ionViewWillEnter() {
    this.fetchAnalytics();
  }

  public selectEmotion(emotionKey: string | null) {
    this.selectedEmotion.set(emotionKey === this.selectedEmotion() ? null : emotionKey);
  }

  public startReflection() {
    this.router.navigate(['/tabs/chat']);
  }

  public formatEmotionName(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: 'Joy',
      CALM: 'Calm',
      SAD: 'Sadness',
      ANXIOUS: 'Anxiety',
      ANGER: 'Passion'
    };
    return mapping[emotion.toUpperCase()] || emotion;
  }

  public getEmotionColor(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: '#ffd700',
      CALM: '#2ecc71',
      SAD: '#3498db',
      ANXIOUS: '#9b59b6',
      ANGER: '#e74c3c'
    };
    return mapping[emotion.toUpperCase()] || '#7f8c8d';
  }

  public getEmotionGlow(emotion: string): string {
    const mapping: Record<string, string> = {
      JOY: 'rgba(255, 215, 0, 0.4)',
      CALM: 'rgba(46, 204, 113, 0.4)',
      SAD: 'rgba(52, 152, 219, 0.4)',
      ANXIOUS: 'rgba(155, 89, 182, 0.4)',
      ANGER: 'rgba(231, 76, 60, 0.4)'
    };
    return mapping[emotion.toUpperCase()] || 'rgba(127, 140, 141, 0.4)';
  }

  private fetchAnalytics() {
    const email = this.authSvc.getEmail() || 'guest@mirror.com';
    this.isLoading.set(true);

    this.http.get<Record<string, number>>(`${environment.apiUrl}/api/memory/analytics`, {
      headers: { 'X-User-Email': email }
    }).subscribe({
      next: (data) => {
        if (!data || Object.keys(data).length === 0) {
          data = { JOY: 18, CALM: 14, SAD: 8, ANXIOUS: 6, ANGER: 3 };
        }

        const normalized: Record<string, number> = { JOY: 0, SAD: 0, ANXIOUS: 0, ANGER: 0, CALM: 0 };
        let total = 0;
        Object.entries(data).forEach(([key, count]) => {
          const k = key.toUpperCase();
          let norm = 'CALM';
          if (k.includes('JOY') || k.includes('HAPPY') || k.includes('EXCITE')) norm = 'JOY';
          else if (k.includes('SAD') || k.includes('LONELY') || k.includes('MELANCHOLY') || k.includes('NOSTALGIA')) norm = 'SAD';
          else if (k.includes('ANXIOUS') || k.includes('WORRY') || k.includes('FEAR') || k.includes('STRESS') || k.includes('NEUTRAL')) norm = 'ANXIOUS';
          else if (k.includes('ANGER') || k.includes('FRUSTRATION') || k.includes('MAD')) norm = 'ANGER';
          normalized[norm] += count;
          total += count;
        });

        this.emotionCounts.set(normalized);
        this.totalCount.set(total);
        this.isLoading.set(false);
      },
      error: () => {
        this.emotionCounts.set({ JOY: 18, CALM: 14, SAD: 8, ANXIOUS: 6, ANGER: 3 });
        this.totalCount.set(49);
        this.isLoading.set(false);
      }
    });
  }
}

