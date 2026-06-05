import { Injectable, inject, effect } from '@angular/core';
import { Store } from '@ngrx/store';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect } from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { selectIsAuthenticated, selectUsername } from '../../domains/auth/data-access/store/auth.selectors';

import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private store: Store<any> = inject(Store);
  private roleService: RoleService = inject(RoleService);
  
  private onlineUsersSubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public onlineUsersCount$: Observable<number> = this.onlineUsersSubject.asObservable();

  private isFirebaseInitialized: boolean = false;
  private currentUserId: string | null = null;

  constructor() {
    this.initFirebase();
    
    effect(() => {
      const isAuthenticated: boolean = this.store.selectSignal(selectIsAuthenticated)();
      const userId: string | null = this.store.selectSignal(selectUsername)();
      
      if (isAuthenticated && userId) {
        this.currentUserId = userId;
        if (!this.roleService.hasRole('ADMIN')) {
          this.startPresence(userId);
        }
      } else {
        this.stopPresence();
        this.currentUserId = null;
      }
    });
  }

  private isFirebaseConfigured(): boolean {
    return !!(environment.firebaseConfig && environment.firebaseConfig.projectId && environment.firebaseConfig.databaseURL);
  }

  private initFirebase(): void {
    if (environment.mock || !this.isFirebaseConfigured()) {
      return;
    }
    
    try {
      if (getApps().length === 0) {
        initializeApp(environment.firebaseConfig);
      }
      this.isFirebaseInitialized = true;
      
      this.listenToOnlineUsers();
    } catch {
    }
  }

  private startPresence(userId: string): void {
    if (!this.isFirebaseInitialized || environment.mock) {
      return;
    }

    try {
      const db = getDatabase();
      const userStatusRef = ref(db, `/status/${userId}`);

      void onDisconnect(userStatusRef).remove().then(() => {
                void set(userStatusRef, {
                            online: true,
                            lastChanged: new Date().toISOString()
                          });
              });
    } catch {
    }
  }

  private stopPresence(): void {
    if (!this.isFirebaseInitialized || environment.mock || !this.currentUserId) {
      return;
    }
    
    try {
      const db = getDatabase();
      const userStatusRef = ref(db, `/status/${this.currentUserId}`);
      void set(userStatusRef, null);
    } catch {
    }
  }

  private listenToOnlineUsers(): void {
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
    } catch {
    }
  }
}
