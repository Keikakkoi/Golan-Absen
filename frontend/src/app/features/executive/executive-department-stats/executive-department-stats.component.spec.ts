import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutiveDivisionStatsComponent } from './executive-division-stats.component';

describe('ExecutiveDivisionStatsComponent', () => {
  let component: ExecutiveDivisionStatsComponent;
  let fixture: ComponentFixture<ExecutiveDivisionStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutiveDivisionStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExecutiveDivisionStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
