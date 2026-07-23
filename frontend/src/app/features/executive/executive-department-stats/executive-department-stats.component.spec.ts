import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutiveDepartmentStatsComponent } from './executive-department-stats.component';

describe('ExecutiveDepartmentStatsComponent', () => {
  let component: ExecutiveDepartmentStatsComponent;
  let fixture: ComponentFixture<ExecutiveDepartmentStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutiveDepartmentStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExecutiveDepartmentStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
