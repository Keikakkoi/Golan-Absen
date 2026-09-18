import { isValidRealisasiKegiatan } from './work-report-validation';

describe('realisasi kegiatan validation', () => {
  it('accepts percentages from 0% through 100%', () => {
    ['0%', '20%', '50%', '99%', '100%'].forEach(value => {
      expect(isValidRealisasiKegiatan(value)).toBeTrue();
    });
  });

  it('rejects non-percent, malformed, and out-of-range values', () => {
    ['selesai', 'seratus persen', 'abc', '50 persen', '20%%', '101%', '-1%', ''].forEach(value => {
      expect(isValidRealisasiKegiatan(value)).toBeFalse();
    });
  });
});
