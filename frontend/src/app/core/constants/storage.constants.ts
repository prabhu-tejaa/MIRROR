export enum StorageKeys {
  ACCESS_TOKEN = 'mirror_access_token',
  REFRESH_TOKEN = 'mirror_refresh_token',
  USERNAME = 'mirror_username',
  EMAIL = 'mirror_email',
  GUEST_CHAT_COUNT = 'mirror_guest_chat_count',
  SESSION_INSTANCE_ID = 'mirror_session_instance_id',
  SIDEBAR_EXPANDED = 'sidebarExpanded'
}

export const getActiveSessionKey: (email: string) => string = (email: string) => `mirror_active_session_${email}`;
