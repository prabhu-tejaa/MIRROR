import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SKIP_CANCEL } from '../../../core/interceptors/cancel.interceptor';
import { ApiService } from '../../../core/services/api.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'mirror';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
  emotion?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isCurrentSession?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);

  public getHistory(email: string, cursor: string | null, size: number): Observable<{ messages: unknown[], hasMore: boolean, nextCursor: string | null }> {
    const cursorParam: string = cursor ? `&cursor=${cursor}` : '';
    return this.http.get<{ messages: unknown[], hasMore: boolean, nextCursor: string | null }>(`${this.apiSvc.USER_MEMORY.HISTORY}?size=${size}${cursorParam}`);
  }

  public reflect(email: string, prompt: string): Observable<{ reflection: string, emotion: string }> {
    return this.http.post<{ reflection: string, emotion: string }>(this.apiSvc.USER_MEMORY.REFLECT, prompt, {
      headers: { 
        'Content-Type': 'text/plain' 
      },
      context: new HttpContext().set(SKIP_CANCEL, true)
    }).pipe(
      timeout(30000)
    );
  }

  public getRandomQuote(): Observable<{ quote: string, author: string }> {
    return this.http.get<{ quote: string, author: string }>((environment as Record<string, unknown>)['quoteApiUrl'] as string || 'https://dummyjson.com/quotes/random');
  }
}
