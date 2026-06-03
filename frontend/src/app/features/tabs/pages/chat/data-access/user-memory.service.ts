import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../../../../../core/services/api.service';

export interface Reflection {
  content: string;
  emotion: string;
  createdAt: string;
  sender?: string;
}

export interface EmotionStat {
  key: string;
  pillar: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  count: number;
  percentage: number;
}

export interface AnalyticsResponse {
  totalMemories: number;
  dominantEmotion: string;
  activeStreak: number;
  emotionStats: EmotionStat[];
  auraGradient: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserMemoryService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);

  // Cached state to survive component destruction
  private cachedAnalytics: AnalyticsResponse | null = null;
  private cachedMemories: Reflection[] | null = null;
  private dataLoadedOnce = false;

  public getAnalyticsCached(): AnalyticsResponse | null {
    return this.cachedAnalytics;
  }

  public getMemoriesCached(): Reflection[] | null {
    return this.cachedMemories;
  }

  public isDataLoadedOnce(): boolean {
    return this.dataLoadedOnce;
  }

  public setDataLoadedOnce(loaded: boolean): void {
    this.dataLoadedOnce = loaded;
  }

  public clearCache(): void {
    this.cachedAnalytics = null;
    this.cachedMemories = null;
    this.dataLoadedOnce = false;
  }

  public getAnalytics(_email: string): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(this.apiSvc.USER_MEMORY.ANALYTICS).pipe(
      tap(data => this.cachedAnalytics = data)
    );
  }

  public getAllMemories(_email: string): Observable<Reflection[]> {
    return this.http.get<Reflection[]>(this.apiSvc.USER_MEMORY.ALL).pipe(
      tap(data => this.cachedMemories = data)
    );
  }
}
