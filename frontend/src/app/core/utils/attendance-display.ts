export type AttendanceCanonicalType = 'wfo' | 'wfh' | 'alternative_location' | 'field_location' | '';

const TYPE_LABELS: Record<Exclude<AttendanceCanonicalType, ''>, string> = {
  wfo: 'WFO',
  wfh: 'WFH',
  alternative_location: 'Lokasi Alternatif',
  field_location: 'Lokasi Lapangan'
};

export function canonicalAttendanceType(value: unknown): AttendanceCanonicalType {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'wfo' || raw === 'work_from_office') return 'wfo';
  if (raw === 'wfh' || raw === 'work_from_home') return 'wfh';
  if (raw === 'alternative_location' || raw === 'alternative' || raw === 'lokasi alternatif') return 'alternative_location';
  if (raw === 'field_location' || raw === 'field' || raw === 'lokasi lapangan') return 'field_location';
  return '';
}

export function attendanceCanonicalType(record: any): AttendanceCanonicalType {
  const configured = canonicalAttendanceType(record?.TipeKerjaCanonical ?? record?.tipe_kerja_canonical ?? record?.canonical_type);
  if (configured) return configured;

  const legacy = canonicalAttendanceType(record?.TipeKerja ?? record?.tipe_kerja ?? record?.TipeKerjaLabel ?? record?.tipe_kerja_label ?? record);
  if (legacy) return legacy;

  const mode = String(record?.RadiusYangBerlaku ?? record?.radius_yang_berlaku ?? '').trim().toLowerCase();
  if (mode === 'rumah') return 'wfh';
  if (mode === 'alternatif' || mode === 'alternative') return 'alternative_location';
  if (mode === 'lapangan' || mode === 'field') return 'field_location';
  return '';
}

export function attendanceTypeLabel(record: any): string {
  const canonical = attendanceCanonicalType(record);
  if (canonical) return TYPE_LABELS[canonical];
  const legacy = String(record?.TipeKerja ?? record?.tipe_kerja ?? record?.TipeKerjaLabel ?? record?.tipe_kerja_label ?? record ?? '').trim();
  return legacy || 'WFO';
}

export function attendanceLocationName(record: any): string {
  return String(record?.LocationName ?? record?.location_name ?? record?.LocationNameSnapshot ?? record?.location_name_snapshot ?? '').trim();
}

export function attendanceLocationAddress(record: any): string {
  return String(record?.LocationAddress ?? record?.location_address ?? record?.LocationAddressSnapshot ?? record?.location_address_snapshot ?? '').trim();
}

export function attendanceLocationCoordinates(record: any): string {
  const latitude = record?.LocationLatitude ?? record?.location_latitude ?? record?.LocationLatitudeSnapshot ?? record?.location_latitude_snapshot ?? record?.LatitudeMasuk ?? record?.latitude_masuk;
  const longitude = record?.LocationLongitude ?? record?.location_longitude ?? record?.LocationLongitudeSnapshot ?? record?.location_longitude_snapshot ?? record?.LongitudeMasuk ?? record?.longitude_masuk;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : '';
}

export function attendanceLocationSummary(record: any): string {
  const name = attendanceLocationName(record);
  const address = attendanceLocationAddress(record);
  const coordinates = attendanceLocationCoordinates(record);
  return [name, address || (!name ? coordinates : '')].filter(Boolean).join(' — ') || coordinates || '-';
}
