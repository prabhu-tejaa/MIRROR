import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YouPage } from './you.page';

describe('YouPage', () => {
  let component: YouPage;
  let fixture: ComponentFixture<YouPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(YouPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
