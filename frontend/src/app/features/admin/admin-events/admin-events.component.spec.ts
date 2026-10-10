import { AdminEventsComponent } from './admin-events.component';

describe('AdminEventsComponent event text validation', () => {
  function component(): AdminEventsComponent {
    return new AdminEventsComponent({} as any, {} as any, {} as any);
  }

  it('accepts long text at the configured limits, including text without spaces', () => {
    const subject = component();
    subject.form = {
      ...subject.form,
      tanggal: '2026-10-10',
      jam_mulai: '08:00',
      judul: 'a'.repeat(subject.eventFieldLimits.judul),
      lokasi: 'b'.repeat(subject.eventFieldLimits.lokasi),
      deskripsi: 'c'.repeat(subject.eventFieldLimits.deskripsi)
    };

    expect(subject.eventValidationError()).toBe('');
  });

  it('reports the overflowing field without truncating its value', () => {
    const cases = [
      ['judul', 'Judul event maksimal 150 karakter.'],
      ['lokasi', 'Lokasi maksimal 150 karakter.'],
      ['deskripsi', 'Deskripsi/catatan maksimal 2000 karakter.']
    ] as const;

    for (const [field, message] of cases) {
      const subject = component();
      const value = 'a'.repeat(subject.eventFieldLimits[field] + 1);
      subject.form = {
        ...subject.form,
        tanggal: '2026-10-10',
        jam_mulai: '08:00',
        [field]: value
      };

      expect(subject.eventValidationError()).toBe(message);
      expect(subject.form[field]).toBe(value);
    }
  });
});
