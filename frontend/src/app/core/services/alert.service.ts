import { Injectable } from '@angular/core';
import type Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  async confirm(title: string, text: string, confirmButtonText = 'Ya, lanjutkan'): Promise<boolean> {
    const sweetAlert = await this.load();
    const result = await sweetAlert.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Batal',
      reverseButtons: true,
      focusCancel: true
    });
    return result.isConfirmed;
  }

  async success(title: string, text = ''): Promise<void> {
    const sweetAlert = await this.load();
    await sweetAlert.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'OK',
      timer: 1800,
      timerProgressBar: true
    });
  }

  async error(title: string, text = ''): Promise<void> {
    const sweetAlert = await this.load();
    await sweetAlert.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Tutup'
    });
  }

  async info(title: string, text = ''): Promise<void> {
    const sweetAlert = await this.load();
    await sweetAlert.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK'
    });
  }

  async input(title: string, text: string, confirmButtonText = 'Oke', placeholder = ''): Promise<string | null> {
    const sweetAlert = await this.load();
    const result = await sweetAlert.fire({
      icon: 'warning',
      title,
      text,
      input: 'text',
      inputPlaceholder: placeholder,
      inputAttributes: { autocomplete: 'off', autocapitalize: 'off' },
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Batal',
      reverseButtons: true,
      focusCancel: true
    });
    return result.isConfirmed ? (result.value || '') : null;
  }

  async textarea(title: string, text: string, confirmButtonText = 'Tolak Pengajuan', placeholder = ''): Promise<string | null> {
    const sweetAlert = await this.load();
    const result = await sweetAlert.fire({
      icon: 'warning', title, text, input: 'textarea', inputPlaceholder: placeholder,
      inputAttributes: { maxlength: '2000', 'aria-label': 'Alasan Penolakan' },
      inputValidator: (value: string) => !value?.trim() ? 'Alasan penolakan wajib diisi' : undefined,
      showCancelButton: true, confirmButtonText, cancelButtonText: 'Batal', reverseButtons: true, focusCancel: true
    });
    return result.isConfirmed ? (result.value || '').trim() : null;
  }

  private async load(): Promise<typeof Swal> {
    const module = await import('sweetalert2');
    return module.default;
  }
}
