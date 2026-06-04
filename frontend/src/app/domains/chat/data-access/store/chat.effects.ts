import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as ChatActions from './chat.actions';
import { ChatService } from '../chat.service';
import { ToastService } from '../../../../core/services/toast.service';

@Injectable()
export class ChatEffects {
  private actions$ = inject(Actions);
  private chatSvc = inject(ChatService);
  private toastSvc = inject(ToastService);

  public loadDynamicQuote$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadDynamicQuote),
      switchMap(() =>
        this.chatSvc.getRandomQuote().pipe(
          map(res => {
            if (res?.quote && res?.author) {
              return ChatActions.setDynamicQuote({ quote: { text: res.quote, author: res.author } });
            }
            return { type: '[Chat] Load Dynamic Quote Failed' };
          }),
          catchError(_err => {
            this.toastSvc.showInfo('Using local quotes (offline mode).');
            return of({ type: '[Chat] Load Dynamic Quote Failed' });
          })
        )
      )
    )
  );
}
