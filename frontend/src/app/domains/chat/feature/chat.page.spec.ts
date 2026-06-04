import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { ChatPage } from './chat.page';
import { AuthService } from '../../auth/data-access/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { VoiceRecognitionService } from '../data-access/voice-recognition.service';
import { TextToSpeechService } from '../data-access/text-to-speech.service';
import { ChatStateService } from '../data-access/chat-state.service';
import { ChatHistoryService } from '../data-access/chat-history.service';
import { ChatInteractionService } from '../data-access/chat-interaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { NavController, AlertController } from '@ionic/angular';
import { signal } from '@angular/core';
import { NEVER } from 'rxjs';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;

  const authSvcStub = {
    getEmail: jasmine.createSpy('getEmail').and.returnValue(null),
    getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    logout: jasmine.createSpy('logout'),
  };
  const roleSvcStub = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
  const voiceRecognitionSvcStub = {
    isRecording: signal(false),
    transcriptionUpdate: NEVER,
    toggleRecording: jasmine.createSpy('toggleRecording'),
    destroy: jasmine.createSpy('destroy'),
  };
  const ttsSvcStub = {
    currentlySpeakingId: signal<string | null>(null),
    speakText: jasmine.createSpy('speakText'),
    cancel: jasmine.createSpy('cancel'),
  };
  const chatStateSvcStub = {
    activeQuote: signal<string>(''),
    activeStyle: signal<string>('cyberpunk'),
    currentEmotion: signal<string>('CALM'),
    currentPrimaryColor: signal<string>('#7c3aed'),
    currentSecondaryColor: signal<string>('#1e1b4b'),
    isWaitingForResponse: signal(false),
    isResting: signal(false),
    isLoadingHistory: signal(false),
    isLoadingMore: signal(false),
    todayMessages: signal<unknown[]>([]),
    scrollToBottomTrigger: signal(0),
    maintainScrollTrigger: signal(0),
    fetchDynamicQuote: jasmine.createSpy('fetchDynamicQuote'),
    checkGuestLimit: jasmine.createSpy('checkGuestLimit').and.returnValue(true),
    isInitialLoad: false,
    loadedEmail: null,
    hasMoreHistory: true,
    destroy: jasmine.createSpy('destroy'),
  };
  const chatHistorySvcStub = {
    loadChatHistory: jasmine.createSpy('loadChatHistory'),
    loadMoreHistory: jasmine.createSpy('loadMoreHistory'),
  };
  const chatInteractionSvcStub = {
    sendMessage: jasmine.createSpy('sendMessage'),
  };
  const toastSvcStub = {
    showError: jasmine.createSpy('showError'),
    showInfo: jasmine.createSpy('showInfo'),
  };
  const navCtrlStub = { navigateRoot: jasmine.createSpy('navigateRoot') };
  const alertCtrlStub = {
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ present: jasmine.createSpy('present') }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        provideStore({}),
        provideEffects([]),
        { provide: AuthService, useValue: authSvcStub },
        { provide: RoleService, useValue: roleSvcStub },
        { provide: VoiceRecognitionService, useValue: voiceRecognitionSvcStub },
        { provide: TextToSpeechService, useValue: ttsSvcStub },
        { provide: ChatStateService, useValue: chatStateSvcStub },
        { provide: ChatHistoryService, useValue: chatHistorySvcStub },
        { provide: ChatInteractionService, useValue: chatInteractionSvcStub },
        { provide: ToastService, useValue: toastSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AlertController, useValue: alertCtrlStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
