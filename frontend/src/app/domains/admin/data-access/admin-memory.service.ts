import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);

  public getAllMemories(): Observable<AdminMemoryRecord[]> {
    return this.http.get<AdminMemoryRecord[]>(this.apiSvc.adminMemory.ALL);
  }

  public deleteMemory(id: string): Observable<string> {
    return this.http.delete(this.apiSvc.adminMemory.DELETE(id), { responseType: 'text' });
  }

  public uploadMockData(file: File): Observable<string> {
    const formData: FormData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiSvc.adminMemory.UPLOAD, formData, { responseType: 'text' });
  }

  public createMemory(data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.post(this.apiSvc.adminMemory.CREATE, data, { responseType: 'text' });
  }

  public updateMemory(id: string, data: Partial<AdminMemoryRecord>): Observable<string> {
    return this.http.put(this.apiSvc.adminMemory.UPDATE(id), data, { responseType: 'text' });
  }
}

