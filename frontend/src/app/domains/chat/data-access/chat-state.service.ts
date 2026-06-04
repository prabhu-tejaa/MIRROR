/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthService } from '../../auth/data-access/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StorageService } from '../../../core/services/storage.service';
import { StorageKeys } from '../../../core/constants/storage.constants';
import * as ChatSelectors from './store/chat.selectors';
import * as ChatActions from './store/chat.actions';

@Injectable({
  providedIn: 'root'
})
export class ChatStateService {
  private authSvc = inject(AuthService);
  private toastSvc = inject(ToastService);
  private storageSvc = inject(StorageService);
  private store = inject(Store);

  // State Signals (Backed by NgRx)
  public activeQuote = this.store.selectSignal(ChatSelectors.selectActiveQuote);
  public activeStyle = this.store.selectSignal(ChatSelectors.selectActiveStyle);
  public currentEmotion = this.store.selectSignal(ChatSelectors.selectCurrentEmotion);
  
  public currentPrimaryColor = this.store.selectSignal(ChatSelectors.selectCurrentPrimaryColor);
  public currentSecondaryColor = this.store.selectSignal(ChatSelectors.selectCurrentSecondaryColor);
  
  public isWaitingForResponse = this.store.selectSignal(ChatSelectors.selectIsWaitingForResponse);
  public isResting = this.store.selectSignal(ChatSelectors.selectIsResting);
  public isLoadingHistory = this.store.selectSignal(ChatSelectors.selectIsLoadingHistory);
  public isLoadingMore = this.store.selectSignal(ChatSelectors.selectIsLoadingMore);
  public messages = this.store.selectSignal(ChatSelectors.selectMessages);
  public todayMessages = this.store.selectSignal(ChatSelectors.selectTodayMessages);

  // Internal Pagination State
  public currentCursor: string | null = null;
  public readonly pageSize = 20;
  public hasMoreHistory = true;
  public initialChatLoadedGlobally = false;
  public isInitialLoad = !this.initialChatLoadedGlobally;
  public loadedEmail: string | null = null;
  
  private checkMidnightInterval: any = null;
  private currentDayOfMonth = new Date().getDate();
  public activeTypingIntervals: number[] = [];

  public scrollToBottomTrigger = this.store.selectSignal(ChatSelectors.selectScrollToBottomTrigger);
  public maintainScrollTrigger = this.store.selectSignal(ChatSelectors.selectMaintainScrollTrigger);

  constructor() {
    this.setupMidnightChecker();
  }

  public fetchDynamicQuote(): void {
    this.store.dispatch(ChatActions.loadDynamicQuote());
  }

  public checkGuestLimit(): boolean {
    if (this.authSvc.isAuthenticated()) return true;
    const val = this.storageSvc.get(StorageKeys.GUEST_CHAT_COUNT);
    const current = val ? parseInt(val, 10) : 0;
    if (current >= 5) return false;
    this.storageSvc.set(StorageKeys.GUEST_CHAT_COUNT, (current + 1).toString());
    return true;
  }

  private setupMidnightChecker() {
    this.checkMidnightInterval = setInterval(() => {
      const day = new Date().getDate();
      if (day !== this.currentDayOfMonth) {
        this.currentDayOfMonth = day;
        // In NgRx, you'd dispatch an action like "Midnight Crossed" to re-evaluate computed state if necessary
      }
    }, 60000) as unknown as number;
  }

  public destroy() {
    this.activeTypingIntervals.forEach(clearInterval);
    this.activeTypingIntervals = [];
    if (this.checkMidnightInterval) {
      clearInterval(this.checkMidnightInterval);
    }
  }
}
