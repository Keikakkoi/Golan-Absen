import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAlphaReportsComponent } from './admin-alpha-reports.component';

describe('AdminAlphaReportsComponent', () => {
  let component: AdminAlphaReportsComponent;
  let fixture: ComponentFixture<AdminAlphaReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAlphaReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAlphaReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
