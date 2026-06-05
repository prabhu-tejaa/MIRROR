import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export function handleMemoryRoutes(req: HttpRequest<unknown>, url: string, apiSvc: ApiService): Observable<HttpResponse<unknown> | HttpErrorResponse> | null {
  if (url.includes(apiSvc.USER_MEMORY.HISTORY)) {
    const mockHistory = {
      messages: [
        { id: '1', sender: 'user', content: 'Feeling completely overwhelmed today. I have my final MCA project review coming up and I feel like the backend isn\'t ready.', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), emotion: 'ANXIOUS' },
        { id: '2', sender: 'mirror', content: 'It is completely normal to feel overwhelmed when facing a major milestone like your final review. Let\'s break it down. What part of the backend is worrying you the most right now?', createdAt: new Date(Date.now() - 3600000 * 2 + 5000).toISOString(), emotion: 'CALM|#10b981|#06b6d4' },
        { id: '3', sender: 'user', content: 'Actually, just talking it out helped. The microservices are working, I just need to polish the UI. I can do this.', createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), emotion: 'JOY' },
        { id: '4', sender: 'mirror', content: 'I love that shift in perspective! You have already built the hardest part. Taking it one step at a time will get you across the finish line. You\'ve got this.', createdAt: new Date(Date.now() - 3600000 * 1 + 5000).toISOString(), emotion: 'JOY|#ffb700|#ff5e00' }
      ],
      hasMore: false,
      nextCursor: null
    };
    return of(new HttpResponse({ status: 200, body: mockHistory })).pipe(delay(600));
  }

  if (url.includes(apiSvc.USER_MEMORY.REFLECT)) {
    const userPrompt: string = typeof req.body === 'string' ? req.body : '';
    let responseText: string = "I hear you. Every thought you share is a stepping stone to deeper self-awareness. Let's explore this feeling together.";
    let emotionToken: string = "CALM|#10b981|#06b6d4";

    const promptUpper: string = userPrompt.toUpperCase();
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

    return of(new HttpResponse({ status: 200, body: { reflection: responseText, emotion: emotionToken } })).pipe(delay(1000));
  }

  if (url.includes(apiSvc.USER_MEMORY.ANALYTICS)) {
    const mockAnalytics = {
      totalMemories: 5,
      dominantEmotion: 'JOY',
      activeStreak: 4,
      emotionStats: [
        { key: 'JOY', pillar: 'Joyful', name: 'Joy', primaryColor: '#ffb700', secondaryColor: 'rgba(255, 183, 0, 0.4)', count: 2, percentage: 40 },
        { key: 'CALM', pillar: 'Peaceful', name: 'Calm', primaryColor: '#10b981', secondaryColor: 'rgba(16, 185, 129, 0.4)', count: 1, percentage: 20 },
        { key: 'ANXIOUS', pillar: 'Anxious', name: 'Anxious', primaryColor: '#a855f7', secondaryColor: 'rgba(168, 85, 247, 0.4)', count: 1, percentage: 20 },
        { key: 'SAD', pillar: 'Sadness', name: 'Sadness', primaryColor: '#00ffd5', secondaryColor: 'rgba(0, 255, 213, 0.4)', count: 1, percentage: 20 }
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

  return null;
}
