import { attendanceCanonicalType, attendanceLocationSummary, attendanceTypeLabel } from './attendance-display';

describe('attendance display mapping', () => {
  it('maps all canonical attendance types to stable labels', () => {
    expect(attendanceTypeLabel({ TipeKerjaCanonical: 'wfo' })).toBe('WFO');
    expect(attendanceTypeLabel({ TipeKerjaCanonical: 'wfh' })).toBe('WFH');
    expect(attendanceTypeLabel({ TipeKerjaCanonical: 'alternative_location' })).toBe('Lokasi Alternatif');
    expect(attendanceTypeLabel({ TipeKerjaCanonical: 'field_location' })).toBe('Lokasi Lapangan');
  });

  it('preserves legacy values and uses history snapshots for location detail', () => {
    expect(attendanceCanonicalType({ TipeKerja: 'Dinas Luar' })).toBe('');
    expect(attendanceTypeLabel({ TipeKerja: 'Dinas Luar' })).toBe('Dinas Luar');
    expect(attendanceLocationSummary({
      location_name_snapshot: 'Proyek Lama',
      location_address_snapshot: 'Alamat lama',
      location_latitude_snapshot: -6.2,
      location_longitude_snapshot: 106.8
    })).toBe('Proyek Lama — Alamat lama');
  });
});
