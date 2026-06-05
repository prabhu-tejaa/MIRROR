import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { AdminUserResponse, AdminUserUpdateRequest, AdminCreateUserRequest } from '../../../auth/data-access/auth.model';
import { AdminMemoryRecord } from '../admin-memory.service';

export const AdminActions = createActionGroup({
  source: 'Admin',
  events: {
    'Load Users': emptyProps(),
    'Load Users Success': props<{ users: AdminUserResponse[] }>(),
    'Load Users Failure': props<{ error: unknown }>(),
    
    'Create User': props<{ request: AdminCreateUserRequest }>(),
    'Create User Success': props<{ user: AdminUserResponse }>(),
    'Create User Failure': props<{ error: unknown }>(),
    
    'Update User': props<{ id: string, request: AdminUserUpdateRequest }>(),
    'Update User Success': props<{ user: AdminUserResponse }>(),
    'Update User Failure': props<{ error: unknown }>(),
    
    'Delete User': props<{ id: string }>(),
    'Delete User Success': props<{ id: string }>(),
    'Delete User Failure': props<{ error: unknown }>(),
    
    'Load Memories': emptyProps(),
    'Load Memories Success': props<{ memories: AdminMemoryRecord[] }>(),
    'Load Memories Failure': props<{ error: unknown }>(),
    
    'Delete Memory': props<{ id: string }>(),
    'Delete Memory Success': props<{ id: string, message: string }>(),
    'Delete Memory Failure': props<{ error: unknown }>(),

    'Create Memory': props<{ data: Partial<AdminMemoryRecord> }>(),
    'Create Memory Success': props<{ message: string }>(),
    'Create Memory Failure': props<{ error: unknown }>(),

    'Update Memory': props<{ id: string, data: Partial<AdminMemoryRecord> }>(),
    'Update Memory Success': props<{ message: string }>(),
    'Update Memory Failure': props<{ error: unknown }>(),

    'Upload Mock Data': props<{ file: File }>(),
    'Upload Mock Data Success': props<{ message: string }>(),
    'Upload Mock Data Failure': props<{ error: unknown }>(),
  }
});
