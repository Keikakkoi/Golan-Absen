import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorktypeListComponent } from './worktype-list.component';

describe('WorktypeListComponent', () => {
  let component: WorktypeListComponent;
  let fixture: ComponentFixture<WorktypeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorktypeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorktypeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
