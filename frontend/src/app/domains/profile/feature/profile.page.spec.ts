import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, AlertController } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideMockStore } from '@ngrx/store/testing';

import { RoleService } from '../../../core/services/role.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../auth/data-access/auth.service';

import { ProfilePage } from './profile.page';


describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  const authSvcStub = {
    getUserId: jasmine.createSpy('getUserId').and.returnValue(null),
    getEmail: jasmine.createSpy('getEmail').and.returnValue(null),
    isAuthenticated: signal(false),
    getAccessToken: jasmine.createSpy('getAccessToken').and.returnValue(null),
    logout: jasmine.createSpy('logout'),
  };
  const roleSvcStub = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
    userRoles: signal<string[]>([]),
  };
  const translationSvcStub: { translate: jasmine.Spy<jasmine.Func>; } = { translate: jasmine.createSpy('translate').and.returnValue('') };
  const navCtrlStub: { navigateRoot: jasmine.Spy<jasmine.Func>; } = { navigateRoot: jasmine.createSpy('navigateRoot') };
  const alertCtrlStub: { create: jasmine.Spy<jasmine.Func>; } = {
    create: jasmine.createSpy('create').and.returnValue(Promise.resolve({ present: jasmine.createSpy('present') }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: AuthService, useValue: authSvcStub },
        { provide: RoleService, useValue: roleSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
        { provide: NavController, useValue: navCtrlStub },
        { provide: AlertController, useValue: alertCtrlStub },
        provideMockStore({
          initialState: {
            auth: {
              isAuthenticated: false,
              email: null,
              username: null,
              roles: [],
              loading: false,
              error: null
            }
          }
        }),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
