export const PROFILE_PHOTO_ERROR = 'Pas foto harus memiliki ukuran 3x4.';

export function isProfilePhotoRatio(width: number, height: number): boolean {
  return width > 0 && height > 0 && width * 4 === height * 3;
}

export function validateProfilePhoto(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    return Promise.resolve('Pilih file JPG, PNG, atau GIF.');
  }
  if (file.size > 5 * 1024 * 1024) {
    return Promise.resolve('Ukuran pas foto maksimal 5 MB.');
  }

  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const valid = isProfilePhotoRatio(image.naturalWidth || image.width, image.naturalHeight || image.height);
      URL.revokeObjectURL(url);
      resolve(valid ? null : PROFILE_PHOTO_ERROR);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('Pas foto tidak dapat dibaca.');
    };
    image.src = url;
  });
}
