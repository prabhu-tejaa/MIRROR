/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);

  public getHistory(email: string, cursor: string | null, size: number): Observable<any> {
    const cursorParam = cursor ? `&cursor=${cursor}` : '';
    return this.http.get<any>(`${environment.apiUrl}/api/memory/history?size=${size}${cursorParam}`);
  }

  public reflect(email: string, prompt: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/memory/reflect`, prompt, {
      headers: { 
        'Content-Type': 'text/plain' 
      }
    });
  }

  public getRandomQuote(): Observable<any> {
    return this.http.get<any>((environment as any).quoteApiUrl || 'https://dummyjson.com/quotes/random');
  }
}
