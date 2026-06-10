import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { ChatStateService } from './chat-state.service';
import * as chatActions from './store/chat.actions';

@Injectable({ providedIn: 'root' })
export class ChatScrollService {
  private store: Store<object> = inject(Store) as unknown as Store<object>;
  private chatState: ChatStateService = inject(ChatStateService);

  private scrollListenerAttached: boolean = false;
  private scrollObserver?: MutationObserver;
  private scrollObserverTimeout?: ReturnType<typeof setTimeout>;

  public setupScrollListener(streamScroll: HTMLDivElement, initialScrollCompleted: { value: boolean }, isLoadingMore: () => boolean): void {
    if (this.scrollListenerAttached) { return; }
    setTimeout(() => { this.attachScrollObserver(streamScroll, initialScrollCompleted, isLoadingMore); }, 300);
  }

  private attachScrollObserver(scrollEl: HTMLDivElement, initialScrollCompleted: { value: boolean }, isLoadingMore: () => boolean): void {
    if (!scrollEl) { return; }
    this.scrollListenerAttached = true;
    const mo: MutationObserver = new MutationObserver(() => {
      if (!initialScrollCompleted.value) {
        scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
      }
    });
    mo.observe(scrollEl, { childList: true, subtree: true, characterData: true });
    scrollEl.addEventListener('scroll', () => {
      if (!initialScrollCompleted.value) { return; }
      const maxScroll: number = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (maxScroll <= 0) { return; } 
      const isAtTop: boolean = scrollEl.scrollTop <= 10;
      const isAtBottom: boolean = scrollEl.scrollTop >= (maxScroll - 10);
      const canLoadMore: boolean = this.chatState.hasMoreHistory() && !isLoadingMore() && !this.chatState.isInitialLoad();
      if (isAtTop && !isAtBottom && canLoadMore) {
        this.store.dispatch(chatActions.loadMoreHistory());
      }
    }, { passive: true });
  }

  public triggerDynamicScrollToBottom(scrollEl: HTMLDivElement, behavior: ScrollBehavior, initialScrollCompleted: { value: boolean }): void {
    if (!scrollEl) { return; }
    let hasUsedSmooth: boolean = false;
    const doScroll: () => void = () => {
      const maxScroll: number = scrollEl.scrollHeight - scrollEl.clientHeight;
      const distance: number = maxScroll - scrollEl.scrollTop;
      let actualBehavior: ScrollBehavior = behavior;
      if (distance < 100) { actualBehavior = 'auto'; } 
      else if (behavior === 'smooth') {
        if (hasUsedSmooth) { actualBehavior = 'auto'; } 
        else { hasUsedSmooth = true; }
      }
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: actualBehavior });
    };

    doScroll();

    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      clearTimeout(this.scrollObserverTimeout);
    }
    this.scrollObserver = new MutationObserver(() => doScroll());
    this.scrollObserver.observe(scrollEl, { childList: true, subtree: true, characterData: true });
    this.scrollObserverTimeout = setTimeout(() => {
      this.scrollObserver?.disconnect();
      this.scrollObserver = undefined;
      if (!initialScrollCompleted.value) { initialScrollCompleted.value = true; }
    }, 800);
  }

  public scrollToBottom(scrollEl: HTMLDivElement, behavior: ScrollBehavior = 'smooth'): void {
    if (scrollEl) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
    }
  }
}
