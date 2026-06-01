import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminMemoryRecord {
  id: string;
  user: string;
  userId?: string;
  content?: string;
  emotion: string;
  date: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminMemoryService {
  private http = inject(HttpClient);

  public getAllMemories(): Observable<AdminMemoryRecord[]> {
    return this.http.get<AdminMemoryRecord[]>('/api/admin/memory/all');
  }

  public deleteMemory(id: string): Observable<string> {
    return this.http.delete(`/api/admin/memory/${id}`, { responseType: 'text' });
  }

  public uploadMockData(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post('/api/admin/memory/upload', formData, { responseType: 'text' });
  }

  public createMemory(data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.post('/api/admin/memory', data, { responseType: 'text' });
  }

  public updateMemory(id: string, data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.put(`/api/admin/memory/${id}`, data, { responseType: 'text' });
  }
}
