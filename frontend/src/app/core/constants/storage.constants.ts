export enum StorageKeys {
  ACCESS_TOKEN = 'mirror_access_token',
  USERNAME = 'mirror_username',
  EMAIL = 'mirror_email',
  SESSION_INSTANCE_ID = 'mirror_session_instance_id',
  SIDEBAR_EXPANDED = 'sidebarExpanded'
}

export const getActiveSessionKey: (email: string) => string = (email: string) => `mirror_active_session_${email}`;
