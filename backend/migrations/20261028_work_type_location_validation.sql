-- Canonicalize work-type location validation modes while preserving legacy
-- columns for compatibility. Attendance history is intentionally untouched.
UPDATE work_types
SET radius_yang_berlaku = CASE
  WHEN is_home_base THEN 'rumah'
  WHEN LOWER(BTRIM(nama)) = 'wfo' THEN 'kantor'
  WHEN LOWER(BTRIM(COALESCE(radius_yang_berlaku, ''))) = 'rumah' THEN 'rumah'
  ELSE 'tanpa_validasi'
END
WHERE LOWER(BTRIM(COALESCE(radius_yang_berlaku, ''))) NOT IN ('kantor', 'rumah', 'tanpa_validasi')
   OR (is_home_base AND LOWER(BTRIM(COALESCE(radius_yang_berlaku, ''))) = 'kantor')
   OR (NOT is_home_base AND LOWER(BTRIM(COALESCE(nama, ''))) <> 'wfo'
       AND LOWER(BTRIM(COALESCE(radius_yang_berlaku, ''))) = 'kantor');

UPDATE work_types
SET butuh_validasi_geofence = (LOWER(BTRIM(radius_yang_berlaku)) <> 'tanpa_validasi'),
    is_home_base = (LOWER(BTRIM(radius_yang_berlaku)) = 'rumah');
