import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { YouPage } from './you.page';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UserMemoryService } from '../chat/data-access/user-memory.service';
import { AudioVisualizerService } from '../chat/data-access/audio-visualizer.service';
import { signal } from '@angular/core';
import { NEVER } from 'rxjs';

describe('YouPage', () => {
  let component: YouPage;
  let fixture: ComponentFixture<YouPage>;

  const authSvcStub = {
    getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
    getEmail: jasmine.createSpy('getEmail').and.returnValue('guest@mirror.tech'),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
  };
  const toastSvcStub = {
    showError: jasmine.createSpy('showError'),
    showInfo: jasmine.createSpy('showInfo'),
  };
  const userMemorySvcStub = {
    getAnalytics: jasmine.createSpy('getAnalytics').and.returnValue(NEVER),
    getAllMemories: jasmine.createSpy('getAllMemories').and.returnValue(NEVER),
    getAnalyticsCached: jasmine.createSpy('getAnalyticsCached').and.returnValue(null),
    getMemoriesCached: jasmine.createSpy('getMemoriesCached').and.returnValue(null),
    isDataLoadedOnce: jasmine.createSpy('isDataLoadedOnce').and.returnValue(false),
    setDataLoadedOnce: jasmine.createSpy('setDataLoadedOnce'),
    clearCache: jasmine.createSpy('clearCache'),
  };
  const audioVisualizerSvcStub = {
    isPlaying: signal(false),
    isLoadingAudio: signal(false),
    isRealtimeSync: signal(false),
    scale1: signal(0),
    scale2: signal(0),
    scale3: signal(0),
    scale4: signal(0),
    togglePlay: jasmine.createSpy('togglePlay'),
    stopAudio: jasmine.createSpy('stopAudio'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YouPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: ToastService, useValue: toastSvcStub },
        { provide: UserMemoryService, useValue: userMemorySvcStub },
        { provide: AudioVisualizerService, useValue: audioVisualizerSvcStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(YouPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
