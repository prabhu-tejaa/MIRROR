import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

import { YouActions, AnalyticsResponse, Reflection } from './you.actions';

@Injectable()
export class YouEffects {
  private actions$: Actions<any> = inject(Actions);
  private http: HttpClient = inject(HttpClient);
  private apiSvc: ApiService = inject(ApiService);
  private toastSvc: ToastService = inject(ToastService);

  public loadAnalytics$ = createEffect(() =>
    { return this.actions$.pipe(
      ofType(YouActions.loadAnalytics),
      switchMap(() =>
        this.http.get<AnalyticsResponse>(this.apiSvc.USER_MEMORY.ANALYTICS).pipe(
          map((data: AnalyticsResponse) => YouActions.loadAnalyticsSuccess({ data })),
          catchError((error: any) => {
            void this.toastSvc.showError('Failed to sync your aura. Please try again.');
            return of(YouActions.loadAnalyticsFailure({ error }));
          })
        )
      )
    ) }
  );

  public loadMemories$ = createEffect(() =>
    { return this.actions$.pipe(
      ofType(YouActions.loadMemories),
      switchMap(() =>
        this.http.get<Reflection[]>(this.apiSvc.USER_MEMORY.ALL).pipe(
          map((memories: Reflection[]) => YouActions.loadMemoriesSuccess({ memories })),
          catchError((error: any) => {
            void this.toastSvc.showInfo('Could not load past reflections.');
            return of(YouActions.loadMemoriesFailure({ error }));
          })
        )
      )
    ) }
  );
}
