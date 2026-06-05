import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType, CreateEffectMetadata } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

import { YouActions, AnalyticsResponse, Reflection } from './you.actions';

@Injectable()
export class YouEffects {
  private actions$: Actions<Action> = inject(Actions);
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);
  private toastSvc: ToastService = inject(ToastService);

  public loadAnalytics$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
      ofType(YouActions.loadAnalytics),
      switchMap(() =>
        this.http.get<AnalyticsResponse>(this.apiSvc.userMemory.ANALYTICS).pipe(
          map((data: AnalyticsResponse): Action => YouActions.loadAnalyticsSuccess({ data })),
          catchError((error: unknown): Observable<Action> => {
            void this.toastSvc.showError('Failed to sync your aura. Please try again.');
            return of(YouActions.loadAnalyticsFailure({ error }));
          })
        )
      )
    )
  );

  public loadMemories$: Observable<Action> & CreateEffectMetadata = createEffect(() =>
    this.actions$.pipe(
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
    )
  );
}
