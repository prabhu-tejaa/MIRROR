import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResetPasswordPage } from './reset-password.page';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { of } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';

describe('ResetPasswordPage', () => {
  let component: ResetPasswordPage;
  let fixture: ComponentFixture<ResetPasswordPage>;

  // Create your spy objects
  const navCtrlSpy = jasmine.createSpyObj('NavController', ['navigateRoot']);
  const authSvcSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);
  const translationSvcSpy = jasmine.createSpyObj('TranslationService', ['translate']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ResetPasswordPage, // Component is standalone
        ReactiveFormsModule
      ],
      providers: [
        { provide: NavController, useValue: navCtrlSpy },
        { provide: AuthService, useValue: authSvcSpy },
        { provide: TranslationService, useValue: translationSvcSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            // This emits the required email param to prevent the early return
            queryParams: of({ email: 'test@example.com' }) 
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordPage);
    component = fixture.componentInstance;
    
    // Triggers constructor and ngOnInit()
    fixture.detectChanges(); 
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.resetForm).toBeDefined(); // Form should now exist
  });
});