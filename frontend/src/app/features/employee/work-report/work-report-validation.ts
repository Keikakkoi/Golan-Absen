export const REALISASI_KEGIATAN_ERROR =
  'Realisasi kegiatan harus berupa angka persentase antara 0% sampai 100%, contoh: 20%, 50%, atau 100%.';

/** Returns true only for an integer percentage from 0% through 100%. */
export function isValidRealisasiKegiatan(value: string | null | undefined): boolean {
  return /^(?:100|[1-9]?\d)%$/.test(value ?? '');
}
