export enum StorageKeys {
  ROLES = 'mirror_roles',
  USERNAME = 'mirror_username',
  EMAIL = 'mirror_email',
  SESSION_INSTANCE_ID = 'mirror_session_instance_id',
  SIDEBAR_EXPANDED = 'sidebarExpanded'
}

export const getActiveSessionKey: (email: string) => string = (email: string) => `mirror_active_session_${email}`;
