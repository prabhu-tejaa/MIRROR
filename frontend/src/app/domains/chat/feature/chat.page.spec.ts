import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideMockStore } from '@ngrx/store/testing';
import { NEVER } from 'rxjs';

import { RoleService } from '../../../core/services/role.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../auth/data-access/auth.service';
import { ChatStateService } from '../data-access/chat-state.service';
import { TextToSpeechService } from '../data-access/text-to-speech.service';
import { VoiceRecognitionService } from '../data-access/voice-recognition.service';

import { ChatPage } from './chat.page';



describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;

  const authSvcStub = {
    getEmail: jasmine.createSpy('getEmail').and.returnValue(null),
    getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    logout: jasmine.createSpy('logout'),
  };
  const roleSvcStub: { hasRole: jasmine.Spy<jasmine.Func>; } = {
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
    isInitialLoad: signal(false),
    loadedEmail: signal<string | null>(null),
    hasMoreHistory: signal(true),
    destroy: jasmine.createSpy('destroy'),
  };
  const toastSvcStub: { showError: jasmine.Spy<jasmine.Func>; showInfo: jasmine.Spy<jasmine.Func>; } = {
    showError: jasmine.createSpy('showError'),
    showInfo: jasmine.createSpy('showInfo'),
  };
  const navCtrlStub: { navigateRoot: jasmine.Spy<jasmine.Func>; } = { navigateRoot: jasmine.createSpy('navigateRoot') };
  const alertCtrlStub: { create: jasmine.Spy<jasmine.Func>; } = {
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
        provideMockStore({
          initialState: {
            auth: {
              isAuthenticated: false,
              email: null,
              username: null,
              loading: false,
              error: null,
              roles: []
            }
          }
        }),
        { provide: AuthService, useValue: authSvcStub },
        { provide: RoleService, useValue: roleSvcStub },
        { provide: VoiceRecognitionService, useValue: voiceRecognitionSvcStub },
        { provide: TextToSpeechService, useValue: ttsSvcStub },
        { provide: ChatStateService, useValue: chatStateSvcStub },
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
