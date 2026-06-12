import { Injectable, inject, Signal } from '@angular/core';
import { Store } from '@ngrx/store';

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
  
  public scrollToBottomTrigger: Signal<number> = this.store.selectSignal(chatSelectors.selectScrollToBottomTrigger);
  public maintainScrollTrigger: Signal<number> = this.store.selectSignal(chatSelectors.selectMaintainScrollTrigger);



  public fetchDynamicQuote(): void {
    if (!this.activeQuote() || !this.activeQuote().text) {
      this.store.dispatch(chatActions.loadDynamicQuote());
    }
  }

  public destroy(): void {
    // Cleanup if necessary
  }
}
