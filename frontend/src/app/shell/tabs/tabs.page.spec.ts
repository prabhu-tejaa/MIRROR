import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TabsPage } from './tabs.page';
import { StorageService } from '../../core/services/storage.service';
import { TranslationService } from '../../core/services/translation.service';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  const storageSvcStub = {
    get: jasmine.createSpy('get').and.returnValue(null),
    set: jasmine.createSpy('set'),
    remove: jasmine.createSpy('remove'),
  };
  const translationSvcStub = { translate: jasmine.createSpy('translate').and.returnValue('') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular(),
        { provide: StorageService, useValue: storageSvcStub },
        { provide: TranslationService, useValue: translationSvcStub },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
