import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PimpinanDashboardComponent } from './pimpinan-dashboard.component';

describe('PimpinanDashboardComponent', () => {
  let component: PimpinanDashboardComponent;
  let fixture: ComponentFixture<PimpinanDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PimpinanDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PimpinanDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
