import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  public getAnalytics(_email: string): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${environment.apiUrl}/api/memory/analytics`);
  }

  public getAllMemories(_email: string): Observable<Reflection[]> {
    return this.http.get<Reflection[]>((`${environment.apiUrl}/api/memory/all`));
  }
}
