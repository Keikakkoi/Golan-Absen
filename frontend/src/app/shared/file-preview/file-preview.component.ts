import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface FilePreviewValidation {
  valid: boolean;
  message: string;
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-preview.component.html',
  styleUrls: ['./file-preview.component.scss']
})
export class FilePreviewComponent implements OnChanges, OnDestroy {
  @Input() files: File[] = [];
  @Input() accept = '';
  @Input() maxSizeMb = 10;
  @Input() maxFiles = 1;
  @Input() label = 'Pilih file';
  @Output() filesChange = new EventEmitter<File[]>();
  @Output() validationChange = new EventEmitter<FilePreviewValidation>();
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  previews: Array<{ file: File; url: string; safeUrl: SafeResourceUrl; kind: 'image' | 'pdf' | 'generic' }> = [];
  error = '';
  enlargedUrl = '';
  private objectUrls: string[] = [];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['files']) this.rebuildPreviews();
  }

  ngOnDestroy(): void { this.revokeUrls(); }

  openFilePicker(): void { this.fileInput?.nativeElement.click(); }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    const result = this.validate(selected);
    if (!result.valid) {
      this.error = result.message;
      this.validationChange.emit(result);
      input.value = '';
      return;
    }
    this.error = '';
    this.files = selected;
    this.rebuildPreviews();
    this.filesChange.emit(selected);
    this.validationChange.emit(result);
    input.value = '';
  }

  remove(index: number): void {
    const next = this.files.filter((_, i) => i !== index);
    this.files = next;
    this.rebuildPreviews();
    this.filesChange.emit(next);
    this.validationChange.emit({ valid: true, message: '' });
  }

  openImage(url: string): void { this.enlargedUrl = url; }
  closeImage(): void { this.enlargedUrl = ''; }

  fileSize(file: File): string {
    if (file.size < 1024) return `${file.size} B`;
    if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }

  icon(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (file.type === 'application/pdf' || ext === 'pdf') return 'fa-file-pdf';
    if (file.type.includes('word') || ['doc', 'docx'].includes(ext || '')) return 'fa-file-word';
    if (file.type.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext || '')) return 'fa-file-excel';
    if (file.type.includes('presentation') || ['ppt', 'pptx'].includes(ext || '')) return 'fa-file-powerpoint';
    if (file.type.startsWith('text/') || ext === 'txt') return 'fa-file-lines';
    return 'fa-file';
  }

  private validate(files: File[]): FilePreviewValidation {
    if (!files.length) return { valid: false, message: 'Pilih file terlebih dahulu.' };
    if (files.length > this.maxFiles) return { valid: false, message: `Maksimal ${this.maxFiles} file.` };
    const accepted = this.accept.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    for (const file of files) {
      if (file.size > this.maxSizeMb * 1024 * 1024) return { valid: false, message: `${file.name} melebihi batas ${this.maxSizeMb} MB.` };
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (accepted.length && !accepted.some(type => type === file.type.toLowerCase() || type === ext || (type.endsWith('/*') && file.type.startsWith(type.slice(0, -1))))) {
        return { valid: false, message: `${file.name} memiliki tipe yang tidak didukung. Tipe yang diizinkan: ${this.accept}.` };
      }
    }
    return { valid: true, message: '' };
  }

  private rebuildPreviews(): void {
    this.revokeUrls();
    this.previews = this.files.map(file => {
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      return { file, url, safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url), kind: isImage ? 'image' : (isPdf ? 'pdf' : 'generic') };
    });
  }

  private revokeUrls(): void {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = [];
    this.enlargedUrl = '';
  }
}
