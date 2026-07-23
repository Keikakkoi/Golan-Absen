import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminLateReportsComponent } from './admin-late-reports.component';

describe('AdminLateReportsComponent', () => {
  let component: AdminLateReportsComponent;
  let fixture: ComponentFixture<AdminLateReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLateReportsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLateReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
