import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminNotificationSettingsComponent } from './admin-notification-settings.component';

describe('AdminNotificationSettingsComponent', () => {
  let component: AdminNotificationSettingsComponent;
  let fixture: ComponentFixture<AdminNotificationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNotificationSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNotificationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
