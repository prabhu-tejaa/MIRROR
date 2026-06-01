import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mock) {
    return next(req);
  }

  const url = req.url;

  const signupPath = '/api/auth/signup';
  const loginPath = '/api/auth/login';
  const otpRequestPath = '/api/auth/otp/request';
  const otpVerifyPath = '/api/auth/otp/verify';
  const forgotPasswordRequestPath = '/api/auth/forgot-password/request';
  const forgotPasswordVerifyPath = '/api/auth/forgot-password/verify';
  const forgotPasswordResetPath = '/api/auth/forgot-password/reset';
  const refreshPath = '/api/auth/refresh';
  const logoutPath = '/api/auth/logout';

  const defaultUsername = 'mockuser';
  const mockAccessToken = 'mock_jwt_access_token_xyz';
  const mockRefreshToken = 'mock_refresh_token_abc';
  const mockRefreshedAccessToken = 'mock_jwt_access_token_xyz_refreshed';

  const triggerErrorEmail = 'error@mirror.com';
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

  if (url.includes('/api/memory/history')) {
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
      hasMore: false
    };
    return of(new HttpResponse({ status: 200, body: mockHistory })).pipe(delay(600));
  }

  if (url.includes('/api/memory/reflect')) {
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

  if (url.includes('/api/memory/analytics')) {
    const mockAnalytics = {
      JOY: 35, SAD: 10, ANXIOUS: 25, CALM: 30
    };
    return of(new HttpResponse({ status: 200, body: mockAnalytics })).pipe(delay(500));
  }

  if (url.includes('/api/memory/all')) {
    const mockAll = [
      { content: 'Finally submitted the zeroth review documents! So relieved.', emotion: 'JOY', createdAt: new Date().toISOString(), sender: 'user' },
      { content: 'Stressed about the upcoming MCA final presentations and microservices architecture.', emotion: 'ANXIOUS', createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), sender: 'user' },
      { content: 'Feeling a bit burnt out from looking at code all day.', emotion: 'SAD', createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), sender: 'user' },
      { content: 'Had a quiet evening just listening to music and disconnecting from screens.', emotion: 'CALM', createdAt: new Date(Date.now() - 3600000 * 72).toISOString(), sender: 'user' },
      { content: 'Figured out the JWT authentication bug! Let\'s go!', emotion: 'JOY', createdAt: new Date(Date.now() - 3600000 * 96).toISOString(), sender: 'user' }
    ];
    return of(new HttpResponse({ status: 200, body: mockAll })).pipe(delay(500));
  }

  return next(req);
};
