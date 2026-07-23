import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBackupComponent } from './admin-backup.component';

describe('AdminBackupComponent', () => {
  let component: AdminBackupComponent;
  let fixture: ComponentFixture<AdminBackupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBackupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBackupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
