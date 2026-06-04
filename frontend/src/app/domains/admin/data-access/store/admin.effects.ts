import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, mergeMap } from 'rxjs/operators';
import { AdminActions } from './admin.actions';
import { AdminAuthService } from '../admin-auth.service';
import { AdminMemoryService } from '../admin-memory.service';
import { AdminGatewayService, RouteMap } from '../admin-gateway.service';
import { ToastService } from '../../../../core/services/toast.service';

@Injectable()
export class AdminEffects {
  private actions$ = inject(Actions);
  private adminAuthSvc = inject(AdminAuthService);
  private adminMemorySvc = inject(AdminMemoryService);
  private adminGatewaySvc = inject(AdminGatewayService);
  private toastSvc = inject(ToastService);

  public loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadUsers),
      switchMap(() =>
        this.adminAuthSvc.getAllUsers().pipe(
          map(users => AdminActions.loadUsersSuccess({ users })),
          catchError(error => {
            this.toastSvc.showError('Failed to load users');
            return of(AdminActions.loadUsersFailure({ error }));
          })
        )
      )
    )
  );

  public createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.createUser),
      switchMap(({ request }) =>
        this.adminAuthSvc.createUser(request).pipe(
          map(user => {
            this.toastSvc.showSuccess('User created successfully');
            return AdminActions.createUserSuccess({ user });
          }),
          catchError(error => {
            this.toastSvc.showError('Failed to create user');
            return of(AdminActions.createUserFailure({ error }));
          })
        )
      )
    )
  );

  public updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.updateUser),
      switchMap(({ id, request }) =>
        this.adminAuthSvc.updateUser(id, request).pipe(
          map(user => {
            this.toastSvc.showSuccess('User updated successfully');
            return AdminActions.updateUserSuccess({ user });
          }),
          catchError(error => {
            this.toastSvc.showError('Failed to update user');
            return of(AdminActions.updateUserFailure({ error }));
          })
        )
      )
    )
  );

  public deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.deleteUser),
      switchMap(({ id }) =>
        this.adminAuthSvc.deleteUser(id).pipe(
          map(() => {
            this.toastSvc.showSuccess('User deleted successfully');
            return AdminActions.deleteUserSuccess({ id });
          }),
          catchError(error => {
            this.toastSvc.showError('Failed to delete user');
            return of(AdminActions.deleteUserFailure({ error }));
          })
        )
      )
    )
  );

  public loadMemories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadMemories),
      switchMap(() =>
        this.adminMemorySvc.getAllMemories().pipe(
          map(memories => AdminActions.loadMemoriesSuccess({ memories })),
          catchError(error => {
            this.toastSvc.showError('Failed to load memories');
            return of(AdminActions.loadMemoriesFailure({ error }));
          })
        )
      )
    )
  );

  public deleteMemory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.deleteMemory),
      switchMap(({ id }) =>
        this.adminMemorySvc.deleteMemory(id).pipe(
          map(message => {
            this.toastSvc.showError(message);
            return AdminActions.deleteMemorySuccess({ id, message });
          }),
          catchError(error => {
            this.toastSvc.showError('Failed to delete memory');
            return of(AdminActions.deleteMemoryFailure({ error }));
          })
        )
      )
    )
  );

  public createMemory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.createMemory),
      switchMap(({ data }) =>
        this.adminMemorySvc.createMemory(data).pipe(
          map(message => {
            this.toastSvc.showSuccess(message || 'New record created successfully!');
            return AdminActions.createMemorySuccess({ message });
          }),
          catchError(error => of(AdminActions.createMemoryFailure({ error })))
        )
      )
    )
  );

  public updateMemory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.updateMemory),
      switchMap(({ id, data }) =>
        this.adminMemorySvc.updateMemory(id, data).pipe(
          map(message => {
            this.toastSvc.showSuccess(message || `Record ${id} updated!`);
            return AdminActions.updateMemorySuccess({ message });
          }),
          catchError(error => of(AdminActions.updateMemoryFailure({ error })))
        )
      )
    )
  );

  public uploadMockData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.uploadMockData),
      switchMap(({ file }) =>
        this.adminMemorySvc.uploadMockData(file).pipe(
          map(message => {
            this.toastSvc.showSuccess(message);
            return AdminActions.uploadMockDataSuccess({ message });
          }),
          catchError(error => of(AdminActions.uploadMockDataFailure({ error })))
        )
      )
    )
  );

  public loadGatewayHealth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadGatewayHealth),
      switchMap(() =>
        this.adminGatewaySvc.getHealth().pipe(
          map(health => AdminActions.loadGatewayHealthSuccess({ health })),
          catchError(error => of(AdminActions.loadGatewayHealthFailure({ error })))
        )
      )
    )
  );

  public loadGatewayRoutes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadGatewayRoutes),
      switchMap(() =>
        this.adminGatewaySvc.getRoutes().pipe(
          map(routes => AdminActions.loadGatewayRoutesSuccess({ routes })),
          catchError(error => of(AdminActions.loadGatewayRoutesFailure({ error })))
        )
      )
    )
  );

  public toggleRoute$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.toggleRoute),
      switchMap(({ id, active }) =>
        this.adminGatewaySvc.toggleRoute(id, active).pipe(
          mergeMap(() => [
            AdminActions.toggleRouteSuccess({ route: { id, active } as unknown as RouteMap }),
            AdminActions.loadGatewayLogs(),
            AdminActions.loadGatewayStats()
          ]),
          catchError(error => of(AdminActions.toggleRouteFailure({ error })))
        )
      )
    )
  );

  public loadBlockedIps$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadBlockedIPs),
      switchMap(() =>
        this.adminGatewaySvc.getBlockedIps().pipe(
          map(ips => AdminActions.loadBlockedIPsSuccess({ ips })),
          catchError(error => of(AdminActions.loadBlockedIPsFailure({ error })))
        )
      )
    )
  );

  public unblockIp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.unblockIP),
      switchMap(({ ip }) =>
        this.adminGatewaySvc.unblockIp(ip).pipe(
          mergeMap(() => [
            AdminActions.unblockIPSuccess({ ip }),
            AdminActions.loadGatewayLogs(),
            AdminActions.loadGatewayStats()
          ]),
          catchError(error => of(AdminActions.unblockIPFailure({ error })))
        )
      )
    )
  );

  public loadGatewayLogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadGatewayLogs),
      switchMap(() =>
        this.adminGatewaySvc.getLogs().pipe(
          map(logs => AdminActions.loadGatewayLogsSuccess({ logs })),
          catchError(error => of(AdminActions.loadGatewayLogsFailure({ error })))
        )
      )
    )
  );

  public loadGatewayStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadGatewayStats),
      switchMap(() =>
        this.adminGatewaySvc.getStats().pipe(
          map(stats => AdminActions.loadGatewayStatsSuccess({ stats })),
          catchError(error => of(AdminActions.loadGatewayStatsFailure({ error })))
        )
      )
    )
  );

  public updateRateLimit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.updateRateLimit),
      switchMap(({ limit }) =>
        this.adminGatewaySvc.updateRateLimit(limit).pipe(
          map(() => AdminActions.updateRateLimitSuccess({ limit })),
          catchError(error => of(AdminActions.updateRateLimitFailure({ error })))
        )
      )
    )
  );

  public loadAllTelemetry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadAllTelemetry),
      switchMap(() =>
        forkJoin({
          health: this.adminGatewaySvc.getHealth(),
          routes: this.adminGatewaySvc.getRoutes(),
          blockedIps: this.adminGatewaySvc.getBlockedIps(),
          logs: this.adminGatewaySvc.getLogs(),
          stats: this.adminGatewaySvc.getStats()
        }).pipe(
          mergeMap(res => [
            AdminActions.loadGatewayHealthSuccess({ health: res.health }),
            AdminActions.loadGatewayRoutesSuccess({ routes: res.routes }),
            AdminActions.loadBlockedIPsSuccess({ ips: res.blockedIps }),
            AdminActions.loadGatewayLogsSuccess({ logs: res.logs }),
            AdminActions.loadGatewayStatsSuccess({ stats: res.stats })
          ]),
          catchError(error => {
            this.toastSvc.showError('Failed to load telemetry');
            return of(AdminActions.loadGatewayHealthFailure({ error }));
          })
        )
      )
    )
  );
}
