import { isProfilePhotoRatio, PROFILE_PHOTO_ERROR, validateProfilePhoto } from './profile-photo-validation';

describe('profile photo validation', () => {
  it('accepts an exact portrait 3:4 dimension', () => {
    expect(isProfilePhotoRatio(300, 400)).toBeTrue();
  });

  it('rejects non-3:4 and landscape dimensions', () => {
    expect(isProfilePhotoRatio(301, 400)).toBeFalse();
    expect(isProfilePhotoRatio(400, 300)).toBeFalse();
  });

  it('uses the required validation message', () => {
    expect(PROFILE_PHOTO_ERROR).toBe('Pas foto harus memiliki ukuran 3x4.');
  });

  it('rejects a non-image file before reading dimensions', async () => {
    const error = await validateProfilePhoto(new File(['text'], 'photo.txt', { type: 'text/plain' }));
    expect(error).toBe('Pilih file JPG, PNG, atau GIF.');
  });
});
