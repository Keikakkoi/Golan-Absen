ALTER TABLE employees ADD COLUMN IF NOT EXISTS jenis_kelamin varchar(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tempat_lahir varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tanggal_lahir date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nomor_telepon varchar(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS alamat text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_kerja varchar(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS lokasi_rumah varchar(150);
