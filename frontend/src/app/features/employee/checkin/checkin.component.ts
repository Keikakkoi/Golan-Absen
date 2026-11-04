import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AlertService } from '../../../core/services/alert.service';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';

const greenPinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#2F80ED"/>
  </svg>
`;
const redPinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#D15C50"/>
  </svg>
`;
const bluePinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#3B82F6"/>
  </svg>
`;

const greenIcon = L.divIcon({
  html: greenPinSvg,
  className: 'custom-pin-icon-green',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});
const redIcon = L.divIcon({
  html: redPinSvg,
  className: 'custom-pin-icon-red',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});
const blueIcon = L.divIcon({
  html: bluePinSvg,
  className: 'custom-pin-icon-blue',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedSidebarComponent, NotificationBellComponent],
  templateUrl: './checkin.component.html',
  styleUrls: ['./checkin.component.scss']
})
export class CheckinComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly gpsUnavailableMessage = 'GPS tidak aktif. Silakan aktifkan GPS dan izinkan akses lokasi.';
  private readonly officeNotConfiguredMessage = 'Lokasi kantor belum dikonfigurasi.';
  private readonly alternativeNotSelectedMessage = 'Silakan pilih lokasi alternatif terlebih dahulu.';
  private readonly alternativeGeofenceInvalidMessage = 'Data geofence lokasi alternatif tidak valid.';
  private readonly outsideRadiusMessage = 'Posisi Anda berada di luar radius lokasi.';

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  map!: L.Map;
  marker!: L.Marker;
  circle!: L.Circle;
  accuracyCircle!: L.Circle;
  homeCircle!: L.Circle;
  homeMarker!: L.Marker;
  officeMarker!: L.Marker;
  alternativeCircle!: L.Circle;
  alternativeMarker!: L.Marker;
  fieldCircle!: L.Circle;
  fieldMarker!: L.Marker;
  
  // Kantor Koordinat (Fallback defaults)
  officeLat = -6.1202471;
  officeLng = 106.7118952;
  radius = 100; // meters
  officeConfigured = false;

  currentLat = 0;
  currentLng = 0;
  currentAccuracy = 0;
  locationTimestamp = 0;
  locationSource = '';
  distanceToOffice = 0;
  isGpsActive = false;
  statusText = 'Menghubungkan GPS...';
  locationDistanceText = '';
  
  employeeProfile: any = null;
  
  isLocationValid = false;
  isLocationRequired = true;
  locationError = '';
  cameraError = '';
  isCameraReady = false;
  isSubmitting = false;
  
  isScheduleLoaded = false;
  isViewInitialized = false;
  isHardwareInitialized = false;
  
  tipeKerja: string = 'WFO';
  private readonly fallbackWorkTypes = [
    { Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo', LocationModeLabel: 'WFO' },
    { Nama: 'WFH', RadiusYangBerlaku: 'rumah', canonical_type: 'wfh', LocationModeLabel: 'WFH' },
    { Nama: 'Lokasi Alternatif', RadiusYangBerlaku: 'alternatif', canonical_type: 'alternative_location', LocationModeLabel: 'Lokasi Alternatif' },
    { Nama: 'Dinas Luar', RadiusYangBerlaku: 'tanpa_validasi' }
  ];
  // Keep the selector usable even before the API response arrives.
  workTypes: any[] = this.fallbackWorkTypes.map(workType => ({ ...workType }));
  alternativeLocations: any[] = [];
  fieldLocations: any[] = [];
  selectedAlternativeLocationId: number | null = null;
  selectedFieldLocationId: number | null = null;
  locationSelectionLoading = true;
  locationSelectionError = '';
  openTipeKerja = false;
  
  stream!: MediaStream;
  watchId: number | null = null;
  capturedImage: string | null = null;
  capturedBlob: Blob | null = null;

  todayRecord: any = null; // Store today's attendance record
  hasCheckedIn: boolean = false;
  hasCheckedOut: boolean = false;
  hasLeaveToday: boolean = false;
  leaveStatus = '';
  isCheckoutPage = false;
  canPunchBySchedule = false;
  attendanceClosed = false;
  scheduleMessage = '';
  isWorkingDay = true;

  // Clock state for the attendance screen.
  currentTime = new Date();
  private clockInterval: any;

  constructor(
    private attendanceService: AttendanceService,
    private http: HttpClient,
    private router: Router,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.isCheckoutPage = this.router.url === '/employee/checkout';
    this.checkTodayAttendance();
    this.loadWorkTypes();
    this.loadLocationSelections();
    this.loadEmployeeProfile();
    this.loadOfficeInfo();
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
      this.updateAttendanceWindow();
    }, 1000);
    this.updateAttendanceWindow();
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    this.tryInitHardware();
  }

  private tryInitHardware(): void {
    if (this.isHardwareInitialized || !this.isViewInitialized || !this.isScheduleLoaded) return;
    if (this.hasCheckedOut || this.hasLeaveToday || !this.isWorkingDay || this.attendanceClosed) return;

    // Use setTimeout to ensure Angular has rendered the *ngIf blocks
    setTimeout(() => {
      // Check if elements are bound
      if (!document.getElementById('map') || !this.videoElement) {
        // If not in DOM yet, try again shortly
        setTimeout(() => this.tryInitHardware(), 100);
        return;
      }
      this.isHardwareInitialized = true;
      this.initMap();
      this.startLocationTracking();
      this.startCamera();
    }, 0);
  }

  shiftStartTime: number = 9 * 3600;
  shiftOpenTime: number = 9 * 3600;
  shiftCheckoutTime: number = 17 * 3600;
  shiftCloseTime: number = 18 * 3600;
  shiftOvernight = false;
  todayDashboardMessage: string = '';
  effectiveShiftName = '-';
  effectiveScheduleSource = '';
  private scheduleStartAt: Date | null = null;
  private scheduleCheckinStartAt: Date | null = null;
  private scheduleEndAt: Date | null = null;
  private scheduleDeadlineAt: Date | null = null;

  private checkTodayAttendance(): void {
    this.attendanceService.getHistory().subscribe({
      next: (records) => {
        const todayStr = this.getAttendanceDateKey(new Date());
        const todayRecord = records.find(r => r.Tanggal.startsWith(todayStr));
        if (todayRecord) {
          this.todayRecord = todayRecord;
          this.hasCheckedIn = todayRecord.JamMasuk != null;
          this.hasCheckedOut = todayRecord.JamPulang != null;
          this.hasLeaveToday = !this.hasCheckedIn && (todayRecord.Status === 'Izin' || todayRecord.Status === 'Cuti');
          this.leaveStatus = this.hasLeaveToday ? todayRecord.Status : '';
          if (this.hasCheckedIn && !this.hasCheckedOut) {
            this.tipeKerja = todayRecord.TipeKerja;
            this.updateOfficeGeofence();
            this.updateMapGeofences();
            this.checkRadius();
          }
        }
        
        // Also fetch dashboard stats for dynamic shift times
        this.attendanceService.getDashboardStats().subscribe({
          next: (stats) => {
            if (stats.schedule) {
              const effective = stats.effective_schedule || stats.schedule;
              this.effectiveShiftName = effective.shift_name || '-';
              this.effectiveScheduleSource = effective.source || '';
              const parseTime = (timeStr: string) => {
                const parts = timeStr.split(':');
                return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60;
              };
              this.scheduleStartAt = this.parseScheduleDateTime(stats.schedule.start_at);
              this.scheduleCheckinStartAt = this.parseScheduleDateTime(stats.schedule.checkin_start_at);
              this.scheduleEndAt = this.parseScheduleDateTime(stats.schedule.end_at);
              this.scheduleDeadlineAt = this.parseScheduleDateTime(stats.schedule.deadline_at);
              this.isWorkingDay = stats.is_working_day !== false && stats.schedule.is_working_day !== false;
              if (stats.schedule.start) {
                this.shiftStartTime = parseTime(stats.schedule.start);
              }
              this.shiftOpenTime = stats.schedule.checkin_start
                ? parseTime(stats.schedule.checkin_start)
                : this.shiftStartTime;
              if (stats.schedule.end) {
                this.shiftCheckoutTime = parseTime(stats.schedule.end);
              }
              if (stats.schedule.deadline) {
                this.shiftCloseTime = parseTime(stats.schedule.deadline);
              }
              this.shiftOvernight = Boolean(stats.schedule.overnight);
              if (this.shiftOvernight) {
                if (this.shiftCheckoutTime < this.shiftStartTime) this.shiftCheckoutTime += 24 * 3600;
                if (this.shiftCloseTime < this.shiftStartTime) this.shiftCloseTime += 24 * 3600;
              }
            } else {
              this.effectiveShiftName = '-';
              this.effectiveScheduleSource = '';
              this.isWorkingDay = false;
              this.todayDashboardMessage = 'Jadwal efektif belum tersedia.';
            }
            if (stats.todayMessage) {
              this.todayDashboardMessage = stats.todayMessage;
            }
            this.isScheduleLoaded = true;
            this.updateAttendanceWindow();
            this.tryInitHardware();
          },
          error: (err) => {
            console.error('Failed to load dashboard stats', err);
            this.effectiveShiftName = '-';
            this.effectiveScheduleSource = '';
            this.isWorkingDay = false;
            this.todayDashboardMessage = 'Jadwal efektif tidak dapat dimuat.';
            this.isScheduleLoaded = true;
            this.updateAttendanceWindow();
            this.tryInitHardware();
          }
        });
      },
      error: (err) => {
        console.error('Failed to load attendance history', err);
        this.effectiveShiftName = '-';
        this.effectiveScheduleSource = '';
        this.isWorkingDay = false;
        this.todayDashboardMessage = 'Jadwal efektif tidak dapat dimuat.';
        // Fallback so it doesn't hang forever
        this.isScheduleLoaded = true;
        this.updateAttendanceWindow();
        this.tryInitHardware();
      }
    });
  }

  private getAttendanceDateKey(now: Date): string {
    const date = new Date(now);
    if (date.getHours() < 7) date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseScheduleDateTime(value: unknown): Date | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  scheduleSourceLabel(): string {
    if (this.effectiveScheduleSource === 'employee_specific') return 'jadwal khusus karyawan';
    if (this.effectiveScheduleSource === 'global_schedule') return 'jadwal khusus global';
    if (this.effectiveScheduleSource === 'employee_assignment') return 'assignment shift dasar';
    if (this.effectiveScheduleSource === 'regular_default') return 'Jadwal Reguler';
    return this.effectiveScheduleSource === 'system_fallback' ? 'fallback sistem' : '';
  }

  private updateAttendanceWindow(): void {
    if (!this.isScheduleLoaded) {
      // Don't evaluate window if schedule is not loaded yet to prevent early 'Absensi Ditutup' flash
      this.canPunchBySchedule = false;
      this.attendanceClosed = false;
      this.scheduleMessage = 'Memuat jadwal absensi...';
      return;
    }

    if (!this.isWorkingDay) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = false;
      this.scheduleMessage = 'Hari ini bukan hari kerja untuk shift Anda.';
      return;
    }

    if (this.hasLeaveToday) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = true;
      this.scheduleMessage = this.todayDashboardMessage || `Status ${this.leaveStatus} sudah tercatat untuk hari ini.`;
      return;
    }

    if (this.scheduleStartAt && this.scheduleCheckinStartAt && this.scheduleEndAt && this.scheduleDeadlineAt) {
      this.updateAttendanceWindowFromDateTimes();
      return;
    }
    let seconds = this.currentTime.getHours() * 3600 + this.currentTime.getMinutes() * 60 + this.currentTime.getSeconds();
    if (this.shiftOvernight && seconds < this.shiftOpenTime) {
      seconds += 24 * 3600;
    }

    if (seconds < this.shiftOpenTime) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = false;
      this.scheduleMessage = this.todayDashboardMessage || `Absensi dibuka pukul ${this.formatSeconds(this.shiftOpenTime)}.`;
      return;
    }

    if (seconds > this.shiftCloseTime) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = true;
      this.scheduleMessage = this.todayDashboardMessage || 'Batas absensi hari ini telah lewat. Check-out otomatis diterapkan.';
      return;
    }

    this.attendanceClosed = false;
    if (this.hasCheckedIn && !this.hasCheckedOut) {
      this.canPunchBySchedule = seconds >= this.shiftCheckoutTime;
      this.scheduleMessage = this.canPunchBySchedule ? '' : (this.todayDashboardMessage || 'Check-out belum dapat dilakukan.');
    } else if (!this.hasCheckedIn) {
      this.canPunchBySchedule = !this.isCheckoutPage && seconds < this.shiftCheckoutTime;
      this.scheduleMessage = this.isCheckoutPage
        ? 'Belum ada check-in untuk hari ini.'
        : (this.canPunchBySchedule ? '' : (this.todayDashboardMessage || 'Batas check-in hari ini sudah lewat.'));
    } else {
      this.canPunchBySchedule = false;
      this.scheduleMessage = '';
    }
  }

  private updateAttendanceWindowFromDateTimes(): void {
    const now = this.currentTime.getTime();
    const checkinStart = this.scheduleCheckinStartAt!.getTime();
    const checkoutStart = this.scheduleEndAt!.getTime();
    const deadline = this.scheduleDeadlineAt!.getTime();

    if (now < checkinStart) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = false;
      this.scheduleMessage = this.todayDashboardMessage || `Absensi dibuka pukul ${this.formatDateTime(this.scheduleCheckinStartAt!)}`;
      return;
    }

    if (now > deadline) {
      this.canPunchBySchedule = false;
      this.attendanceClosed = true;
      this.scheduleMessage = this.todayDashboardMessage || 'Batas absensi hari ini telah lewat. Check-out otomatis diterapkan.';
      return;
    }

    this.attendanceClosed = false;
    if (this.hasCheckedIn && !this.hasCheckedOut) {
      this.canPunchBySchedule = now >= checkoutStart && now <= deadline;
      this.scheduleMessage = this.canPunchBySchedule ? '' : (this.todayDashboardMessage || 'Check-out belum dapat dilakukan.');
    } else if (!this.hasCheckedIn) {
      this.canPunchBySchedule = !this.isCheckoutPage && now < checkoutStart;
      this.scheduleMessage = this.isCheckoutPage
        ? 'Belum ada check-in untuk hari ini.'
        : (this.canPunchBySchedule ? '' : (this.todayDashboardMessage || 'Batas check-in hari ini sudah lewat.'));
    } else {
      this.canPunchBySchedule = false;
      this.scheduleMessage = '';
    }
  }

  private formatDateTime(value: Date): string {
    return value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private formatSeconds(totalSeconds: number): string {
    const normalized = totalSeconds % (24 * 3600);
    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private loadEmployeeProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.employeeProfile = data;
        this.updateMapGeofences();
        this.checkRadius();
      },
      error: (err) => console.error('Failed to load profile', err)
    });
  }

  private loadWorkTypes(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.applyWorkTypes(this.fallbackWorkTypes);
      return;
    }
    
    this.http.get<any[]>('http://localhost:8080/api/v1/worktypes', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.applyWorkTypes(data);
      },
      error: (err) => {
        console.error('Failed to load work types', err);
        this.applyWorkTypes(this.fallbackWorkTypes);
      }
    });
  }

  private loadLocationSelections(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.locationSelectionLoading = false;
      this.syncSelectedLocation();
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    let completed = 0;
    const complete = () => {
      completed += 1;
      if (completed === 2) this.locationSelectionLoading = false;
      this.syncSelectedLocation();
    };

    this.http.get<any>('http://localhost:8080/api/v1/employee/alternative-locations', { headers }).subscribe({
      next: response => {
        const rows = Array.isArray(response) ? response : response?.data;
        this.alternativeLocations = (Array.isArray(rows) ? rows : []).filter(location => this.isApprovedActiveAlternative(location));
        complete();
      },
      error: error => {
        this.alternativeLocations = [];
        this.locationSelectionError = this.apiLocationError(error, 'Lokasi alternatif tidak dapat dimuat.');
        complete();
      }
    });

    this.http.get<any>('http://localhost:8080/api/v1/locations/field/active', { headers }).subscribe({
      next: response => {
        const rows = Array.isArray(response) ? response : response?.data;
        this.fieldLocations = (Array.isArray(rows) ? rows : []).filter(location => this.isActiveFieldLocation(location));
        complete();
      },
      error: error => {
        this.fieldLocations = [];
        this.locationSelectionError = this.apiLocationError(error, 'Lokasi lapangan aktif tidak dapat dimuat.');
        complete();
      }
    });
  }

  private apiLocationError(error: any, fallback: string): string {
    if (error?.status === 401) return 'Sesi login telah kedaluwarsa. Silakan login kembali.';
    return error?.error?.error || error?.error?.message || fallback;
  }

  canonicalType(workType: any): string {
    const configured = String(workType?.canonical_type ?? workType?.CanonicalType ?? '').trim().toLowerCase();
    if (['wfo', 'wfh', 'alternative_location', 'field_location'].includes(configured)) return configured;
    const mode = String(workType?.RadiusYangBerlaku ?? '').trim().toLowerCase();
    if (mode === 'rumah' || workType?.IsHomeBase) return 'wfh';
    if (mode === 'alternatif' || mode === 'alternative') return 'alternative_location';
    if (mode === 'lapangan' || mode === 'field') return 'field_location';
    const name = String(workType?.Nama ?? '').trim().toLowerCase();
    if (name === 'wfo') return 'wfo';
    if (name === 'wfh') return 'wfh';
    if (name === 'lokasi alternatif' || name === 'alternative location') return 'alternative_location';
    if (name === 'lokasi lapangan' || name === 'field location') return 'field_location';
    return '';
  }

  selectableWorkTypes(): any[] {
    return this.workTypes.filter(workType => {
      if (this.canonicalType(workType) !== 'field_location') return true;
      return this.isFieldLocationAllowedByWorkType(workType) || (this.hasCheckedIn && workType.Nama === this.tipeKerja);
    });
  }

  private locationId(location: any): number {
    return Number(location?.id ?? location?.ID ?? 0);
  }

  private isApprovedActiveAlternative(location: any): boolean {
    const approval = String(location?.status ?? location?.status_approval ?? location?.StatusApproval ?? '').toLowerCase();
    const active = String(location?.status_aktif ?? location?.StatusAktif ?? '').toLowerCase();
    return approval === 'approved' && active === 'active';
  }

  private isActiveFieldLocation(location: any): boolean {
    const status = String(location?.status_aktif ?? location?.StatusAktif ?? '').toLowerCase();
    return status === 'active' && !location?.deleted_at && !location?.DeletedAt;
  }

  private isFieldLocationAllowedByWorkType(workType: any): boolean {
    if (this.canonicalType(workType) !== 'field_location') return false;
    if (workType?.field_location_active === false || workType?.FieldLocationActive === false) return false;
    const id = Number(workType?.field_location_id ?? workType?.FieldLocationID ?? 0);
    return id > 0 && this.fieldLocations.some(location => this.locationId(location) === id && this.isActiveFieldLocation(location));
  }

  private syncSelectedLocation(): void {
    const selected = this.workTypes.find(workType => workType.Nama === this.tipeKerja);
    const canonical = this.canonicalType(selected);
    if (canonical === 'alternative_location') {
      // Keep an explicit empty selection so the user gets a useful prompt
      // instead of silently checking in against the first available location.
      if (!this.alternativeLocations.some(location => this.locationId(location) === this.selectedAlternativeLocationId)) {
        this.selectedAlternativeLocationId = null;
      }
      this.selectedFieldLocationId = null;
    } else if (canonical === 'field_location') {
      const configuredID = Number(selected?.field_location_id ?? selected?.FieldLocationID ?? 0);
      this.selectedFieldLocationId = this.fieldLocations.some(location => this.locationId(location) === configuredID) ? configuredID : null;
      this.selectedAlternativeLocationId = null;
    } else {
      this.selectedAlternativeLocationId = null;
      this.selectedFieldLocationId = null;
    }
    this.updateMapGeofences();
    this.checkRadius();
  }

  private applyWorkTypes(apiWorkTypes: any[] | null | undefined): void {
    const workTypes = Array.isArray(apiWorkTypes) ? apiWorkTypes.filter(w => w?.Nama) : [];
    const merged = [...workTypes];

    // The API remains the source for custom types, while the three built-in
    // choices remain available if an old/empty database or stale cache omits
    // one of them.
    for (const fallback of this.fallbackWorkTypes) {
      if (!merged.some(workType => workType.Nama === fallback.Nama)) {
        merged.push({ ...fallback });
      }
    }

    // A record from today wins over any default selected while requests race.
    // Keep its option visible even if an administrator removed that type later.
    const recordedType = this.todayRecord?.TipeKerja;
    if (this.hasCheckedIn && recordedType && !merged.some(workType => workType.Nama === recordedType)) {
      merged.push({
        Nama: recordedType,
        RadiusYangBerlaku: recordedType === 'WFH' ? 'rumah' : (recordedType === 'WFO' ? 'kantor' : 'tanpa_validasi'),
        canonical_type: recordedType === 'WFH' ? 'wfh' : (recordedType === 'WFO' ? 'wfo' : undefined)
      });
    }

    this.workTypes = merged;
    if (this.hasCheckedIn && recordedType) {
      this.tipeKerja = recordedType;
    } else {
      this.tipeKerja = merged.find(workType => workType.Nama === 'WFO')?.Nama || merged[0]?.Nama || 'WFO';
    }
    this.updateOfficeGeofence();
    this.updateMapGeofences();
    this.checkRadius();
    this.syncSelectedLocation();
  }

  private loadOfficeInfo(): void {
    this.attendanceService.getOfficeInfo().subscribe({
      next: (office) => {
        const lat = Number(office?.Latitude ?? office?.latitude);
        const lng = Number(office?.Longitude ?? office?.longitude);
        const radius = Number(office?.RadiusMeter ?? office?.radius_meter);
        this.officeConfigured = this.isValidGeofence(lat, lng, radius);
        if (this.officeConfigured) {
          this.officeLat = lat;
          this.officeLng = lng;
          this.radius = radius;
          this.updateOfficeGeofence();
          this.checkRadius();
        }
      },
      error: (err) => {
        this.officeConfigured = false;
        this.updateOfficeGeofence();
        this.checkRadius();
        console.error('Failed to load office location', err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([this.officeLat, this.officeLng], 17);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateOfficeGeofence();
    this.updateMapGeofences();
  }

  private updateOfficeGeofence(): void {
    if (!this.map) return;
    if (this.circle) {
      this.map.removeLayer(this.circle);
    }
    if (this.officeMarker) {
      this.map.removeLayer(this.officeMarker);
    }

    const selectedWorkType = this.workTypes.find(w => w.Nama === this.tipeKerja);
    if (!this.officeConfigured || this.validationMode(selectedWorkType) !== 'kantor') return;

    this.circle = L.circle([this.officeLat, this.officeLng], {
      color: '#1769AA',
      fillColor: '#2F80ED',
      fillOpacity: 0.15,
      weight: 2,
      radius: this.radius
    }).addTo(this.map);

    this.officeMarker = L.marker([this.officeLat, this.officeLng], { icon: redIcon })
      .addTo(this.map)
      .bindPopup('Kantor Pusat (PT Golan Digital Kreatif)');
    
    if (this.currentLat === 0 && this.currentLng === 0) {
      this.map.setView([this.officeLat, this.officeLng], 17);
    }
  }

  private updateMapGeofences(): void {
    if (!this.map) return;

    if (this.homeCircle) {
      this.map.removeLayer(this.homeCircle);
    }
    if (this.homeMarker) {
      this.map.removeLayer(this.homeMarker);
    }
    if (this.alternativeCircle) {
      this.map.removeLayer(this.alternativeCircle);
    }
    if (this.alternativeMarker) {
      this.map.removeLayer(this.alternativeMarker);
    }
    if (this.fieldCircle) {
      this.map.removeLayer(this.fieldCircle);
    }
    if (this.fieldMarker) {
      this.map.removeLayer(this.fieldMarker);
    }

    const selectedWorkType = this.workTypes.find(w => w.Nama === this.tipeKerja);
    const canonical = this.canonicalType(selectedWorkType);
    if (canonical === 'alternative_location') {
      const location = this.selectedAlternativeLocation();
      if (location) this.drawSelectedLocation(location, 'alternative');
      return;
    }
    if (canonical === 'field_location') {
      const location = this.selectedFieldLocation();
      if (location) this.drawSelectedLocation(location, 'field');
      return;
    }
    if (this.validationMode(selectedWorkType) === 'rumah' && this.employeeProfile?.Employee) {
      const home = this.employeeProfile.Employee.HomeLocation || this.employeeProfile.Employee.home_location;
      const hLat = Number(home?.LatitudeRumah ?? home?.latitude_rumah ?? this.employeeProfile.Employee.HomeLatitude ?? 0);
      const hLng = Number(home?.LongitudeRumah ?? home?.longitude_rumah ?? this.employeeProfile.Employee.HomeLongitude ?? 0);
      const homeRadius = Number(home?.RadiusMeter ?? home?.radius_meter ?? 0);
      if (hLat !== 0 && hLng !== 0 && homeRadius > 0) {
        this.homeCircle = L.circle([hLat, hLng], {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          weight: 2,
          radius: homeRadius
        }).addTo(this.map);
        
        this.homeMarker = L.marker([hLat, hLng], { icon: blueIcon }).addTo(this.map).bindPopup('Lokasi Rumah Anda');
      }
    }
  }

  private selectedAlternativeLocation(): any | null {
    return this.alternativeLocations.find(location => this.locationId(location) === this.selectedAlternativeLocationId) || null;
  }

  private selectedFieldLocation(): any | null {
    return this.fieldLocations.find(location => this.locationId(location) === this.selectedFieldLocationId) || null;
  }

  private drawSelectedLocation(location: any, source: 'alternative' | 'field'): void {
    const latitude = Number(location?.latitude ?? location?.Latitude);
    const longitude = Number(location?.longitude ?? location?.Longitude);
    const radius = Number(location?.radius_meter ?? location?.RadiusMeter);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius) || radius <= 0) return;
    const point: L.LatLngExpression = [latitude, longitude];
    const color = source === 'alternative' ? '#3B82F6' : '#8B5CF6';
    const marker = source === 'alternative' ? blueIcon : greenIcon;
    const popup = `${location?.nama_lokasi ?? location?.NamaLokasi ?? 'Lokasi'} (${radius} meter)`;
    const circle = L.circle(point, { color, fillColor: color, fillOpacity: 0.15, weight: 2, radius }).addTo(this.map);
    const pin = L.marker(point, { icon: marker }).addTo(this.map).bindPopup(popup);
    if (source === 'alternative') {
      this.alternativeCircle = circle;
      this.alternativeMarker = pin;
    } else {
      this.fieldCircle = circle;
      this.fieldMarker = pin;
    }
    if (this.currentLat === 0 && this.currentLng === 0) this.map.setView(point, 17);
  }

  selectedCanonicalType(): string {
    return this.canonicalType(this.workTypes.find(workType => workType.Nama === this.tipeKerja));
  }

  selectedLocation(): any | null {
    const canonical = this.selectedCanonicalType();
    return canonical === 'alternative_location' ? this.selectedAlternativeLocation() : canonical === 'field_location' ? this.selectedFieldLocation() : null;
  }

  selectedLocationName(): string {
    const location = this.selectedLocation();
    return location?.nama_lokasi ?? location?.NamaLokasi ?? '';
  }

  selectedLocationDescription(): string {
    const location = this.selectedLocation();
    return location?.deskripsi ?? location?.Deskripsi ?? '';
  }

  selectedLocationCoordinates(): string {
    const location = this.selectedLocation();
    if (!location) return '';
    return `${location.latitude ?? location.Latitude}, ${location.longitude ?? location.Longitude}`;
  }

  selectedLocationRadius(): number {
    const location = this.selectedLocation();
    return Number(location?.radius_meter ?? location?.RadiusMeter ?? 0);
  }

  onAlternativeLocationChange(): void {
    this.updateMapGeofences();
    this.checkRadius();
  }

  onFieldLocationChange(): void {
    this.updateMapGeofences();
    this.checkRadius();
  }

  private validationMode(workType: any): 'kantor' | 'rumah' | 'alternatif' | 'lapangan' | 'tanpa_validasi' {
    const canonical = this.canonicalType(workType);
    if (canonical === 'alternative_location') return 'alternatif';
    if (canonical === 'field_location') return 'lapangan';
    const configured = String(workType?.RadiusYangBerlaku || '').trim().toLowerCase();
    if (configured === 'rumah' || configured === 'tanpa_validasi' || configured === 'alternatif' || configured === 'lapangan') return configured;
    // Compatibility for work types returned by an older API/cache.
    if (workType?.IsHomeBase) return 'rumah';
    if (configured === 'kantor' || String(workType?.Nama || '').trim().toUpperCase() === 'WFO') return 'kantor';
    return 'tanpa_validasi';
  }

  onTipeKerjaChange(): void {
    this.syncSelectedLocation();
    this.updateOfficeGeofence();
    this.updateMapGeofences();
    this.checkRadius();
  }

  toggleTipeKerja(): void {
    if (this.hasCheckedIn) return;
    this.openTipeKerja = !this.openTipeKerja;
  }

  selectTipeKerja(value: string): void {
    if (this.hasCheckedIn) return;
    if (!this.selectableWorkTypes().some(workType => workType.Nama === value)) return;
    this.tipeKerja = value;
    this.openTipeKerja = false;
    this.onTipeKerjaChange();
  }

  onTipeKerjaKeydown(event: KeyboardEvent): void {
    if (this.hasCheckedIn) return;

    const currentIndex = Math.max(0, this.workTypes.findIndex(wt => wt.Nama === this.tipeKerja));
    let nextIndex = currentIndex;

    if (event.key === 'Escape') {
      this.openTipeKerja = false;
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleTipeKerja();
      return;
    }
    if (event.key === 'ArrowDown') nextIndex = Math.min(this.workTypes.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
    else return;

    event.preventDefault();
    const nextType = this.workTypes[nextIndex];
    if (nextType) this.selectTipeKerja(nextType.Nama);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.event-type-picker')) this.openTipeKerja = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openTipeKerja = false;
  }

  private startLocationTracking(): void {
    if (!navigator.geolocation) {
      this.locationError = this.gpsUnavailableMessage;
      this.isGpsActive = false;
      this.isLocationValid = false;
      this.statusText = this.gpsUnavailableMessage;
      return;
    }

    this.statusText = 'Mencari lokasi GPS...';
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy);
        if (!Number.isFinite(accuracy) || accuracy < 0) return;

        // Keep the best fix during acquisition. Once a usable fix exists,
        // accept a newer nearby-quality fix so a user who moves is not stuck
        // on an old coordinate.
        const shouldUseFix = this.locationTimestamp === 0
          || accuracy < this.currentAccuracy
          || (position.timestamp > this.locationTimestamp && accuracy <= Math.max(this.currentAccuracy * 1.5, 30));
        if (!shouldUseFix) return;

        this.currentLat = position.coords.latitude;
        this.currentLng = position.coords.longitude;
        this.currentAccuracy = accuracy;
        this.locationTimestamp = position.timestamp || Date.now();
        this.locationSource = accuracy <= 30 ? 'GPS akurasi tinggi' : 'GPS/perangkat';
        this.isGpsActive = true;
        this.locationError = '';

        this.updateUserMarker();
        this.checkRadius();
      },
      (error) => {
        this.isGpsActive = false;
        this.isLocationValid = false;
        this.locationError = this.gpsUnavailableMessage;
        this.checkRadius();
        this.statusText = this.gpsUnavailableMessage;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  private updateUserMarker(): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([this.currentLat, this.currentLng]);
    } else {
      this.marker = L.marker([this.currentLat, this.currentLng], {
        icon: greenIcon
      }).addTo(this.map).bindPopup('Posisi Karyawan (Anda)');
      
      this.map.setView([this.currentLat, this.currentLng], 17);
    }
    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([this.currentLat, this.currentLng]).setRadius(this.currentAccuracy);
    } else {
      this.accuracyCircle = L.circle([this.currentLat, this.currentLng], {
        color: '#2F80ED', fillColor: '#2F80ED', fillOpacity: 0.08, weight: 1,
        radius: this.currentAccuracy
      }).addTo(this.map);
    }
  }

  private checkRadius(): void {
    this.locationDistanceText = '';
    this.locationError = '';
    this.isLocationValid = false;

    const selectedWorkType = this.workTypes.find(w => w.Nama === this.tipeKerja);
    const mode = this.validationMode(selectedWorkType);
    this.isLocationRequired = mode !== 'tanpa_validasi';

    if (mode === 'tanpa_validasi') {
      this.isLocationValid = true;
      this.locationError = '';
      this.statusText = 'Lokasi tidak memerlukan validasi radius untuk tipe kerja ini';
      if (this.isGpsActive && (this.currentLat !== 0 || this.currentLng !== 0)) {
        this.locationDistanceText = 'Koordinat GPS akan disimpan jika tersedia';
      }
      return;
    }

    if (!this.isGpsActive || (this.currentLat === 0 && this.currentLng === 0)) {
      this.isLocationValid = false;
      this.locationError = this.gpsUnavailableMessage;
      this.statusText = this.gpsUnavailableMessage;
      return;
    }

    if (mode === 'kantor' && !this.officeConfigured) {
      this.locationError = this.officeNotConfiguredMessage;
      this.statusText = 'Lokasi kantor belum dikonfigurasi';
      return;
    }

    if (mode === 'rumah' && this.employeeProfile?.Employee) {
      const home = this.employeeProfile.Employee.HomeLocation || this.employeeProfile.Employee.home_location;
      const hLat = Number(home?.LatitudeRumah ?? home?.latitude_rumah ?? this.employeeProfile.Employee.HomeLatitude ?? 0);
      const hLng = Number(home?.LongitudeRumah ?? home?.longitude_rumah ?? this.employeeProfile.Employee.HomeLongitude ?? 0);
      const homeRadius = Number(home?.RadiusMeter ?? home?.radius_meter ?? 0);
      if (!this.isValidGeofence(hLat, hLng, homeRadius)) {
        this.locationError = 'Lokasi rumah untuk absensi WFH belum diatur oleh HRD.';
        this.statusText = 'Lokasi rumah belum diatur';
        return;
      }
    }

    if (mode === 'rumah' && !this.employeeProfile?.Employee) {
      this.locationError = 'Memuat profil karyawan...';
      this.statusText = 'Memuat profil karyawan...';
      return;
    }

    const userLatLng = L.latLng(this.currentLat, this.currentLng);
    if (mode === 'alternatif' || mode === 'lapangan') {
      const location = this.selectedLocation();
      if (!location) {
        this.isLocationValid = false;
        this.locationError = mode === 'alternatif'
          ? this.alternativeNotSelectedMessage
          : 'Lokasi lapangan aktif belum tersedia atau belum dikonfigurasi pada tipe kerja.';
        this.statusText = 'Lokasi check-in belum dipilih';
        return;
      }
      const latitude = Number(location.latitude ?? location.Latitude);
      const longitude = Number(location.longitude ?? location.Longitude);
      const locationRadius = this.selectedLocationRadius();
      if (!this.isValidGeofence(latitude, longitude, locationRadius)) {
        this.isLocationValid = false;
        this.locationError = mode === 'alternatif'
          ? this.alternativeGeofenceInvalidMessage
          : 'Data geofence lokasi lapangan tidak valid.';
        this.statusText = 'Lokasi tidak valid';
        return;
      }
      const distance = Math.round(userLatLng.distanceTo(L.latLng(latitude, longitude)));
      this.isLocationValid = distance <= locationRadius + Math.min(this.currentAccuracy, 50);
      this.locationError = this.isLocationValid ? '' : this.outsideRadiusMessage;
      this.statusText = this.isLocationValid ? 'Lokasi terverifikasi' : 'Lokasi di luar radius';
      this.locationDistanceText = `${this.isLocationValid ? 'Radius' : 'Jarak'} ${this.formatDistance(distance)} meter dari ${mode === 'alternatif' ? 'lokasi alternatif' : 'lokasi lapangan'}`;
      return;
    }
    const officeLatLng = L.latLng(this.officeLat, this.officeLng);
    this.distanceToOffice = Math.round(userLatLng.distanceTo(officeLatLng));
    
    if (mode === 'rumah') {
      if (this.employeeProfile?.Employee) {
        const home = this.employeeProfile.Employee.HomeLocation || this.employeeProfile.Employee.home_location;
        const hLat = Number(home?.LatitudeRumah ?? home?.latitude_rumah ?? this.employeeProfile.Employee.HomeLatitude ?? 0);
        const hLng = Number(home?.LongitudeRumah ?? home?.longitude_rumah ?? this.employeeProfile.Employee.HomeLongitude ?? 0);
        const homeRadius = Number(home?.RadiusMeter ?? home?.radius_meter ?? 0);
        if (!this.isValidGeofence(hLat, hLng, homeRadius)) {
          this.isLocationValid = false;
          this.locationError = 'Lokasi rumah untuk absensi WFH belum diatur oleh HRD.';
          this.statusText = 'Lokasi rumah belum diatur';
          return;
        }
        const homeLatLng = L.latLng(hLat, hLng);
        const homeDistance = Math.round(userLatLng.distanceTo(homeLatLng));
        this.isLocationValid = homeDistance <= homeRadius + Math.min(this.currentAccuracy, 50);
        if (!this.isLocationValid) {
          this.locationError = this.outsideRadiusMessage;
        } else {
          this.locationError = '';
        }
        this.statusText = this.isLocationValid
          ? 'Lokasi terverifikasi'
          : 'Lokasi di luar radius';
        this.locationDistanceText = `${this.isLocationValid ? 'Radius' : 'Jarak'} ${this.formatDistance(homeDistance)} meter dari rumah`;
      } else {
        this.isLocationValid = false;
        this.locationError = 'Memuat profil karyawan...';
        this.statusText = 'Memuat profil karyawan...';
      }
    } else if (mode === 'kantor') {
      this.isLocationValid = this.distanceToOffice <= this.radius + Math.min(this.currentAccuracy, 50);
      if (!this.isLocationValid) {
          this.locationError = this.outsideRadiusMessage;
        } else {
          this.locationError = '';
        }
      this.statusText = this.isLocationValid
        ? 'Lokasi terverifikasi'
        : 'Lokasi di luar radius';
      this.locationDistanceText = `${this.isLocationValid ? 'Radius' : 'Jarak'} ${this.formatDistance(this.distanceToOffice)} meter dari kantor`;
    }
  }

  private isValidGeofence(latitude: number, longitude: number, radius: number): boolean {
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180
      && (latitude !== 0 || longitude !== 0)
      && Number.isFinite(radius)
      && radius > 0;
  }

  private formatDistance(distance: number): string {
    return Math.round(distance).toLocaleString('id-ID');
  }

  private startCamera(): void {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.isCameraReady = false;
      this.cameraError = 'Kamera/selfie tidak tersedia. Silakan izinkan akses kamera pada browser.';
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        this.stream = stream;
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        this.isCameraReady = true;
        this.cameraError = '';
      })
      .catch((err) => {
        this.isCameraReady = false;
        this.cameraError = `Izin kamera ditolak. Silakan aktifkan kamera. (Err: ${err.message || err.name || err})`;
      });
  }

  capture(): void {
    if (!this.isCameraReady) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const employeeName = localStorage.getItem('name') || 'Unknown Employee';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Nama: ${employeeName}`, 10, canvas.height - 45);
      ctx.fillText(`Waktu: ${new Date().toLocaleString()}`, 10, canvas.height - 25);
      ctx.fillText(`GPS: ${this.currentLat.toFixed(6)}, ${this.currentLng.toFixed(6)}`, 10, canvas.height - 5);
      
      this.capturedImage = canvas.toDataURL('image/jpeg', 0.8);
      canvas.toBlob((blob) => {
        this.capturedBlob = blob;
      }, 'image/jpeg', 0.8);
    }
  }

  retake(): void {
    this.capturedImage = null;
    this.capturedBlob = null;
  }

  private attendanceLocationSelection(): { canonicalType: string; alternativeLocationId?: number | null; fieldLocationId?: number | null } {
    const canonicalType = this.selectedCanonicalType();
    return {
      canonicalType,
      alternativeLocationId: canonicalType === 'alternative_location' ? this.selectedAlternativeLocationId : null,
      fieldLocationId: canonicalType === 'field_location' ? this.selectedFieldLocationId : null
    };
  }

  async triggerPunch(): Promise<void> {
    if (!this.canPunchBySchedule || (this.isLocationRequired && !this.isGpsActive) || !this.isLocationValid || !this.isCameraReady || !this.capturedBlob || this.isSubmitting) return;
    if (this.isCheckoutPage && !this.hasCheckedIn) return;
    const isCheckout = this.hasCheckedIn;
    if (!await this.alert.confirm(isCheckout ? 'Konfirmasi check-out' : 'Konfirmasi check-in', isCheckout ? 'Simpan waktu check-out sekarang?' : 'Simpan absensi check-in sekarang?', isCheckout ? 'Ya, check-out' : 'Ya, check-in')) return;
    if (!this.hasCheckedIn) {
      this.submitCheckin();
    } else {
      this.submitCheckout();
    }
  }

  submitCheckin(): void {
    if ((this.isLocationRequired && !this.isGpsActive) || !this.isLocationValid || !this.isCameraReady || !this.capturedBlob || this.isSubmitting) return;

    this.isSubmitting = true;

    this.attendanceService.checkIn(
      this.currentLat, 
      this.currentLng, 
      this.currentAccuracy, 
      this.capturedBlob,
      this.tipeKerja,
      this.attendanceLocationSelection()
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.alert.success('Check-in berhasil', 'Presensi Anda telah tersimpan.').then(() => {
          this.router.navigate([this.getPostAttendanceRoute()]);
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alert.error('Check-in gagal', err.error?.error || 'Kesalahan sistem');
      }
    });
  }

  submitCheckout(): void {
    if ((this.isLocationRequired && !this.isGpsActive) || !this.isLocationValid || !this.isCameraReady || !this.capturedBlob || this.isSubmitting) return;

    this.isSubmitting = true;

    this.attendanceService.checkOut(
      this.currentLat, 
      this.currentLng, 
      this.currentAccuracy, 
      this.capturedBlob,
      this.tipeKerja,
      this.attendanceLocationSelection()
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.alert.success('Check-out berhasil', 'Presensi pulang Anda telah tersimpan.').then(() => {
          this.router.navigate([this.getPostAttendanceRoute()]);
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alert.error('Check-out gagal', err.error?.error || 'Kesalahan sistem');
      }
    });
  }

  private getPostAttendanceRoute(): string {
    switch (localStorage.getItem('role')) {
      case 'MANAJER':
        return '/manager/dashboard';
      case 'MAGANG':
        return '/intern/dashboard';
      default:
        return '/employee/dashboard';
    }
  }
}
