import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { YouPage } from './you.page';

describe('YouPage', () => {
  let component: YouPage;
  let fixture: ComponentFixture<YouPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YouPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIonicAngular()
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
