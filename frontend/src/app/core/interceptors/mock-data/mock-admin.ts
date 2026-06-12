/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-depth */
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of , delay } from 'rxjs';


import { MockState } from './mock-state';

export function handleAdminRoutes(req: HttpRequest<unknown>, url: string): Observable<HttpResponse<unknown>> | null {
  if (url.includes('/api/auth/admin/users/')) {
    const id: string = url.substring(url.lastIndexOf('/') + 1);
    if (req.method === 'PUT') {
      const body: { username?: string; email?: string; role?: string; isVerified?: boolean; lockedUntil?: string | null; failedAttempts?: number } = req.body as { username?: string; email?: string; role?: string; isVerified?: boolean; lockedUntil?: string | null; failedAttempts?: number };
      const index: number = MockState.usersList.findIndex(u => u.id === id);
      if (index !== -1) {
        MockState.usersList[index] = { ...MockState.usersList[index], ...body, updatedAt: new Date().toISOString() };
        return of(new HttpResponse({ status: 200, body: MockState.usersList[index] })).pipe(delay(300));
      }
    }
    if (req.method === 'DELETE') {
      const userToDelete = MockState.usersList.find(u => u.id === id);
      if (userToDelete) {
        // Cascade delete memories associated with this user
        MockState.memoryRecords = MockState.memoryRecords.filter(m => m.userId !== userToDelete.username);
      }
      MockState.usersList = MockState.usersList.filter(u => u.id !== id);
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(300));
    }
  }

  if (url.includes('/api/auth/admin/users')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: MockState.usersList })).pipe(delay(300));
    }
    if (req.method === 'POST') {
      const body: { username: string; email: string; role?: string } = req.body as { username: string; email: string; role?: string };
      const newUser = {
        id: Math.random().toString(36).substring(7),
        username: body.username,
        email: body.email,
        role: body.role || 'USER',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failedAttempts: 0,
        lockedUntil: null
      };
      MockState.usersList = [...MockState.usersList, newUser];
      return of(new HttpResponse({ status: 201, body: newUser })).pipe(delay(300));
    }
  }

  if (url.includes('/api/admin/memory/all')) {
    return of(new HttpResponse({ status: 200, body: MockState.memoryRecords })).pipe(delay(300));
  }

  if (url.includes('/api/admin/memory/upload')) {
    return of(new HttpResponse({ status: 200, body: 'Successfully imported 15 mock records into database.' })).pipe(delay(500));
  }

  const isSpecificMemory: boolean = url.includes('/api/admin/memory/') && !url.endsWith('/all') && !url.endsWith('/upload');
  if (isSpecificMemory) {
    const id: string = url.substring(url.lastIndexOf('/') + 1);
    if (req.method === 'PUT') {
      const body: { content?: string; emotion?: string } = req.body as { content?: string; emotion?: string };
      const index: number = MockState.memoryRecords.findIndex(r => r.id === id);
      if (index !== -1) {
        MockState.memoryRecords[index] = { ...MockState.memoryRecords[index], ...body };
        return of(new HttpResponse({ status: 200, body: 'Memory updated successfully.' })).pipe(delay(300));
      }
    }
    if (req.method === 'DELETE') {
      MockState.memoryRecords = MockState.memoryRecords.filter(r => r.id !== id);
      return of(new HttpResponse({ status: 200, body: 'Memory deleted successfully.' })).pipe(delay(300));
    }
  }

  if (url.endsWith('/api/admin/memory') && req.method === 'POST') {
    const body: { userId: string; content: string; emotion: string } = req.body as { userId: string; content: string; emotion: string };
    const newRecord = {
      id: Math.random().toString(36).substring(7),
      userId: body.userId,
      content: body.content,
      emotion: body.emotion,
      sender: 'user',
      createdAt: new Date().toISOString()
    };
    MockState.memoryRecords = [newRecord, ...MockState.memoryRecords];
    return of(new HttpResponse({ status: 200, body: 'Memory created successfully.' })).pipe(delay(300));
  }

  return null;
}
