import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { AdminUserResponse, AdminUserUpdateRequest, AdminCreateUserRequest } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';

export const AdminActions = createActionGroup({
  source: 'Admin',
  events: {
    loadUsers: emptyProps(),
    loadUsersSuccess: props<{ users: AdminUserResponse[] }>(),
    loadUsersFailure: props<{ error: unknown }>(),

    createUser: props<{ request: AdminCreateUserRequest }>(),
    createUserSuccess: props<{ user: AdminUserResponse }>(),
    createUserFailure: props<{ error: unknown }>(),

    updateUser: props<{ id: string; request: AdminUserUpdateRequest }>(),
    updateUserSuccess: props<{ user: AdminUserResponse }>(),
    updateUserFailure: props<{ error: unknown }>(),

    deleteUser: props<{ id: string }>(),
    deleteUserSuccess: props<{ id: string }>(),
    deleteUserFailure: props<{ error: unknown }>(),

    loadMemories: emptyProps(),
    loadMemoriesSuccess: props<{ memories: AdminMemoryRecord[] }>(),
    loadMemoriesFailure: props<{ error: unknown }>(),

    deleteMemory: props<{ id: string }>(),
    deleteMemorySuccess: props<{ id: string; message: string }>(),
    deleteMemoryFailure: props<{ error: unknown }>(),

    createMemory: props<{ data: Partial<AdminMemoryRecord> }>(),
    createMemorySuccess: props<{ message: string }>(),
    createMemoryFailure: props<{ error: unknown }>(),

    updateMemory: props<{ id: string; data: Partial<AdminMemoryRecord> }>(),
    updateMemorySuccess: props<{ message: string }>(),
    updateMemoryFailure: props<{ error: unknown }>(),

    uploadMockData: props<{ file: File }>(),
    uploadMockDataSuccess: props<{ message: string }>(),
    uploadMockDataFailure: props<{ error: unknown }>(),
  }
});
