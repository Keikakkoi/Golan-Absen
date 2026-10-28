import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { WorktypeListComponent } from './worktype-list.component';

describe('WorktypeListComponent', () => {
  let component: WorktypeListComponent;
  let fixture: ComponentFixture<WorktypeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorktypeListComponent],
      providers: [provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorktypeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('normalizes legacy and canonical location modes for the table and edit form', () => {
    expect(component.validationLabel({ Nama: 'WFO', IsHomeBase: false, RadiusYangBerlaku: 'kantor' })).toBe('Kantor');
    expect(component.validationLabel({ Nama: 'WFH', IsHomeBase: true, RadiusYangBerlaku: 'kantor' })).toBe('Rumah');
    expect(component.validationLabel({ Nama: 'Dinas Luar', RadiusYangBerlaku: 'tanpa_validasi' })).toBe('Tidak ada');
  });
});
