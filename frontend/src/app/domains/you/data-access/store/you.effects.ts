import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { YouActions, AnalyticsResponse, Reflection } from './you.actions';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';

@Injectable()
export class YouEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private apiSvc = inject(ApiService);
  private toastSvc = inject(ToastService);

  public loadAnalytics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(YouActions.loadAnalytics),
      switchMap(() =>
        this.http.get<AnalyticsResponse>(this.apiSvc.USER_MEMORY.ANALYTICS).pipe(
          map(data => YouActions.loadAnalyticsSuccess({ data })),
          catchError(error => {
            this.toastSvc.showError('Failed to sync your aura. Please try again.');
            return of(YouActions.loadAnalyticsFailure({ error }));
          })
        )
      )
    )
  );

  public loadMemories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(YouActions.loadMemories),
      switchMap(() =>
        this.http.get<Reflection[]>(this.apiSvc.USER_MEMORY.ALL).pipe(
          map(memories => YouActions.loadMemoriesSuccess({ memories })),
          catchError(error => {
            this.toastSvc.showInfo('Could not load past reflections.');
            return of(YouActions.loadMemoriesFailure({ error }));
          })
        )
      )
    )
  );
}
