import { HttpClient } from '@angular/common/http';
import { LeaveRequestComponent } from './leave-request.component';

describe('LeaveRequestComponent attachment handling', () => {
  let component: LeaveRequestComponent;

  beforeEach(() => {
    component = new LeaveRequestComponent(
      {} as HttpClient,
      { getRole: () => 'Karyawan', getToken: () => 'token' } as any,
      {} as any
    );
    component.formData = {
      jenis_izin: 'Sakit',
      tanggal_mulai: '2099-01-01',
      tanggal_selesai: '2099-01-01',
      alasan: 'Alasan pengajuan'
    };
  });

  it('accepts a valid attachment selection', () => {
    const file = new File(['image'], 'surat.png', { type: 'image/png' });
    component.onAttachmentChange([file]);
    expect(component.selectedFile).toBe(file);
  });

  it('does not submit without the required attachment', async () => {
    await component.submitRequest();
    expect(component.errorMessage).toContain('Lampiran dokumen wajib');
  });

  it('rejects invalid attachment type and files over 10 MB at submit time', async () => {
    component.selectedFile = new File(['text'], 'surat.txt', { type: 'text/plain' });
    await component.submitRequest();
    expect(component.errorMessage).toContain('JPG, PNG, WEBP, atau PDF');

    component.selectedFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'surat.png', { type: 'image/png' });
    await component.submitRequest();
    expect(component.errorMessage).toContain('JPG, PNG, WEBP, atau PDF');
  });
});
