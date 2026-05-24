import { Injectable, inject, effect } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect } from 'firebase/database';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private authService = inject(AuthService);
  
  private onlineUsersSubject = new BehaviorSubject<number>(0);
  public onlineUsersCount$: Observable<number> = this.onlineUsersSubject.asObservable();

  private isFirebaseInitialized = false;
  private currentUserId: string | null = null;

  constructor() {
    this.initFirebase();
    
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      const userId = this.authService.getUserId();
      
      if (isAuthenticated && userId) {
        this.currentUserId = userId;
        this.startPresence(userId);
      } else {
        this.stopPresence();
        this.currentUserId = null;
      }
    });
  }

  private initFirebase() {
    if (environment.mock) {
      return;
    }
    
    try {
      if (getApps().length === 0) {
        initializeApp(environment.firebaseConfig);
      }
      this.isFirebaseInitialized = true;
      
      this.listenToOnlineUsers();
    } catch (e) {
      if (!environment.production) {
        console.error('Failed to initialize Firebase for PresenceService', e);
      }
    }
  }

  private startPresence(userId: string) {
    if (!this.isFirebaseInitialized || environment.mock) {
      return;
    }

    try {
      const db = getDatabase();
      const userStatusRef = ref(db, `/status/${userId}`);

      onDisconnect(userStatusRef).remove().then(() => {
        set(userStatusRef, {
          online: true,
          lastChanged: new Date().toISOString()
        });
      });
    } catch (e) {
      if (!environment.production) {
        console.error('Failed to start presence tracking', e);
      }
    }
  }

  private stopPresence() {
    if (!this.isFirebaseInitialized || environment.mock || !this.currentUserId) {
      return;
    }
    
    try {
      const db = getDatabase();
      const userStatusRef = ref(db, `/status/${this.currentUserId}`);
      set(userStatusRef, null);
    } catch (e) {
      if (!environment.production) {
        console.error('Failed to stop presence tracking', e);
      }
    }
  }

  private listenToOnlineUsers() {
    if (!this.isFirebaseInitialized || environment.mock) {
      return;
    }
    
    try {
      const db = getDatabase();
      const statusRef = ref(db, '/status');
      
      onValue(statusRef, (snapshot) => {
        if (snapshot.exists()) {
          this.onlineUsersSubject.next(snapshot.size);
        } else {
          this.onlineUsersSubject.next(0);
        }
      });
    } catch (e) {
      if (!environment.production) {
        console.error('Failed to listen to online users count', e);
      }
    }
  }
}
