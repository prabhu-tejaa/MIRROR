import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Reflection {
  content: string;
  emotion: string;
  createdAt: string;
  sender?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserMemoryService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);

  public getAnalytics(_email: string): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(this.apiSvc.USER_MEMORY.ANALYTICS);
  }

  public getAllMemories(_email: string): Observable<Reflection[]> {
    return this.http.get<Reflection[]>(this.apiSvc.USER_MEMORY.ALL);
  }
}
