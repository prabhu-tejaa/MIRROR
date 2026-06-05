import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../core/services/api.service';
import { AdminUserResponse, AdminUserUpdateRequest, AdminCreateUserRequest } from '../../auth/data-access/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);

  private mockUsers: AdminUserResponse[] = [
    {
      id: 'd3b07384-d113-495d-a510-18e8df3141f2',
      username: 'admin',
      email: 'admin@mirror.tech',
      role: 'ADMIN',
      isVerified: true,
      createdAt: '2026-05-20T10:00:00.000Z',
      updatedAt: '2026-05-24T18:00:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    },
    {
      id: '7b80a6b7-ca2a-4a64-b816-56ffad7d159a',
      username: 'prabhu_teja',
      email: 'prabhuteja@vit.edu',
      role: 'ADMIN',
      isVerified: true,
      createdAt: '2026-05-22T14:30:00.000Z',
      updatedAt: '2026-05-23T11:20:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    },
    {
      id: 'f9d3a778-d0cc-402a-9e1e-28b3a0eef4b8',
      username: 'sarah_jones',
      email: 'sarah@example.com',
      role: 'USER',
      isVerified: true,
      createdAt: '2026-05-23T09:15:00.000Z',
      updatedAt: '2026-05-23T09:15:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    },
    {
      id: '86a4e321-c42b-426c-843b-28562d9fb0ee',
      username: 'alex_developer',
      email: 'alex.dev@gmail.com',
      role: 'USER',
      isVerified: false,
      createdAt: '2026-05-24T11:45:00.000Z',
      updatedAt: '2026-05-24T11:45:00.000Z',
      failedAttempts: 1,
      lockedUntil: null
    },
    {
      id: 'ca0e4c6e-8ff5-4e78-bead-552be4259b10',
      username: 'test_user',
      email: 'test@mirror.io',
      role: 'USER',
      isVerified: false,
      createdAt: '2026-05-24T15:30:00.000Z',
      updatedAt: '2026-05-24T15:30:00.000Z',
      failedAttempts: 3,
      lockedUntil: '2026-05-24T23:59:59.000Z'
    }
  ];

  private isUsingMockFallback: boolean = false;

  private handleMockError(error: unknown, fallbackAction: () => Observable<any>): Observable<any> {
    if (!environment.mock) {
      return throwError(() => error);
    }
    this.isUsingMockFallback = true;
    return fallbackAction();
  }

  public getAllUsers(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(this.apiSvc.auth.ADMIN_USERS).pipe(
      catchError((error: unknown) => this.handleMockError(error, () => of([...this.mockUsers])))
    );
  }

  public getUserById(id: string): Observable<AdminUserResponse> {
    if (this.isUsingMockFallback && environment.mock) {
      const user: AdminUserResponse | undefined = this.mockUsers.find((u: AdminUserResponse) => u.id === id);
      if (user) {return of({ ...user });}
      return throwError(() => new Error('User not found in mock database'));
    }

    return this.http.get<AdminUserResponse>(`${this.apiSvc.auth.ADMIN_USERS}/${id}`).pipe(
      catchError((error: unknown) => this.handleMockError(error, () => {
        const user: AdminUserResponse | undefined = this.mockUsers.find((u: AdminUserResponse) => u.id === id);
        if (user) {
          return of({ ...user });
        }
        return throwError(() => error);
      }))
    );
  }

  private updateMockUser(id: string, request: AdminUserUpdateRequest): AdminUserResponse {
    const index: number = this.mockUsers.findIndex((u: AdminUserResponse) => u.id === id);
    if (index !== -1) {
      const currentUser: AdminUserResponse = this.mockUsers[index];
      const updatedUser: AdminUserResponse = {
        ...currentUser,
        username: request.username !== undefined ? request.username : currentUser.username,
        email: request.email !== undefined ? request.email : currentUser.email,
        role: request.role !== undefined ? request.role : currentUser.role,
        isVerified: request.isVerified !== undefined ? request.isVerified : currentUser.isVerified,
        failedAttempts: request.failedAttempts !== undefined ? request.failedAttempts : currentUser.failedAttempts,
        lockedUntil: request.lockedUntil !== undefined ? request.lockedUntil : currentUser.lockedUntil,
        updatedAt: new Date().toISOString()
      };
      this.mockUsers[index] = updatedUser;
      return updatedUser;
    }
    throw new Error('User not found in mock database');
  }

  public updateUser(id: string, request: AdminUserUpdateRequest): Observable<AdminUserResponse> {
    if (this.isUsingMockFallback && environment.mock) {
      try {
        return of({ ...this.updateMockUser(id, request) });
      } catch (e) {
        return throwError(() => e);
      }
    }

    return this.http.put<AdminUserResponse>(`${this.apiSvc.auth.ADMIN_USERS}/${id}`, request).pipe(
      catchError((error: unknown) => this.handleMockError(error, () => {
        try {
          return of({ ...this.updateMockUser(id, request) });
        } catch {
          return throwError(() => error);
        }
      }))
    );
  }

  private createMockUser(request: AdminCreateUserRequest): AdminUserResponse {
    const newUser: AdminUserResponse = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
      username: request.username,
      email: request.email,
      role: request.role,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null
    };
    this.mockUsers.push(newUser);
    return newUser;
  }

  public createUser(request: AdminCreateUserRequest): Observable<AdminUserResponse> {
    if (this.isUsingMockFallback && environment.mock) {
      return of({ ...this.createMockUser(request) });
    }

    return this.http.post<AdminUserResponse>(this.apiSvc.auth.ADMIN_USERS, request).pipe(
      catchError((error: unknown) => this.handleMockError(error, () => {
        return of({ ...this.createMockUser(request) });
      }))
    );
  }

  public deleteUser(id: string): Observable<void> {
    if (this.isUsingMockFallback && environment.mock) {
      const index: number = this.mockUsers.findIndex((u: AdminUserResponse) => u.id === id);
      if (index !== -1) {
        this.mockUsers.splice(index, 1);
        return of(undefined);
      }
      return throwError(() => new Error('User not found in mock database'));
    }

    return this.http.delete<void>(`${this.apiSvc.auth.ADMIN_USERS}/${id}`).pipe(
      catchError((error: unknown) => this.handleMockError(error, () => {
        const index: number = this.mockUsers.findIndex((u: AdminUserResponse) => u.id === id);
        if (index !== -1) {
          this.mockUsers.splice(index, 1);
          return of(undefined);
        }
        return throwError(() => error);
      }))
    );
  }
}
