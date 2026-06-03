import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  public getAnalytics(_email: string): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(this.apiSvc.USER_MEMORY.ANALYTICS);
  }

  public getAllMemories(_email: string): Observable<Reflection[]> {
    return this.http.get<Reflection[]>(this.apiSvc.USER_MEMORY.ALL);
  }
}
