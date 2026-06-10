import { Injectable, inject, Signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { StorageKeys } from '../../../core/constants/storage.constants';
import { StorageService } from '../../../core/services/storage.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../auth/data-access/auth.service';

import { Message, Quote } from './chat-state.models';
import * as chatActions from './store/chat.actions';
import * as chatSelectors from './store/chat.selectors';

@Injectable({
  providedIn: 'root'
})
export class ChatStateService {
  private authSvc: AuthService = inject(AuthService);
  private toastSvc: ToastService = inject(ToastService);
  private storageSvc: StorageService = inject(StorageService);
  private store: Store<object> = inject<Store<object>>(Store);

  public activeQuote: Signal<Quote> = this.store.selectSignal(chatSelectors.selectActiveQuote);
  public activeStyle: Signal<'cyberpunk' | 'aurora'> = this.store.selectSignal(chatSelectors.selectActiveStyle);
  public currentEmotion: Signal<string> = this.store.selectSignal(chatSelectors.selectCurrentEmotion);
  
  public currentPrimaryColor: Signal<string> = this.store.selectSignal(chatSelectors.selectCurrentPrimaryColor);
  public currentSecondaryColor: Signal<string> = this.store.selectSignal(chatSelectors.selectCurrentSecondaryColor);
  
  public isWaitingForResponse: Signal<boolean> = this.store.selectSignal(chatSelectors.selectIsWaitingForResponse);
  public isResting: Signal<boolean> = this.store.selectSignal(chatSelectors.selectIsResting);
  public isLoadingHistory: Signal<boolean> = this.store.selectSignal(chatSelectors.selectIsLoadingHistory);
  public isLoadingMore: Signal<boolean> = this.store.selectSignal(chatSelectors.selectIsLoadingMore);
  public messages: Signal<Message[]> = this.store.selectSignal(chatSelectors.selectMessages);
  public todayMessages: Signal<Message[]> = this.store.selectSignal(chatSelectors.selectTodayMessages);

  public currentCursor: Signal<string | null> = this.store.selectSignal(chatSelectors.selectCurrentCursor);
  public hasMoreHistory: Signal<boolean> = this.store.selectSignal(chatSelectors.selectHasMoreHistory);
  public initialChatLoadedGlobally: Signal<boolean> = this.store.selectSignal(chatSelectors.selectInitialChatLoadedGlobally);
  public isInitialLoad: Signal<boolean> = this.store.selectSignal(chatSelectors.selectIsInitialLoad);
  public loadedEmail: Signal<string | null> = this.store.selectSignal(chatSelectors.selectLoadedEmail);

  public readonly pageSize: number = 20;
  
  private checkMidnightInterval: ReturnType<typeof setInterval> | null = null;
  private currentDayOfMonth: number = new Date().getDate();

  public scrollToBottomTrigger: Signal<number> = this.store.selectSignal(chatSelectors.selectScrollToBottomTrigger);
  public maintainScrollTrigger: Signal<number> = this.store.selectSignal(chatSelectors.selectMaintainScrollTrigger);

  constructor() {
    this.setupMidnightChecker();
  }

  public fetchDynamicQuote(): void {
    this.store.dispatch(chatActions.loadDynamicQuote());
  }

  public checkGuestLimit(): boolean {
    if (this.authSvc.isAuthenticated()) {return true;}
    const val: string | null = this.storageSvc.get(StorageKeys.GUEST_CHAT_COUNT);
    const current: number = val ? parseInt(val, 10) : 0;
    if (current >= 5) {return false;}
    this.storageSvc.set(StorageKeys.GUEST_CHAT_COUNT, (current + 1).toString());
    return true;
  }

  private setupMidnightChecker(): void {
    this.checkMidnightInterval = setInterval(() => {
      const day: number = new Date().getDate();
      if (day !== this.currentDayOfMonth) {
        this.currentDayOfMonth = day;
      }
    }, 60000);
  }

  public destroy(): void {
    if (this.checkMidnightInterval) {
      clearInterval(this.checkMidnightInterval);
    }
  }
}
