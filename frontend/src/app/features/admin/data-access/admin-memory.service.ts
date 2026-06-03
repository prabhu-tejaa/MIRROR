import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface AdminMemoryRecord {
  id: string;
  userId: string;
  content: string;
  emotion: string;
  sender: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminMemoryService {
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);

  public getAllMemories(): Observable<AdminMemoryRecord[]> {
    return this.http.get<AdminMemoryRecord[]>(this.apiSvc.ADMIN_MEMORY.ALL);
  }

  public deleteMemory(id: string): Observable<string> {
    return this.http.delete(this.apiSvc.ADMIN_MEMORY.DELETE(id), { responseType: 'text' });
  }

  public uploadMockData(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiSvc.ADMIN_MEMORY.UPLOAD, formData, { responseType: 'text' });
  }

  public createMemory(data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.post(this.apiSvc.ADMIN_MEMORY.CREATE, data, { responseType: 'text' });
  }

  public updateMemory(id: string, data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.put(this.apiSvc.ADMIN_MEMORY.UPDATE(id), data, { responseType: 'text' });
  }
}
