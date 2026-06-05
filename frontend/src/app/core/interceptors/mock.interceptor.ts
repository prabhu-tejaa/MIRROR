import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService } from '../services/api.service';

let mockUsersList = [
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
];

let mockMemoryRecords = [
  { id: '1', userId: 'admin', content: 'Mock memory 1: Had a great coding session today.', emotion: 'JOY|#ffb700|#ff5e00', sender: 'user', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', userId: 'sarah_jones', content: 'Mock memory 2: Stressed about exams.', emotion: 'ANXIOUS|#a855f7|#06b6d4', sender: 'user', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', userId: 'alex_developer', content: 'Mock memory 3: Feeling very calm and focused.', emotion: 'CALM|#10b981|#06b6d4', sender: 'user', createdAt: new Date(Date.now() - 10800000).toISOString() }
];

let mockBlockedIps = [
  { ip: '192.168.1.50', reason: 'Brute force attempts', blockedAt: new Date(Date.now() - 86400000).toISOString() },
  { ip: '10.0.0.99', reason: 'DDoS threshold trigger', blockedAt: new Date(Date.now() - 3600000).toISOString() }
];

const mockHealthStats = [
  { name: 'auth-service', port: 8080, status: 'ONLINE', latency: 45, color: '#10b981' },
  { name: 'memory-service', port: 8081, status: 'ONLINE', latency: 60, color: '#10b981' },
  { name: 'api-gateway', port: 8060, status: 'ONLINE', latency: 12, color: '#10b981' }
];

const mockRoutes = [
  { id: 'auth-service-route', path: '/api/auth/**', destination: 'http://localhost:8080', service: 'auth-service', active: true },
  { id: 'memory-service-route', path: '/api/memory/**', destination: 'http://localhost:8081', service: 'memory-service', active: true }
];

const mockLogs = [
  { timestamp: new Date(Date.now() - 1000).toISOString(), method: 'GET', path: '/api/memory/analytics', status: 200, latency: 15, service: 'memory-service' },
  { timestamp: new Date(Date.now() - 3000).toISOString(), method: 'POST', path: '/api/auth/login', status: 200, latency: 45, service: 'auth-service' },
  { timestamp: new Date(Date.now() - 6000).toISOString(), method: 'GET', path: '/api/admin/memory/all', status: 200, latency: 22, service: 'memory-service' }
];

const mockGatewayStats = {
  totalRequestsToday: 48512,
  whitelistedCount: 4,
  globalRateLimit: 120
};

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mock) {
    return next(req);
  }

  const apiSvc = inject(ApiService);
  const url = req.url;

  const signupPath = apiSvc.AUTH.SIGNUP;
  const loginPath = apiSvc.AUTH.LOGIN;
  const otpRequestPath = apiSvc.AUTH.OTP_REQUEST;
  const otpVerifyPath = apiSvc.AUTH.OTP_VERIFY;
  const forgotPasswordRequestPath = apiSvc.AUTH.FORGOT_PASSWORD_REQUEST;
  const forgotPasswordVerifyPath = apiSvc.AUTH.FORGOT_PASSWORD_VERIFY;
  const forgotPasswordResetPath = apiSvc.AUTH.FORGOT_PASSWORD_RESET;
  const refreshPath = apiSvc.AUTH.REFRESH;
  const logoutPath = apiSvc.AUTH.LOGOUT;

  const defaultUsername = 'mockuser';
  const mockAccessToken = 'mock_jwt_access_token_xyz';
  const mockRefreshToken = 'mock_refresh_token_abc';
  const mockRefreshedAccessToken = 'mock_jwt_access_token_xyz_refreshed';

  const triggerErrorEmail = 'error@mirror.tech';
  const triggerErrorOtp = '000000';
  const defaultEmail = 'gdag@hdjs.com';
  const emailSeparator = '@';
  const statusUnauthorized = 'Unauthorized';
  const statusBadRequest = 'Bad Request';
  const statusNotFound = 'Not Found';
  const errorInvalidCredentials = 'Invalid email or password. Please try again.';
  const errorEmailExists = 'An account with this email address already exists.';
  const errorIncorrectOtp = 'Incorrect verification code. Please request a new one.';
  const errorEmailNotFound = 'No account registered with this email address.';
  const errorOtpVerificationFailed = 'Incorrect OTP code. Verification failed.';

  if (url.includes(loginPath)) {
    const body = req.body as { email?: string; code?: string } | null;
    
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: statusUnauthorized,
        error: errorInvalidCredentials
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: body && body.email ? body.email.split(emailSeparator)[0] : defaultUsername,
      email: body && body.email ? body.email : defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(signupPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorEmailExists
      })).pipe(delay(800));
    }

    const message = 'User registered successfully with ID: mock-123';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpRequestPath)) {
    const message = 'OTP sent to your email.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorIncorrectOtp
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername,
      email: body && body.email ? body.email : defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordRequestPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: statusNotFound,
        error: errorEmailNotFound
      })).pipe(delay(800));
    }

    const message = 'OTP sent to your email.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorOtpVerificationFailed
      })).pipe(delay(800));
    }

    const message = 'OTP verified successfully. You may now reset your password.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordResetPath)) {
    const message = 'Password reset successfully. Please proceed to login.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(refreshPath)) {
    const mockResponse = {
      accessToken: mockRefreshedAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername,
      email: defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(logoutPath)) {
    const message = 'Logged out successfully.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(300));
  }

  if (url.includes(apiSvc.USER_MEMORY.HISTORY)) {
    const mockHistory = {
      messages: [
        {
          id: '1',
          sender: 'user',
          content: 'Feeling completely overwhelmed today. I have my final MCA project review coming up and I feel like the backend isn\'t ready.',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          emotion: 'ANXIOUS'
        },
        {
          id: '2',
          sender: 'mirror',
          content: 'It is completely normal to feel overwhelmed when facing a major milestone like your final review. Let\'s break it down. What part of the backend is worrying you the most right now?',
          createdAt: new Date(Date.now() - 3600000 * 2 + 5000).toISOString(),
          emotion: 'CALM|#10b981|#06b6d4'
        },
        {
          id: '3',
          sender: 'user',
          content: 'Actually, just talking it out helped. The microservices are working, I just need to polish the UI. I can do this.',
          createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          emotion: 'JOY'
        },
        {
          id: '4',
          sender: 'mirror',
          content: 'I love that shift in perspective! You have already built the hardest part. Taking it one step at a time will get you across the finish line. You\'ve got this.',
          createdAt: new Date(Date.now() - 3600000 * 1 + 5000).toISOString(),
          emotion: 'JOY|#ffb700|#ff5e00'
        }
      ],
      hasMore: false,
      nextCursor: null
    };
    return of(new HttpResponse({ status: 200, body: mockHistory })).pipe(delay(600));
  }

  if (url.includes(apiSvc.USER_MEMORY.REFLECT)) {
    const userPrompt = typeof req.body === 'string' ? req.body : '';
    let responseText = "I hear you. Every thought you share is a stepping stone to deeper self-awareness. Let's explore this feeling together.";
    let emotionToken = "CALM|#10b981|#06b6d4";

    const promptUpper = userPrompt.toUpperCase();
    if (promptUpper.includes('HAPPY') || promptUpper.includes('JOY') || promptUpper.includes('GREAT') || promptUpper.includes('GOOD')) {
      responseText = "It is wonderful to hear that you are experiencing joy! Celebrating these positive moments anchors gratitude in your journey. What else is contributing to this brightness?";
      emotionToken = "JOY|#ffb700|#ff5e00";
    } else if (promptUpper.includes('SAD') || promptUpper.includes('LONELY') || promptUpper.includes('CRY') || promptUpper.includes('HURT')) {
      responseText = "I'm holding space for you. Feeling down or lonely is a completely natural human experience, and speaking it aloud is incredibly brave. Be gentle with yourself today.";
      emotionToken = "SAD|#00ffd5|#0099ff";
    } else if (promptUpper.includes('ANXIOUS') || promptUpper.includes('STRESS') || promptUpper.includes('WORRY') || promptUpper.includes('SCARED') || promptUpper.includes('OVERWHELMED')) {
      responseText = "Take a slow, deep breath. Anxiety can feel overwhelming, especially with academic pressure. Remember that you are here, safe in this moment. We can unpack these worries one step at a time.";
      emotionToken = "ANXIOUS|#a855f7|#06b6d4";
    } else if (promptUpper.includes('ANGRY') || promptUpper.includes('MAD') || promptUpper.includes('FRUSTRATED')) {
      responseText = "It is completely valid to feel angry or frustrated. Anger often points to things we care deeply about or boundaries that have been crossed. Let's release some of that tension together.";
      emotionToken = "ANGER|#ff0055|#e11d48";
    } else if (promptUpper.includes('CREATIVE') || promptUpper.includes('IDEA') || promptUpper.includes('INSIGHT')) {
      responseText = "That sounds incredibly inspiring! Cultivating creativity lets your inner voice speak in new and beautiful ways. Tell me more about what you're imagining.";
      emotionToken = "CREATIVITY|#10b981|#06b6d4";
    }

    const mockReflection = {
      reflection: responseText,
      emotion: emotionToken
    };
    return of(new HttpResponse({ status: 200, body: mockReflection })).pipe(delay(1000));
  }

  if (url.includes(apiSvc.USER_MEMORY.ANALYTICS)) {
    const mockAnalytics = {
      totalMemories: 5,
      dominantEmotion: 'JOY',
      activeStreak: 4,
      emotionStats: [
        {
          key: 'JOY',
          pillar: 'Joyful',
          name: 'Joy',
          primaryColor: '#ffb700',
          secondaryColor: 'rgba(255, 183, 0, 0.4)',
          count: 2,
          percentage: 40
        },
        {
          key: 'CALM',
          pillar: 'Peaceful',
          name: 'Calm',
          primaryColor: '#10b981',
          secondaryColor: 'rgba(16, 185, 129, 0.4)',
          count: 1,
          percentage: 20
        },
        {
          key: 'ANXIOUS',
          pillar: 'Anxious',
          name: 'Anxious',
          primaryColor: '#a855f7',
          secondaryColor: 'rgba(168, 85, 247, 0.4)',
          count: 1,
          percentage: 20
        },
        {
          key: 'SAD',
          pillar: 'Sadness',
          name: 'Sadness',
          primaryColor: '#00ffd5',
          secondaryColor: 'rgba(0, 255, 213, 0.4)',
          count: 1,
          percentage: 20
        }
      ],
      auraGradient: 'conic-gradient(#ffb700 0% 40%, #10b981 40% 60%, #a855f7 60% 80%, #00ffd5 80% 100%)'
    };
    return of(new HttpResponse({ status: 200, body: mockAnalytics })).pipe(delay(500));
  }

  if (url.includes(apiSvc.USER_MEMORY.ALL)) {
    const mockAll = [
      { content: 'Finally submitted the zeroth review documents! So relieved.', emotion: 'JOY', createdAt: new Date().toISOString(), sender: 'user' },
      { content: 'Stressed about the upcoming MCA final presentations and microservices architecture.', emotion: 'ANXIOUS', createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), sender: 'user' },
      { content: 'Feeling a bit burnt out from looking at code all day.', emotion: 'SAD', createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), sender: 'user' },
      { content: 'Had a quiet evening just listening to music and disconnecting from screens.', emotion: 'CALM', createdAt: new Date(Date.now() - 3600000 * 72).toISOString(), sender: 'user' },
      { content: 'Figured out the JWT authentication bug! Let\'s go!', emotion: 'JOY', createdAt: new Date(Date.now() - 3600000 * 96).toISOString(), sender: 'user' }
    ];
    return of(new HttpResponse({ status: 200, body: mockAll })).pipe(delay(500));
  }

  if (url.includes('/api/auth/admin/users/')) {
    const id = url.substring(url.lastIndexOf('/') + 1);
    if (req.method === 'PUT') {
      const body = req.body as { username?: string, email?: string, role?: string, isVerified?: boolean, lockedUntil?: string | null, failedAttempts?: number };
      const index = mockUsersList.findIndex(u => u.id === id);
      if (index !== -1) {
        mockUsersList[index] = {
          ...mockUsersList[index],
          ...body,
          updatedAt: new Date().toISOString()
        };
        return of(new HttpResponse({ status: 200, body: mockUsersList[index] })).pipe(delay(300));
      }
    }
    if (req.method === 'DELETE') {
      mockUsersList = mockUsersList.filter(u => u.id !== id);
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(300));
    }
  }

  if (url.includes('/api/auth/admin/users')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: mockUsersList })).pipe(delay(300));
    }
    if (req.method === 'POST') {
      const body = req.body as { username: string, email: string, role?: string };
      const newUser = {
        id: Math.random().toString(36).substring(7),
        username: body.username,
        email: body.email,
        role: body.role || 'USER',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        failedAttempts: 0,
        lockedUntil: null
      };
      mockUsersList = [...mockUsersList, newUser];
      return of(new HttpResponse({ status: 201, body: newUser })).pipe(delay(300));
    }
  }

  if (url.includes('/api/admin/memory/all')) {
    return of(new HttpResponse({ status: 200, body: mockMemoryRecords })).pipe(delay(300));
  }

  if (url.includes('/api/admin/memory/upload')) {
    return of(new HttpResponse({ status: 200, body: 'Successfully imported 15 mock records into database.' })).pipe(delay(500));
  }

  const isSpecificMemory = url.includes('/api/admin/memory/') && !url.endsWith('/all') && !url.endsWith('/upload');
  if (isSpecificMemory) {
    const id = url.substring(url.lastIndexOf('/') + 1);
    if (req.method === 'PUT') {
      const body = req.body as { content?: string, emotion?: string };
      const index = mockMemoryRecords.findIndex(r => r.id === id);
      if (index !== -1) {
        mockMemoryRecords[index] = {
          ...mockMemoryRecords[index],
          ...body
        };
        return of(new HttpResponse({ status: 200, body: 'Memory updated successfully.' })).pipe(delay(300));
      }
    }
    if (req.method === 'DELETE') {
      mockMemoryRecords = mockMemoryRecords.filter(r => r.id !== id);
      return of(new HttpResponse({ status: 200, body: 'Memory deleted successfully.' })).pipe(delay(300));
    }
  }

  if (url.endsWith('/api/admin/memory') && req.method === 'POST') {
    const body = req.body as { userId: string, content: string, emotion: string };
    const newRecord = {
      id: Math.random().toString(36).substring(7),
      userId: body.userId,
      content: body.content,
      emotion: body.emotion,
      sender: 'user',
      createdAt: new Date().toISOString()
    };
    mockMemoryRecords = [newRecord, ...mockMemoryRecords];
    return of(new HttpResponse({ status: 200, body: 'Memory created successfully.' })).pipe(delay(300));
  }

  if (url.includes('/api/gateway/admin/health')) {
    return of(new HttpResponse({ status: 200, body: mockHealthStats })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/routes/toggle')) {
    const body = req.body as { id: string, active: boolean };
    const route = mockRoutes.find(r => r.id === body.id);
    if (route) {
      route.active = body.active;
    }
    return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/routes')) {
    return of(new HttpResponse({ status: 200, body: mockRoutes })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/blocked-ips/')) {
    if (req.method === 'DELETE') {
      const ip = url.substring(url.lastIndexOf('/') + 1);
      mockBlockedIps = mockBlockedIps.filter(item => item.ip !== ip);
      mockGatewayStats.whitelistedCount++;
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/blocked-ips')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: mockBlockedIps })).pipe(delay(200));
    }
    if (req.method === 'POST') {
      const body = req.body as { ip: string, reason?: string };
      const newBlocked = {
        ip: body.ip,
        reason: body.reason || 'Manual block',
        blockedAt: new Date().toISOString()
      };
      mockBlockedIps = [...mockBlockedIps, newBlocked];
      mockGatewayStats.whitelistedCount = Math.max(0, mockGatewayStats.whitelistedCount - 1);
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/rate-limit')) {
    if (req.method === 'GET') {
      return of(new HttpResponse({ status: 200, body: { limit: mockGatewayStats.globalRateLimit } })).pipe(delay(200));
    }
    if (req.method === 'POST') {
      const body = req.body as { limit: number };
      mockGatewayStats.globalRateLimit = body.limit;
      return of(new HttpResponse({ status: 200, body: null })).pipe(delay(200));
    }
  }

  if (url.includes('/api/gateway/admin/logs')) {
    return of(new HttpResponse({ status: 200, body: mockLogs })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/admin/stats')) {
    return of(new HttpResponse({ status: 200, body: mockGatewayStats })).pipe(delay(200));
  }

  if (url.includes('/api/gateway/public/health')) {
    return of(new HttpResponse({ status: 200, body: mockHealthStats })).pipe(delay(200));
  }

  return next(req);
};
