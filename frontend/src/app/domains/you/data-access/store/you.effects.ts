import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, of, catchError, map, switchMap, withLatestFrom } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { selectUserEmail } from '../../../auth/data-access/store/auth.selectors';
import * as chatActions from '../../../chat/data-access/store/chat.actions';

import { YouActions, AnalyticsResponse, Reflection } from './you.actions';

@Injectable()
export class YouEffects {
  private actions$: Actions<Action<string>> = inject<Actions<Action<string>>>(Actions);
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);
  private toastSvc: ToastService = inject(ToastService);
  private store: Store<object> = inject<Store<object>>(Store);

  public loadAnalytics$: Observable<Action> & CreateEffectMetadata = createEffect(() => {
    return this.actions$.pipe(
      ofType(YouActions.loadAnalytics),
      switchMap((action) =>
        this.http.get<AnalyticsResponse>(this.apiSvc.userMemory.ANALYTICS).pipe(
          switchMap((data: AnalyticsResponse): Action[] => [
            YouActions.loadAnalyticsSuccess({ data }),
            YouActions.loadMemories({ email: action.email })
          ]),
          catchError((error: unknown): Observable<Action> => {
            void this.toastSvc.showError('Failed to sync your aura. Please try again.');
            return of(YouActions.loadAnalyticsFailure({ error }));
          })
        )
      )
    );
  });

  public loadMemories$: Observable<Action> & CreateEffectMetadata = createEffect(() => {
    return this.actions$.pipe(
      ofType(YouActions.loadMemories),
      switchMap(() =>
        this.http.get<Reflection[]>(this.apiSvc.userMemory.ALL).pipe(
          map((memories: Reflection[]): Action => YouActions.loadMemoriesSuccess({ memories })),
          catchError((error: unknown): Observable<Action> => {
            void this.toastSvc.showInfo('Could not load past reflections.');
            return of(YouActions.loadMemoriesFailure({ error }));
          })
        )
      )
    );
  });

  public refreshOnNewMessage$: Observable<Action> & CreateEffectMetadata = createEffect(() => {
    return this.actions$.pipe(
      ofType(chatActions.postMessageSuccess),
      withLatestFrom(this.store.select(selectUserEmail)),
      map(([, email]) => YouActions.loadAnalytics({ email: email || '' }))
    );
  });
}
