import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilePreviewComponent } from './file-preview.component';

describe('FilePreviewComponent', () => {
  let fixture: ComponentFixture<FilePreviewComponent>;
  let component: FilePreviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilePreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
    component.accept = 'image/png,application/pdf';
    component.maxSizeMb = 1;
    fixture.detectChanges();
  });

  it('accepts a valid image and emits it without making a request', () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    let emitted: File[] | undefined;
    component.filesChange.subscribe(files => emitted = files);
    component.onInput({ target: { files: [file], value: '' } } as unknown as Event);
    expect(emitted?.[0]).toBe(file);
    expect(component.previews[0].kind).toBe('image');
  });

  it('renders one upload button and one hidden input that opens the file picker', () => {
    component.label = 'Pilih Lampiran';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.file-preview-picker') as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('.file-preview-input') as HTMLInputElement;
    const clickSpy = spyOn(input, 'click');

    expect(fixture.nativeElement.querySelectorAll('.file-preview-picker').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('input[type="file"]').length).toBe(1);
    expect(button.textContent).toContain('Pilih Lampiran');
    button.click();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('rejects unsupported types and oversized files', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    component.onInput({ target: { files: [file], value: '' } } as unknown as Event);
    expect(component.error).toContain('tipe yang tidak didukung');
    expect(component.previews.length).toBe(0);
  });

  it('adds files selected in separate picker actions up to the limit', () => {
    component.maxFiles = 3;
    const first = new File(['one'], 'one.png', { type: 'image/png', lastModified: 1 });
    const second = new File(['two'], 'two.png', { type: 'image/png', lastModified: 2 });

    component.onInput({ target: { files: [first], value: '' } } as unknown as Event);
    component.onInput({ target: { files: [second], value: '' } } as unknown as Event);

    expect(component.files).toEqual([first, second]);
    expect(component.previews.length).toBe(2);
  });

  it('rejects a separate selection when it would exceed the limit', () => {
    component.maxFiles = 3;
    const files = [1, 2, 3, 4].map(index => new File([String(index)], `${index}.png`, { type: 'image/png' }));

    component.onInput({ target: { files: files.slice(0, 3), value: '' } } as unknown as Event);
    component.onInput({ target: { files: [files[3]], value: '' } } as unknown as Event);

    expect(component.error).toContain('Maksimal 3 file');
    expect(component.files).toEqual(files.slice(0, 3));
  });

  it('rejects files larger than the configured limit', () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    component.onInput({ target: { files: [file], value: '' } } as unknown as Event);
    expect(component.error).toContain('melebihi batas 1 MB');
    expect(component.previews.length).toBe(0);
  });

  it('renders PDF and allows removing the selected file', () => {
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    component.onInput({ target: { files: [file], value: '' } } as unknown as Event);
    expect(component.previews[0].kind).toBe('pdf');
    component.remove(0);
    expect(component.files.length).toBe(0);
  });
});
