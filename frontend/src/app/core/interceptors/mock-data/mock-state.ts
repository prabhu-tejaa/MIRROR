export interface MockUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface MockMemory {
  id: string;
  userId: string;
  content: string;
  emotion: string;
  sender: string;
  createdAt: string;
}

export interface MockBlockedIp {
  ip: string;
  reason: string;
  blockedAt: string;
}

export interface MockHealthStat {
  name: string;
  port: number;
  status: string;
  latency: number;
  color: string;
}

export interface MockRoute {
  id: string;
  path: string;
  destination: string;
  service: string;
  active: boolean;
}

export interface MockLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  service: string;
}

export interface MockGatewayStats {
  totalRequestsToday: number;
  whitelistedCount: number;
  globalRateLimit: number;
}

export const MockState = {
  usersList: [
    {
      id: 'd3b07384-d113-495d-a510-18e8df3141f2',
      username: 'admin',
      email: 'admin@mirror.tech',
      role: 'ADMIN',
      isVerified: true,
      createdAt: '2026-05-20T10:00:00.000Z',
      updatedAt: '2026-05-24T18:00:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    },
    {
      id: '7b80a6b7-ca2a-4a64-b816-56ffad7d159a',
      username: 'prabhu_teja',
      email: 'prabhuteja@vit.edu',
      role: 'ADMIN',
      isVerified: true,
      createdAt: '2026-05-22T14:30:00.000Z',
      updatedAt: '2026-05-23T11:20:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    },
    {
      id: 'f9d3a778-d0cc-402a-9e1e-28b3a0eef4b8',
      username: 'sarah_jones',
      email: 'sarah@example.com',
      role: 'USER',
      isVerified: true,
      createdAt: '2026-05-23T09:15:00.000Z',
      updatedAt: '2026-05-23T09:15:00.000Z',
      failedAttempts: 0,
      lockedUntil: null
    }
  ] as MockUser[],

  memoryRecords: [
    { id: '1', userId: 'admin', content: 'Mock memory 1: Had a great coding session today.', emotion: 'JOY|#ffb700|#ff5e00', sender: 'user', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', userId: 'sarah_jones', content: 'Mock memory 2: Stressed about exams.', emotion: 'ANXIOUS|#a855f7|#06b6d4', sender: 'user', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', userId: 'alex_developer', content: 'Mock memory 3: Feeling very calm and focused.', emotion: 'CALM|#10b981|#06b6d4', sender: 'user', createdAt: new Date(Date.now() - 10800000).toISOString() }
  ] as MockMemory[],

  blockedIps: [
    { ip: '192.168.1.50', reason: 'Brute force attempts', blockedAt: new Date(Date.now() - 86400000).toISOString() },
    { ip: '10.0.0.99', reason: 'DDoS threshold trigger', blockedAt: new Date(Date.now() - 3600000).toISOString() }
  ] as MockBlockedIp[],

  healthStats: [
    { name: 'auth-service', port: 8080, status: 'ONLINE', latency: 45, color: '#10b981' },
    { name: 'memory-service', port: 8081, status: 'ONLINE', latency: 60, color: '#10b981' },
    { name: 'api-gateway', port: 8060, status: 'ONLINE', latency: 12, color: '#10b981' }
  ] as MockHealthStat[],

  routes: [
    { id: 'auth-service-route', path: '/api/auth/**', destination: 'http://localhost:8080', service: 'auth-service', active: true },
    { id: 'memory-service-route', path: '/api/memory/**', destination: 'http://localhost:8081', service: 'memory-service', active: true }
  ] as MockRoute[],

  logs: [
    { timestamp: new Date(Date.now() - 1000).toISOString(), method: 'GET', path: '/api/memory/analytics', status: 200, latency: 15, service: 'memory-service' },
    { timestamp: new Date(Date.now() - 3000).toISOString(), method: 'POST', path: '/api/auth/login', status: 200, latency: 45, service: 'auth-service' },
    { timestamp: new Date(Date.now() - 6000).toISOString(), method: 'GET', path: '/api/admin/memory/all', status: 200, latency: 22, service: 'memory-service' }
  ] as MockLog[],

  gatewayStats: {
    totalRequestsToday: 48512,
    whitelistedCount: 4,
    globalRateLimit: 120
  }
};
