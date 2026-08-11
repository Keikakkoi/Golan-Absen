--
-- PostgreSQL database dump
--

\restrict aEcQWFhI8QxtjaWACkxJUpVeFRJfbXsY5Pv50hTW1iDaTa1zuMOW7khYyXUKkFR

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    employee_id bigint NOT NULL,
    tanggal date NOT NULL,
    jam_masuk timestamp with time zone,
    jam_pulang timestamp with time zone,
    status character varying(20) NOT NULL,
    latitude_masuk numeric,
    longitude_masuk numeric,
    akurasi_gps_masuk numeric,
    dalam_radius_masuk boolean,
    foto_selfie_masuk_url text,
    latitude_pulang numeric,
    longitude_pulang numeric,
    akurasi_gps_pulang numeric,
    dalam_radius_pulang boolean,
    foto_selfie_pulang_url text,
    tipe_kerja character varying(20) DEFAULT 'WFO'::character varying,
    tipe_kerja_id bigint,
    latitude numeric,
    longitude numeric,
    akurasi_gps numeric,
    dalam_radius boolean,
    radius_tervalidasi character varying(50) DEFAULT 'kantor'::character varying,
    check_out_otomatis boolean DEFAULT false,
    is_late boolean DEFAULT false,
    late_duration_minutes bigint DEFAULT 0,
    is_checkout_missing boolean DEFAULT false
);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_records_id_seq OWNED BY public.attendance_records.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    action character varying(50) NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id bigint,
    changes_detail text
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: company_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_events (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tanggal date NOT NULL,
    jam_mulai character varying(5) NOT NULL,
    jam_selesai character varying(5),
    judul character varying(150) NOT NULL,
    tipe character varying(30) DEFAULT 'info'::character varying NOT NULL,
    deskripsi text,
    lokasi character varying(150),
    status_aktif boolean DEFAULT true,
    dibuat_oleh bigint
);


--
-- Name: company_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_events_id_seq OWNED BY public.company_events.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_departemen character varying(100) NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.divisions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_divisi character varying(100) NOT NULL,
    deskripsi text
);


--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.divisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.divisions_id_seq OWNED BY public.divisions.id;


--
-- Name: employee_home_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_home_locations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    employee_id bigint NOT NULL,
    latitude_rumah numeric NOT NULL,
    longitude_rumah numeric NOT NULL,
    radius_meter numeric DEFAULT 100,
    alamat_rumah text,
    google_maps_url text
);


--
-- Name: employee_home_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_home_locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_home_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_home_locations_id_seq OWNED BY public.employee_home_locations.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    nik character varying(50) NOT NULL,
    division_id bigint NOT NULL,
    position_id bigint NOT NULL,
    tanggal_bergabung date,
    home_latitude numeric DEFAULT 0,
    home_longitude numeric DEFAULT 0,
    foto_profil_url text
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: general_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.general_settings (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    minimum_masa_kerja_cuti_bulan bigint DEFAULT 3 NOT NULL,
    batas_laporan_setelah_checkout_jam bigint DEFAULT 1 NOT NULL
);


--
-- Name: general_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.general_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: general_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.general_settings_id_seq OWNED BY public.general_settings.id;


--
-- Name: helpdesk_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helpdesk_contacts (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    email_helpdesk character varying(100) DEFAULT 'hrd@golan.co.id'::character varying NOT NULL,
    email_it character varying(100) DEFAULT 'support@golan.co.id'::character varying NOT NULL,
    whats_app_hrd character varying(50) DEFAULT '+62 813-2493-7038'::character varying NOT NULL,
    whats_app_it character varying(50) DEFAULT '+62 895-3414-40181'::character varying NOT NULL,
    jam_layanan character varying(100) DEFAULT 'Senin - Jumat: 08:00 - 17:00 WIB'::character varying NOT NULL
);


--
-- Name: helpdesk_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helpdesk_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helpdesk_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helpdesk_contacts_id_seq OWNED BY public.helpdesk_contacts.id;


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tanggal date NOT NULL,
    keterangan character varying(255) NOT NULL
);


--
-- Name: holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.holidays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.holidays_id_seq OWNED BY public.holidays.id;


--
-- Name: internship_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internship_certificates (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    issued_at date NOT NULL,
    certificate_no character varying(80) NOT NULL,
    file_url text,
    storage_key text,
    file_name character varying(255),
    mime_type character varying(80),
    file_size bigint DEFAULT 0,
    uploaded_by bigint,
    uploaded_at timestamp without time zone
);


--
-- Name: internship_certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.internship_certificates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internship_certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.internship_certificates_id_seq OWNED BY public.internship_certificates.id;


--
-- Name: leave_quota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_quota (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    employee_id bigint NOT NULL,
    tahun bigint NOT NULL,
    jenis_cuti character varying(50) NOT NULL,
    sisa_kuota bigint DEFAULT 12 NOT NULL
);


--
-- Name: leave_quota_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_quota_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_quota_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_quota_id_seq OWNED BY public.leave_quota.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    employee_id bigint NOT NULL,
    jenis_izin character varying(50) NOT NULL,
    tanggal_mulai date NOT NULL,
    tanggal_selesai date NOT NULL,
    alasan text NOT NULL,
    lampiran_url text,
    status character varying(20) DEFAULT 'Pending'::character varying,
    approved_by bigint,
    approved_at timestamp without time zone,
    notes text
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tipe_notifikasi character varying(50) NOT NULL,
    role character varying(20) NOT NULL,
    is_email_enabled boolean DEFAULT true,
    is_in_app_enabled boolean DEFAULT true
);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    judul character varying(100) NOT NULL,
    pesan text NOT NULL,
    status_baca boolean DEFAULT false,
    waktu timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: office_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office_locations (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_lokasi character varying(100) NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    radius_meter numeric NOT NULL,
    alamat text,
    google_maps_url text
);


--
-- Name: office_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.office_locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: office_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.office_locations_id_seq OWNED BY public.office_locations.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    kode character varying(80) NOT NULL,
    nama character varying(120) NOT NULL,
    deskripsi text
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_jabatan character varying(100) NOT NULL,
    deskripsi text
);


--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    user_id bigint NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL
);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.push_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.push_subscriptions_id_seq OWNED BY public.push_subscriptions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    role character varying(20) NOT NULL,
    permission_id bigint NOT NULL,
    diizinkan boolean DEFAULT true
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'aktif'::character varying,
    reset_password_token character varying(100),
    reset_password_expiry timestamp without time zone,
    manager_id bigint,
    team_id character varying(80),
    internship_start_date date,
    internship_end_date date,
    mentor_name character varying(100),
    mentor_contact character varying(100),
    institution_name character varying(150)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_report_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_report_attachments (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    work_report_id bigint NOT NULL,
    file_url text NOT NULL,
    storage_key text NOT NULL,
    file_name character varying(255) NOT NULL,
    mime_type character varying(80) NOT NULL,
    file_size bigint NOT NULL
);


--
-- Name: work_report_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_report_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_report_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_report_attachments_id_seq OWNED BY public.work_report_attachments.id;


--
-- Name: work_report_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_report_columns (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_kolom character varying(100) NOT NULL,
    tipe_input character varying(50) DEFAULT 'text'::character varying NOT NULL,
    opsi text,
    aktif boolean DEFAULT true,
    wajib_diisi boolean DEFAULT false,
    urutan bigint DEFAULT 0
);


--
-- Name: work_report_columns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_report_columns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_report_columns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_report_columns_id_seq OWNED BY public.work_report_columns.id;


--
-- Name: work_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_reports (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    employee_id bigint NOT NULL,
    tanggal date NOT NULL,
    tugas character varying(255),
    judul character varying(255),
    deskripsi_kegiatan text,
    realisasi_kegiatan text,
    kendala text,
    rencana_minggu_depan text,
    link_artikel text,
    catatan_tambahan text,
    status_sesuai character varying(50),
    validasi_oleh_hr boolean DEFAULT false,
    custom_fields text,
    status_logbook character varying(20) DEFAULT 'draft'::character varying,
    reviewed_by bigint,
    reviewed_at timestamp without time zone,
    review_notes text,
    is_late_submission boolean DEFAULT false
);


--
-- Name: work_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_reports_id_seq OWNED BY public.work_reports.id;


--
-- Name: work_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_schedules (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama_shift character varying(100) NOT NULL,
    jam_mulai character varying(10) NOT NULL,
    jam_selesai character varying(10) NOT NULL,
    toleransi_terlambat_menit bigint DEFAULT 10 NOT NULL,
    hari_kerja character varying(100) DEFAULT '1,2,3,4,5'::character varying,
    employee_id bigint,
    tanggal date
);


--
-- Name: work_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_schedules_id_seq OWNED BY public.work_schedules.id;


--
-- Name: work_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_types (
    id bigint NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    nama character varying(50) NOT NULL,
    is_home_base boolean DEFAULT false,
    deskripsi text,
    is_default boolean DEFAULT false,
    butuh_validasi_geofence boolean DEFAULT true,
    radius_yang_berlaku character varying(50) DEFAULT 'kantor'::character varying,
    wajib_selfie boolean DEFAULT true,
    warna_label character varying(20) DEFAULT '#3B82F6'::character varying,
    status_aktif boolean DEFAULT true
);


--
-- Name: work_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_types_id_seq OWNED BY public.work_types.id;


--
-- Name: attendance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records ALTER COLUMN id SET DEFAULT nextval('public.attendance_records_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: company_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_events ALTER COLUMN id SET DEFAULT nextval('public.company_events_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: divisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq'::regclass);


--
-- Name: employee_home_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_home_locations ALTER COLUMN id SET DEFAULT nextval('public.employee_home_locations_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: general_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_settings ALTER COLUMN id SET DEFAULT nextval('public.general_settings_id_seq'::regclass);


--
-- Name: helpdesk_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpdesk_contacts ALTER COLUMN id SET DEFAULT nextval('public.helpdesk_contacts_id_seq'::regclass);


--
-- Name: holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays ALTER COLUMN id SET DEFAULT nextval('public.holidays_id_seq'::regclass);


--
-- Name: internship_certificates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_certificates ALTER COLUMN id SET DEFAULT nextval('public.internship_certificates_id_seq'::regclass);


--
-- Name: leave_quota id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota ALTER COLUMN id SET DEFAULT nextval('public.leave_quota_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: office_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_locations ALTER COLUMN id SET DEFAULT nextval('public.office_locations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: push_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.push_subscriptions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_report_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_report_attachments ALTER COLUMN id SET DEFAULT nextval('public.work_report_attachments_id_seq'::regclass);


--
-- Name: work_report_columns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_report_columns ALTER COLUMN id SET DEFAULT nextval('public.work_report_columns_id_seq'::regclass);


--
-- Name: work_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_reports ALTER COLUMN id SET DEFAULT nextval('public.work_reports_id_seq'::regclass);


--
-- Name: work_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules ALTER COLUMN id SET DEFAULT nextval('public.work_schedules_id_seq'::regclass);


--
-- Name: work_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_types ALTER COLUMN id SET DEFAULT nextval('public.work_types_id_seq'::regclass);


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_records (id, created_at, updated_at, deleted_at, employee_id, tanggal, jam_masuk, jam_pulang, status, latitude_masuk, longitude_masuk, akurasi_gps_masuk, dalam_radius_masuk, foto_selfie_masuk_url, latitude_pulang, longitude_pulang, akurasi_gps_pulang, dalam_radius_pulang, foto_selfie_pulang_url, tipe_kerja, tipe_kerja_id, latitude, longitude, akurasi_gps, dalam_radius, radius_tervalidasi, check_out_otomatis, is_late, late_duration_minutes, is_checkout_missing) FROM stdin;
2	2026-07-22 03:55:52.066779+00	2026-07-23 06:17:26.769424+00	\N	1	2026-07-22	2026-07-22 03:55:52.065329+00	2026-07-22 11:00:00+00	Hadir	-6.147803687968235	106.7272820044734	55	t	http://localhost:9000/golan-attendance/EMP-001-checkin-1784692552.jpg	0	0	0	f		Dinas Luar	\N	-6.147803687968235	106.7272820044734	55	t	custom	t	f	0	f
5	2026-07-23 07:28:33.921481+00	2026-07-23 07:28:33.921481+00	\N	1	2026-07-24	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
3	2026-07-23 05:36:21.63005+00	2026-07-23 10:29:20.008916+00	\N	1	2026-07-23	2026-07-23 05:36:21.629544+00	2026-07-23 10:29:19.96014+00	Hadir	-6.122814531120332	106.80687823842962	149	t	http://localhost:9000/golan-attendance/EMP-001-checkin-1784784981.jpg	-6.122557337320784	106.80685487923301	187	t	http://localhost:9000/golan-attendance/EMP-001-checkout-1784802559.jpg	WFH	\N	-6.122557337320784	106.80685487923301	187	t	rumah	f	f	0	f
8	2026-07-27 02:48:24.875921+00	2026-07-27 02:48:24.875921+00	\N	2	2026-04-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
9	2026-07-27 02:48:24.884153+00	2026-07-27 02:48:24.884153+00	\N	2	2026-04-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
10	2026-07-27 02:48:24.887199+00	2026-07-27 02:48:24.887199+00	\N	2	2026-04-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
11	2026-07-27 02:48:24.891937+00	2026-07-27 02:48:24.891937+00	\N	2	2026-04-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
12	2026-07-27 02:48:24.895944+00	2026-07-27 02:48:24.895944+00	\N	2	2026-04-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
13	2026-07-27 02:48:24.898842+00	2026-07-27 02:48:24.898842+00	\N	2	2026-04-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
14	2026-07-27 02:48:24.902638+00	2026-07-27 02:48:24.902638+00	\N	2	2026-04-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
15	2026-07-27 02:48:24.905831+00	2026-07-27 02:48:24.905831+00	\N	2	2026-04-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
16	2026-07-27 02:48:24.909527+00	2026-07-27 02:48:24.909527+00	\N	2	2026-04-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
17	2026-07-27 02:48:24.912698+00	2026-07-27 02:48:24.912698+00	\N	2	2026-04-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
18	2026-07-27 02:48:24.916152+00	2026-07-27 02:48:24.916152+00	\N	2	2026-04-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
19	2026-07-27 02:48:24.918879+00	2026-07-27 02:48:24.918879+00	\N	2	2026-04-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
20	2026-07-27 02:48:24.921364+00	2026-07-27 02:48:24.921364+00	\N	2	2026-04-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
21	2026-07-27 02:48:24.924981+00	2026-07-27 02:48:24.924981+00	\N	2	2026-04-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
22	2026-07-27 02:48:24.928045+00	2026-07-27 02:48:24.928045+00	\N	2	2026-04-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
23	2026-07-27 02:48:24.930907+00	2026-07-27 02:48:24.930907+00	\N	2	2026-04-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
24	2026-07-27 02:48:24.932975+00	2026-07-27 02:48:24.932975+00	\N	2	2026-05-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
25	2026-07-27 02:48:24.935445+00	2026-07-27 02:48:24.935445+00	\N	2	2026-05-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
26	2026-07-27 02:48:24.938126+00	2026-07-27 02:48:24.938126+00	\N	2	2026-05-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
27	2026-07-27 02:48:24.942084+00	2026-07-27 02:48:24.942084+00	\N	2	2026-05-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
28	2026-07-27 02:48:24.94438+00	2026-07-27 02:48:24.94438+00	\N	2	2026-05-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
29	2026-07-27 02:48:24.946911+00	2026-07-27 02:48:24.946911+00	\N	2	2026-05-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
30	2026-07-27 02:48:24.94989+00	2026-07-27 02:48:24.94989+00	\N	2	2026-05-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
31	2026-07-27 02:48:24.953044+00	2026-07-27 02:48:24.953044+00	\N	2	2026-05-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
32	2026-07-27 02:48:24.955351+00	2026-07-27 02:48:24.955351+00	\N	2	2026-05-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
33	2026-07-27 02:48:24.958601+00	2026-07-27 02:48:24.958601+00	\N	2	2026-05-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
34	2026-07-27 02:48:24.960737+00	2026-07-27 02:48:24.960737+00	\N	2	2026-05-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
35	2026-07-27 02:48:24.963408+00	2026-07-27 02:48:24.963408+00	\N	2	2026-05-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
36	2026-07-27 02:48:24.966594+00	2026-07-27 02:48:24.966594+00	\N	2	2026-05-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
37	2026-07-27 02:48:24.969558+00	2026-07-27 02:48:24.969558+00	\N	2	2026-05-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
38	2026-07-27 02:48:24.972313+00	2026-07-27 02:48:24.972313+00	\N	2	2026-05-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
39	2026-07-27 02:48:24.97759+00	2026-07-27 02:48:24.97759+00	\N	2	2026-05-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
40	2026-07-27 02:48:24.981638+00	2026-07-27 02:48:24.981638+00	\N	2	2026-05-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
41	2026-07-27 02:48:24.985777+00	2026-07-27 02:48:24.985777+00	\N	2	2026-05-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
42	2026-07-27 02:48:24.98856+00	2026-07-27 02:48:24.98856+00	\N	2	2026-05-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
43	2026-07-27 02:48:24.992546+00	2026-07-27 02:48:24.992546+00	\N	2	2026-05-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
44	2026-07-27 02:48:24.995439+00	2026-07-27 02:48:24.995439+00	\N	2	2026-05-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
45	2026-07-27 02:48:24.998234+00	2026-07-27 02:48:24.998234+00	\N	2	2026-06-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
1	2026-07-21 06:04:54.759264+00	2026-07-23 06:17:26.766273+00	\N	1	2026-07-21	2026-07-21 06:04:54.758737+00	2026-07-21 11:00:00+00	Terlambat	-6.122277	106.80687299999998	241	f	http://localhost:9000/golan-attendance/EMP-001-checkin-1784613894.jpg	0	0	0	f		WFH	\N	\N	\N	\N	\N	kantor	t	t	244	f
46	2026-07-27 02:48:25+00	2026-07-27 02:48:25+00	\N	2	2026-06-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
47	2026-07-27 02:48:25.004192+00	2026-07-27 02:48:25.004192+00	\N	2	2026-06-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
48	2026-07-27 02:48:25.007269+00	2026-07-27 02:48:25.007269+00	\N	2	2026-06-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
49	2026-07-27 02:48:25.010172+00	2026-07-27 02:48:25.010172+00	\N	2	2026-06-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
50	2026-07-27 02:48:25.013278+00	2026-07-27 02:48:25.013278+00	\N	2	2026-06-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
51	2026-07-27 02:48:25.01603+00	2026-07-27 02:48:25.01603+00	\N	2	2026-06-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
52	2026-07-27 02:48:25.018269+00	2026-07-27 02:48:25.018269+00	\N	2	2026-06-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
53	2026-07-27 02:48:25.021403+00	2026-07-27 02:48:25.021403+00	\N	2	2026-06-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
54	2026-07-27 02:48:25.024594+00	2026-07-27 02:48:25.024594+00	\N	2	2026-06-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
55	2026-07-27 02:48:25.027574+00	2026-07-27 02:48:25.027574+00	\N	2	2026-06-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
56	2026-07-27 02:48:25.030901+00	2026-07-27 02:48:25.030901+00	\N	2	2026-06-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
57	2026-07-27 02:48:25.033063+00	2026-07-27 02:48:25.033063+00	\N	2	2026-06-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
58	2026-07-27 02:48:25.035777+00	2026-07-27 02:48:25.035777+00	\N	2	2026-06-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
59	2026-07-27 02:48:25.039469+00	2026-07-27 02:48:25.039469+00	\N	2	2026-06-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
60	2026-07-27 02:48:25.043391+00	2026-07-27 02:48:25.043391+00	\N	2	2026-06-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
61	2026-07-27 02:48:25.04593+00	2026-07-27 02:48:25.04593+00	\N	2	2026-06-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
62	2026-07-27 02:48:25.048343+00	2026-07-27 02:48:25.048343+00	\N	2	2026-06-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
63	2026-07-27 02:48:25.050478+00	2026-07-27 02:48:25.050478+00	\N	2	2026-06-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
64	2026-07-27 02:48:25.053192+00	2026-07-27 02:48:25.053192+00	\N	2	2026-06-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
65	2026-07-27 02:48:25.055385+00	2026-07-27 02:48:25.055385+00	\N	2	2026-06-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
66	2026-07-27 02:48:25.059653+00	2026-07-27 02:48:25.059653+00	\N	2	2026-06-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
67	2026-07-27 02:48:25.06238+00	2026-07-27 02:48:25.06238+00	\N	2	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
68	2026-07-27 02:48:25.065471+00	2026-07-27 02:48:25.065471+00	\N	2	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
69	2026-07-27 02:48:25.06922+00	2026-07-27 02:48:25.06922+00	\N	2	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
70	2026-07-27 02:48:25.071982+00	2026-07-27 02:48:25.071982+00	\N	2	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
71	2026-07-27 02:48:25.075414+00	2026-07-27 02:48:25.075414+00	\N	2	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
72	2026-07-27 02:48:25.078837+00	2026-07-27 02:48:25.078837+00	\N	2	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
73	2026-07-27 02:48:25.081857+00	2026-07-27 02:48:25.081857+00	\N	2	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
74	2026-07-27 02:48:25.084582+00	2026-07-27 02:48:25.084582+00	\N	2	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
75	2026-07-27 02:48:25.088419+00	2026-07-27 02:48:25.088419+00	\N	2	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
76	2026-07-27 02:48:25.091633+00	2026-07-27 02:48:25.091633+00	\N	2	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
77	2026-07-27 02:48:25.094789+00	2026-07-27 02:48:25.094789+00	\N	2	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
78	2026-07-27 02:48:25.097539+00	2026-07-27 02:48:25.097539+00	\N	2	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
79	2026-07-27 02:48:25.100646+00	2026-07-27 02:48:25.100646+00	\N	2	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
80	2026-07-27 02:48:25.102769+00	2026-07-27 02:48:25.102769+00	\N	2	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
81	2026-07-27 02:48:25.105517+00	2026-07-27 02:48:25.105517+00	\N	2	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
82	2026-07-27 02:48:25.109177+00	2026-07-27 02:48:25.109177+00	\N	2	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
83	2026-07-27 02:48:25.111854+00	2026-07-27 02:48:25.111854+00	\N	2	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
85	2026-07-27 10:00:26.060025+00	2026-07-27 10:00:26.060025+00	\N	2	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
86	2026-07-27 10:00:26.072709+00	2026-07-30 07:18:22.94402+00	\N	1	2026-07-27	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
88	2026-07-29 00:49:20.445906+00	2026-07-29 00:49:20.445906+00	\N	2	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
89	2026-07-29 00:49:20.457755+00	2026-07-30 07:18:22.94635+00	\N	1	2026-07-28	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
90	2026-07-29 02:53:20.481112+00	2026-07-29 02:53:20.481112+00	\N	6	2026-04-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
91	2026-07-29 02:53:20.495363+00	2026-07-29 02:53:20.495363+00	\N	6	2026-04-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
92	2026-07-29 02:53:20.497553+00	2026-07-29 02:53:20.497553+00	\N	6	2026-04-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
93	2026-07-29 02:53:20.500312+00	2026-07-29 02:53:20.500312+00	\N	6	2026-04-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
94	2026-07-29 02:53:20.503584+00	2026-07-29 02:53:20.503584+00	\N	6	2026-04-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
95	2026-07-29 02:53:20.505083+00	2026-07-29 02:53:20.505083+00	\N	6	2026-04-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
96	2026-07-29 02:53:20.507764+00	2026-07-29 02:53:20.507764+00	\N	6	2026-04-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
97	2026-07-29 02:53:20.509835+00	2026-07-29 02:53:20.509835+00	\N	6	2026-04-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
98	2026-07-29 02:53:20.511891+00	2026-07-29 02:53:20.511891+00	\N	6	2026-04-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
99	2026-07-29 02:53:20.513936+00	2026-07-29 02:53:20.513936+00	\N	6	2026-04-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
100	2026-07-29 02:53:20.515972+00	2026-07-29 02:53:20.515972+00	\N	6	2026-04-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
101	2026-07-29 02:53:20.518091+00	2026-07-29 02:53:20.518091+00	\N	6	2026-04-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
102	2026-07-29 02:53:20.520693+00	2026-07-29 02:53:20.520693+00	\N	6	2026-04-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
103	2026-07-29 02:53:20.522418+00	2026-07-29 02:53:20.522418+00	\N	6	2026-04-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
104	2026-07-29 02:53:20.524017+00	2026-07-29 02:53:20.524017+00	\N	6	2026-04-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
105	2026-07-29 02:53:20.527698+00	2026-07-29 02:53:20.527698+00	\N	6	2026-04-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
106	2026-07-29 02:53:20.529271+00	2026-07-29 02:53:20.529271+00	\N	6	2026-05-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
107	2026-07-29 02:53:20.531252+00	2026-07-29 02:53:20.531252+00	\N	6	2026-05-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
108	2026-07-29 02:53:20.533028+00	2026-07-29 02:53:20.533028+00	\N	6	2026-05-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
109	2026-07-29 02:53:20.535119+00	2026-07-29 02:53:20.535119+00	\N	6	2026-05-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
110	2026-07-29 02:53:20.537005+00	2026-07-29 02:53:20.537005+00	\N	6	2026-05-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
111	2026-07-29 02:53:20.538788+00	2026-07-29 02:53:20.538788+00	\N	6	2026-05-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
112	2026-07-29 02:53:20.540573+00	2026-07-29 02:53:20.540573+00	\N	6	2026-05-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
113	2026-07-29 02:53:20.541876+00	2026-07-29 02:53:20.541876+00	\N	6	2026-05-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
114	2026-07-29 02:53:20.544332+00	2026-07-29 02:53:20.544332+00	\N	6	2026-05-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
115	2026-07-29 02:53:20.546115+00	2026-07-29 02:53:20.546115+00	\N	6	2026-05-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
116	2026-07-29 02:53:20.547884+00	2026-07-29 02:53:20.547884+00	\N	6	2026-05-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
117	2026-07-29 02:53:20.54985+00	2026-07-29 02:53:20.54985+00	\N	6	2026-05-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
118	2026-07-29 02:53:20.551928+00	2026-07-29 02:53:20.551928+00	\N	6	2026-05-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
119	2026-07-29 02:53:20.553836+00	2026-07-29 02:53:20.553836+00	\N	6	2026-05-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
120	2026-07-29 02:53:20.555781+00	2026-07-29 02:53:20.555781+00	\N	6	2026-05-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
121	2026-07-29 02:53:20.557637+00	2026-07-29 02:53:20.557637+00	\N	6	2026-05-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
122	2026-07-29 02:53:20.559792+00	2026-07-29 02:53:20.559792+00	\N	6	2026-05-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
123	2026-07-29 02:53:20.561632+00	2026-07-29 02:53:20.561632+00	\N	6	2026-05-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
124	2026-07-29 02:53:20.563559+00	2026-07-29 02:53:20.563559+00	\N	6	2026-05-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
125	2026-07-29 02:53:20.56555+00	2026-07-29 02:53:20.56555+00	\N	6	2026-05-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
126	2026-07-29 02:53:20.567451+00	2026-07-29 02:53:20.567451+00	\N	6	2026-05-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
127	2026-07-29 02:53:20.569467+00	2026-07-29 02:53:20.569467+00	\N	6	2026-06-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
128	2026-07-29 02:53:20.570887+00	2026-07-29 02:53:20.570887+00	\N	6	2026-06-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
129	2026-07-29 02:53:20.573436+00	2026-07-29 02:53:20.573436+00	\N	6	2026-06-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
130	2026-07-29 02:53:20.575625+00	2026-07-29 02:53:20.575625+00	\N	6	2026-06-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
131	2026-07-29 02:53:20.577704+00	2026-07-29 02:53:20.577704+00	\N	6	2026-06-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
132	2026-07-29 02:53:20.579836+00	2026-07-29 02:53:20.579836+00	\N	6	2026-06-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
133	2026-07-29 02:53:20.58208+00	2026-07-29 02:53:20.58208+00	\N	6	2026-06-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
134	2026-07-29 02:53:20.584026+00	2026-07-29 02:53:20.584026+00	\N	6	2026-06-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
135	2026-07-29 02:53:20.585578+00	2026-07-29 02:53:20.585578+00	\N	6	2026-06-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
136	2026-07-29 02:53:20.587955+00	2026-07-29 02:53:20.587955+00	\N	6	2026-06-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
137	2026-07-29 02:53:20.589341+00	2026-07-29 02:53:20.589341+00	\N	6	2026-06-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
138	2026-07-29 02:53:20.591567+00	2026-07-29 02:53:20.591567+00	\N	6	2026-06-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
139	2026-07-29 02:53:20.593713+00	2026-07-29 02:53:20.593713+00	\N	6	2026-06-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
140	2026-07-29 02:53:20.595581+00	2026-07-29 02:53:20.595581+00	\N	6	2026-06-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
141	2026-07-29 02:53:20.597422+00	2026-07-29 02:53:20.597422+00	\N	6	2026-06-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
142	2026-07-29 02:53:20.599256+00	2026-07-29 02:53:20.599256+00	\N	6	2026-06-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
143	2026-07-29 02:53:20.601677+00	2026-07-29 02:53:20.601677+00	\N	6	2026-06-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
144	2026-07-29 02:53:20.603726+00	2026-07-29 02:53:20.603726+00	\N	6	2026-06-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
145	2026-07-29 02:53:20.60525+00	2026-07-29 02:53:20.60525+00	\N	6	2026-06-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
146	2026-07-29 02:53:20.607475+00	2026-07-29 02:53:20.607475+00	\N	6	2026-06-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
147	2026-07-29 02:53:20.60954+00	2026-07-29 02:53:20.60954+00	\N	6	2026-06-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
148	2026-07-29 02:53:20.611444+00	2026-07-29 02:53:20.611444+00	\N	6	2026-06-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
149	2026-07-29 02:53:20.613434+00	2026-07-29 02:53:20.613434+00	\N	6	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
150	2026-07-29 02:53:20.615388+00	2026-07-29 02:53:20.615388+00	\N	6	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
151	2026-07-29 02:53:20.617352+00	2026-07-29 02:53:20.617352+00	\N	6	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
152	2026-07-29 02:53:20.619487+00	2026-07-29 02:53:20.619487+00	\N	6	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
153	2026-07-29 02:53:20.620866+00	2026-07-29 02:53:20.620866+00	\N	6	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
154	2026-07-29 02:53:20.623199+00	2026-07-29 02:53:20.623199+00	\N	6	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
155	2026-07-29 02:53:20.625017+00	2026-07-29 02:53:20.625017+00	\N	6	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
156	2026-07-29 02:53:20.626852+00	2026-07-29 02:53:20.626852+00	\N	6	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
157	2026-07-29 02:53:20.628614+00	2026-07-29 02:53:20.628614+00	\N	6	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
158	2026-07-29 02:53:20.630403+00	2026-07-29 02:53:20.630403+00	\N	6	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
159	2026-07-29 02:53:20.631899+00	2026-07-29 02:53:20.631899+00	\N	6	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
160	2026-07-29 02:53:20.634062+00	2026-07-29 02:53:20.634062+00	\N	6	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
161	2026-07-29 02:53:20.63586+00	2026-07-29 02:53:20.63586+00	\N	6	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
162	2026-07-29 02:53:20.638001+00	2026-07-29 02:53:20.638001+00	\N	6	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
163	2026-07-29 02:53:20.639819+00	2026-07-29 02:53:20.639819+00	\N	6	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
164	2026-07-29 02:53:20.641155+00	2026-07-29 02:53:20.641155+00	\N	6	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
165	2026-07-29 02:53:20.643554+00	2026-07-29 02:53:20.643554+00	\N	6	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
166	2026-07-29 02:53:20.645301+00	2026-07-29 02:53:20.645301+00	\N	6	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
167	2026-07-29 02:53:20.647076+00	2026-07-29 02:53:20.647076+00	\N	6	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
168	2026-07-29 02:53:20.648889+00	2026-07-29 02:53:20.648889+00	\N	6	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
169	2026-07-29 03:25:56.300761+00	2026-07-29 03:25:56.300761+00	\N	6	2026-01-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
170	2026-07-29 03:25:56.312684+00	2026-07-29 03:25:56.312684+00	\N	6	2026-01-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
171	2026-07-29 03:25:56.315292+00	2026-07-29 03:25:56.315292+00	\N	6	2026-01-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
172	2026-07-29 03:25:56.317624+00	2026-07-29 03:25:56.317624+00	\N	6	2026-01-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
173	2026-07-29 03:25:56.319731+00	2026-07-29 03:25:56.319731+00	\N	6	2026-01-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
174	2026-07-29 03:25:56.321784+00	2026-07-29 03:25:56.321784+00	\N	6	2026-01-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
175	2026-07-29 03:25:56.323937+00	2026-07-29 03:25:56.323937+00	\N	6	2026-01-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
176	2026-07-29 03:25:56.325937+00	2026-07-29 03:25:56.325937+00	\N	6	2026-01-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
177	2026-07-29 03:25:56.327914+00	2026-07-29 03:25:56.327914+00	\N	6	2026-01-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
178	2026-07-29 03:25:56.329639+00	2026-07-29 03:25:56.329639+00	\N	6	2026-01-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
179	2026-07-29 03:25:56.332517+00	2026-07-29 03:25:56.332517+00	\N	6	2026-01-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
180	2026-07-29 03:25:56.334025+00	2026-07-29 03:25:56.334025+00	\N	6	2026-01-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
181	2026-07-29 03:25:56.336021+00	2026-07-29 03:25:56.336021+00	\N	6	2026-01-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
182	2026-07-29 03:25:56.338737+00	2026-07-29 03:25:56.338737+00	\N	6	2026-01-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
183	2026-07-29 03:25:56.340496+00	2026-07-29 03:25:56.340496+00	\N	6	2026-01-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
184	2026-07-29 03:25:56.342594+00	2026-07-29 03:25:56.342594+00	\N	6	2026-01-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
185	2026-07-29 03:25:56.344636+00	2026-07-29 03:25:56.344636+00	\N	6	2026-01-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
186	2026-07-29 03:25:56.347049+00	2026-07-29 03:25:56.347049+00	\N	6	2026-01-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
187	2026-07-29 03:25:56.349386+00	2026-07-29 03:25:56.349386+00	\N	6	2026-01-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
188	2026-07-29 03:25:56.351183+00	2026-07-29 03:25:56.351183+00	\N	6	2026-01-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
189	2026-07-29 03:25:56.352944+00	2026-07-29 03:25:56.352944+00	\N	6	2026-01-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
190	2026-07-29 03:25:56.354448+00	2026-07-29 03:25:56.354448+00	\N	6	2026-01-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
191	2026-07-29 03:25:56.356474+00	2026-07-29 03:25:56.356474+00	\N	6	2026-02-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
192	2026-07-29 03:25:56.358434+00	2026-07-29 03:25:56.358434+00	\N	6	2026-02-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
193	2026-07-29 03:25:56.360196+00	2026-07-29 03:25:56.360196+00	\N	6	2026-02-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
194	2026-07-29 03:25:56.361886+00	2026-07-29 03:25:56.361886+00	\N	6	2026-02-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
195	2026-07-29 03:25:56.36386+00	2026-07-29 03:25:56.36386+00	\N	6	2026-02-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
196	2026-07-29 03:25:56.366071+00	2026-07-29 03:25:56.366071+00	\N	6	2026-02-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
197	2026-07-29 03:25:56.367955+00	2026-07-29 03:25:56.367955+00	\N	6	2026-02-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
198	2026-07-29 03:25:56.369502+00	2026-07-29 03:25:56.369502+00	\N	6	2026-02-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
199	2026-07-29 03:25:56.371047+00	2026-07-29 03:25:56.371047+00	\N	6	2026-02-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
200	2026-07-29 03:25:56.373515+00	2026-07-29 03:25:56.373515+00	\N	6	2026-02-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
201	2026-07-29 03:25:56.375373+00	2026-07-29 03:25:56.375373+00	\N	6	2026-02-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
202	2026-07-29 03:25:56.377212+00	2026-07-29 03:25:56.377212+00	\N	6	2026-02-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
203	2026-07-29 03:25:56.378809+00	2026-07-29 03:25:56.378809+00	\N	6	2026-02-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
204	2026-07-29 03:25:56.381314+00	2026-07-29 03:25:56.381314+00	\N	6	2026-02-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
205	2026-07-29 03:25:56.383428+00	2026-07-29 03:25:56.383428+00	\N	6	2026-02-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
206	2026-07-29 03:25:56.385168+00	2026-07-29 03:25:56.385168+00	\N	6	2026-02-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
207	2026-07-29 03:25:56.386952+00	2026-07-29 03:25:56.386952+00	\N	6	2026-02-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
208	2026-07-29 03:25:56.388552+00	2026-07-29 03:25:56.388552+00	\N	6	2026-02-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
209	2026-07-29 03:25:56.390584+00	2026-07-29 03:25:56.390584+00	\N	6	2026-02-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
210	2026-07-29 03:25:56.392202+00	2026-07-29 03:25:56.392202+00	\N	6	2026-02-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
211	2026-07-29 03:25:56.394174+00	2026-07-29 03:25:56.394174+00	\N	6	2026-03-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
212	2026-07-29 03:25:56.395926+00	2026-07-29 03:25:56.395926+00	\N	6	2026-03-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
213	2026-07-29 03:25:56.39784+00	2026-07-29 03:25:56.39784+00	\N	6	2026-03-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
214	2026-07-29 03:25:56.399927+00	2026-07-29 03:25:56.399927+00	\N	6	2026-03-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
215	2026-07-29 03:25:56.401671+00	2026-07-29 03:25:56.401671+00	\N	6	2026-03-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
216	2026-07-29 03:25:56.403508+00	2026-07-29 03:25:56.403508+00	\N	6	2026-03-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
217	2026-07-29 03:25:56.405065+00	2026-07-29 03:25:56.405065+00	\N	6	2026-03-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
218	2026-07-29 03:25:56.40683+00	2026-07-29 03:25:56.40683+00	\N	6	2026-03-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
219	2026-07-29 03:25:56.408583+00	2026-07-29 03:25:56.408583+00	\N	6	2026-03-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
220	2026-07-29 03:25:56.410513+00	2026-07-29 03:25:56.410513+00	\N	6	2026-03-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
221	2026-07-29 03:25:56.412208+00	2026-07-29 03:25:56.412208+00	\N	6	2026-03-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
222	2026-07-29 03:25:56.413978+00	2026-07-29 03:25:56.413978+00	\N	6	2026-03-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
223	2026-07-29 03:25:56.416215+00	2026-07-29 03:25:56.416215+00	\N	6	2026-03-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
224	2026-07-29 03:25:56.418017+00	2026-07-29 03:25:56.418017+00	\N	6	2026-03-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
225	2026-07-29 03:25:56.419847+00	2026-07-29 03:25:56.419847+00	\N	6	2026-03-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
226	2026-07-29 03:25:56.421751+00	2026-07-29 03:25:56.421751+00	\N	6	2026-03-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
227	2026-07-29 03:25:56.423496+00	2026-07-29 03:25:56.423496+00	\N	6	2026-03-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
228	2026-07-29 03:25:56.424963+00	2026-07-29 03:25:56.424963+00	\N	6	2026-03-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
229	2026-07-29 03:25:56.426797+00	2026-07-29 03:25:56.426797+00	\N	6	2026-03-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
230	2026-07-29 03:25:56.428329+00	2026-07-29 03:25:56.428329+00	\N	6	2026-03-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
231	2026-07-29 03:25:56.430212+00	2026-07-29 03:25:56.430212+00	\N	6	2026-03-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
232	2026-07-29 03:25:56.432707+00	2026-07-29 03:25:56.432707+00	\N	6	2026-03-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
233	2026-07-29 03:25:56.434559+00	2026-07-29 03:25:56.434559+00	\N	6	2026-04-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
234	2026-07-29 03:25:56.436306+00	2026-07-29 03:25:56.436306+00	\N	6	2026-04-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
235	2026-07-29 03:25:56.438469+00	2026-07-29 03:25:56.438469+00	\N	6	2026-04-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
236	2026-07-29 03:25:56.44019+00	2026-07-29 03:25:56.44019+00	\N	6	2026-04-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
237	2026-07-29 03:25:56.442479+00	2026-07-29 03:25:56.442479+00	\N	6	2026-04-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
238	2026-07-29 03:25:56.444161+00	2026-07-29 03:25:56.444161+00	\N	6	2026-04-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
239	2026-07-29 03:25:56.445887+00	2026-07-29 03:25:56.445887+00	\N	7	2026-01-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
240	2026-07-29 03:25:56.448384+00	2026-07-29 03:25:56.448384+00	\N	7	2026-01-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
241	2026-07-29 03:25:56.450104+00	2026-07-29 03:25:56.450104+00	\N	7	2026-01-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
242	2026-07-29 03:25:56.451978+00	2026-07-29 03:25:56.451978+00	\N	7	2026-01-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
243	2026-07-29 03:25:56.454042+00	2026-07-29 03:25:56.454042+00	\N	7	2026-01-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
244	2026-07-29 03:25:56.455791+00	2026-07-29 03:25:56.455791+00	\N	7	2026-01-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
245	2026-07-29 03:25:56.457894+00	2026-07-29 03:25:56.457894+00	\N	7	2026-01-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
246	2026-07-29 03:25:56.460037+00	2026-07-29 03:25:56.460037+00	\N	7	2026-01-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
247	2026-07-29 03:25:56.462403+00	2026-07-29 03:25:56.462403+00	\N	7	2026-01-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
248	2026-07-29 03:25:56.46531+00	2026-07-29 03:25:56.46531+00	\N	7	2026-01-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
249	2026-07-29 03:25:56.466953+00	2026-07-29 03:25:56.466953+00	\N	7	2026-01-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
250	2026-07-29 03:25:56.469309+00	2026-07-29 03:25:56.469309+00	\N	7	2026-01-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
251	2026-07-29 03:25:56.470599+00	2026-07-29 03:25:56.470599+00	\N	7	2026-01-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
252	2026-07-29 03:25:56.472882+00	2026-07-29 03:25:56.472882+00	\N	7	2026-01-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
253	2026-07-29 03:25:56.474619+00	2026-07-29 03:25:56.474619+00	\N	7	2026-01-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
254	2026-07-29 03:25:56.476128+00	2026-07-29 03:25:56.476128+00	\N	7	2026-01-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
255	2026-07-29 03:25:56.477847+00	2026-07-29 03:25:56.477847+00	\N	7	2026-01-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
256	2026-07-29 03:25:56.479664+00	2026-07-29 03:25:56.479664+00	\N	7	2026-01-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
257	2026-07-29 03:25:56.482087+00	2026-07-29 03:25:56.482087+00	\N	7	2026-01-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
258	2026-07-29 03:25:56.483823+00	2026-07-29 03:25:56.483823+00	\N	7	2026-01-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
259	2026-07-29 03:25:56.485672+00	2026-07-29 03:25:56.485672+00	\N	7	2026-01-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
260	2026-07-29 03:25:56.487716+00	2026-07-29 03:25:56.487716+00	\N	7	2026-01-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
261	2026-07-29 03:25:56.489004+00	2026-07-29 03:25:56.489004+00	\N	7	2026-02-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
262	2026-07-29 03:25:56.491191+00	2026-07-29 03:25:56.491191+00	\N	7	2026-02-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
263	2026-07-29 03:25:56.49297+00	2026-07-29 03:25:56.49297+00	\N	7	2026-02-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
264	2026-07-29 03:25:56.494754+00	2026-07-29 03:25:56.494754+00	\N	7	2026-02-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
265	2026-07-29 03:25:56.496505+00	2026-07-29 03:25:56.496505+00	\N	7	2026-02-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
266	2026-07-29 03:25:56.498537+00	2026-07-29 03:25:56.498537+00	\N	7	2026-02-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
267	2026-07-29 03:25:56.500567+00	2026-07-29 03:25:56.500567+00	\N	7	2026-02-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
268	2026-07-29 03:25:56.502108+00	2026-07-29 03:25:56.502108+00	\N	7	2026-02-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
269	2026-07-29 03:25:56.504654+00	2026-07-29 03:25:56.504654+00	\N	7	2026-02-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
270	2026-07-29 03:25:56.506249+00	2026-07-29 03:25:56.506249+00	\N	7	2026-02-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
271	2026-07-29 03:25:56.507982+00	2026-07-29 03:25:56.507982+00	\N	7	2026-02-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
272	2026-07-29 03:25:56.509752+00	2026-07-29 03:25:56.509752+00	\N	7	2026-02-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
273	2026-07-29 03:25:56.511583+00	2026-07-29 03:25:56.511583+00	\N	7	2026-02-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
274	2026-07-29 03:25:56.513263+00	2026-07-29 03:25:56.513263+00	\N	7	2026-02-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
275	2026-07-29 03:25:56.515597+00	2026-07-29 03:25:56.515597+00	\N	7	2026-02-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
276	2026-07-29 03:25:56.517668+00	2026-07-29 03:25:56.517668+00	\N	7	2026-02-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
277	2026-07-29 03:25:56.519472+00	2026-07-29 03:25:56.519472+00	\N	7	2026-02-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
278	2026-07-29 03:25:56.520756+00	2026-07-29 03:25:56.520756+00	\N	7	2026-02-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
279	2026-07-29 03:25:56.522694+00	2026-07-29 03:25:56.522694+00	\N	7	2026-02-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
280	2026-07-29 03:25:56.525084+00	2026-07-29 03:25:56.525084+00	\N	7	2026-02-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
281	2026-07-29 03:25:56.526287+00	2026-07-29 03:25:56.526287+00	\N	7	2026-03-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
282	2026-07-29 03:25:56.528252+00	2026-07-29 03:25:56.528252+00	\N	7	2026-03-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
283	2026-07-29 03:25:56.529957+00	2026-07-29 03:25:56.529957+00	\N	7	2026-03-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
284	2026-07-29 03:25:56.531357+00	2026-07-29 03:25:56.531357+00	\N	7	2026-03-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
285	2026-07-29 03:25:56.533511+00	2026-07-29 03:25:56.533511+00	\N	7	2026-03-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
286	2026-07-29 03:25:56.535873+00	2026-07-29 03:25:56.535873+00	\N	7	2026-03-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
287	2026-07-29 03:25:56.537566+00	2026-07-29 03:25:56.537566+00	\N	7	2026-03-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
288	2026-07-29 03:25:56.538936+00	2026-07-29 03:25:56.538936+00	\N	7	2026-03-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
289	2026-07-29 03:25:56.541097+00	2026-07-29 03:25:56.541097+00	\N	7	2026-03-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
290	2026-07-29 03:25:56.542639+00	2026-07-29 03:25:56.542639+00	\N	7	2026-03-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
291	2026-07-29 03:25:56.544993+00	2026-07-29 03:25:56.544993+00	\N	7	2026-03-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
292	2026-07-29 03:25:56.546768+00	2026-07-29 03:25:56.546768+00	\N	7	2026-03-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
293	2026-07-29 03:25:56.548991+00	2026-07-29 03:25:56.548991+00	\N	7	2026-03-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
294	2026-07-29 03:25:56.55084+00	2026-07-29 03:25:56.55084+00	\N	7	2026-03-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
295	2026-07-29 03:25:56.552548+00	2026-07-29 03:25:56.552548+00	\N	7	2026-03-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
296	2026-07-29 03:25:56.55428+00	2026-07-29 03:25:56.55428+00	\N	7	2026-03-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
297	2026-07-29 03:25:56.556021+00	2026-07-29 03:25:56.556021+00	\N	7	2026-03-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
298	2026-07-29 03:25:56.557869+00	2026-07-29 03:25:56.557869+00	\N	7	2026-03-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
299	2026-07-29 03:25:56.559652+00	2026-07-29 03:25:56.559652+00	\N	7	2026-03-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
300	2026-07-29 03:25:56.561669+00	2026-07-29 03:25:56.561669+00	\N	7	2026-03-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
301	2026-07-29 03:25:56.563285+00	2026-07-29 03:25:56.563285+00	\N	7	2026-03-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
302	2026-07-29 03:25:56.565463+00	2026-07-29 03:25:56.565463+00	\N	7	2026-03-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
303	2026-07-29 03:25:56.567723+00	2026-07-29 03:25:56.567723+00	\N	7	2026-04-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
304	2026-07-29 03:25:56.569459+00	2026-07-29 03:25:56.569459+00	\N	7	2026-04-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
305	2026-07-29 03:25:56.570798+00	2026-07-29 03:25:56.570798+00	\N	7	2026-04-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
306	2026-07-29 03:25:56.572988+00	2026-07-29 03:25:56.572988+00	\N	7	2026-04-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
307	2026-07-29 03:25:56.5749+00	2026-07-29 03:25:56.5749+00	\N	7	2026-04-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
308	2026-07-29 03:25:56.576937+00	2026-07-29 03:25:56.576937+00	\N	7	2026-04-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
309	2026-07-29 03:25:56.579075+00	2026-07-29 03:25:56.579075+00	\N	7	2026-04-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
310	2026-07-29 03:25:56.580351+00	2026-07-29 03:25:56.580351+00	\N	7	2026-04-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
311	2026-07-29 03:25:56.583724+00	2026-07-29 03:25:56.583724+00	\N	7	2026-04-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
312	2026-07-29 03:25:56.585485+00	2026-07-29 03:25:56.585485+00	\N	7	2026-04-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
313	2026-07-29 03:25:56.587337+00	2026-07-29 03:25:56.587337+00	\N	7	2026-04-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
314	2026-07-29 03:25:56.589077+00	2026-07-29 03:25:56.589077+00	\N	7	2026-04-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
315	2026-07-29 03:25:56.59082+00	2026-07-29 03:25:56.59082+00	\N	7	2026-04-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
316	2026-07-29 03:25:56.592549+00	2026-07-29 03:25:56.592549+00	\N	7	2026-04-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
317	2026-07-29 03:25:56.594677+00	2026-07-29 03:25:56.594677+00	\N	7	2026-04-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
318	2026-07-29 03:25:56.596448+00	2026-07-29 03:25:56.596448+00	\N	7	2026-04-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
319	2026-07-29 03:25:56.598479+00	2026-07-29 03:25:56.598479+00	\N	7	2026-04-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
320	2026-07-29 03:25:56.599966+00	2026-07-29 03:25:56.599966+00	\N	7	2026-04-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
321	2026-07-29 03:25:56.602025+00	2026-07-29 03:25:56.602025+00	\N	7	2026-04-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
322	2026-07-29 03:25:56.603904+00	2026-07-29 03:25:56.603904+00	\N	7	2026-04-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
323	2026-07-29 03:25:56.605924+00	2026-07-29 03:25:56.605924+00	\N	7	2026-04-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
324	2026-07-29 03:25:56.607462+00	2026-07-29 03:25:56.607462+00	\N	7	2026-04-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
325	2026-07-29 03:25:56.609402+00	2026-07-29 03:25:56.609402+00	\N	7	2026-05-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
326	2026-07-29 03:25:56.611223+00	2026-07-29 03:25:56.611223+00	\N	7	2026-05-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
327	2026-07-29 03:25:56.612978+00	2026-07-29 03:25:56.612978+00	\N	7	2026-05-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
328	2026-07-29 03:25:56.615019+00	2026-07-29 03:25:56.615019+00	\N	7	2026-05-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
329	2026-07-29 03:25:56.616931+00	2026-07-29 03:25:56.616931+00	\N	7	2026-05-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
330	2026-07-29 03:25:56.618828+00	2026-07-29 03:25:56.618828+00	\N	7	2026-05-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
331	2026-07-29 03:25:56.62057+00	2026-07-29 03:25:56.62057+00	\N	7	2026-05-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
332	2026-07-29 03:25:56.622165+00	2026-07-29 03:25:56.622165+00	\N	7	2026-05-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
333	2026-07-29 03:25:56.623918+00	2026-07-29 03:25:56.623918+00	\N	7	2026-05-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
334	2026-07-29 03:25:56.625924+00	2026-07-29 03:25:56.625924+00	\N	7	2026-05-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
335	2026-07-29 03:25:56.627344+00	2026-07-29 03:25:56.627344+00	\N	7	2026-05-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
336	2026-07-29 03:25:56.629026+00	2026-07-29 03:25:56.629026+00	\N	7	2026-05-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
337	2026-07-29 03:25:56.631346+00	2026-07-29 03:25:56.631346+00	\N	7	2026-05-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
338	2026-07-29 03:25:56.633471+00	2026-07-29 03:25:56.633471+00	\N	7	2026-05-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
339	2026-07-29 03:25:56.63533+00	2026-07-29 03:25:56.63533+00	\N	7	2026-05-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
340	2026-07-29 03:25:56.637297+00	2026-07-29 03:25:56.637297+00	\N	7	2026-05-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
341	2026-07-29 03:25:56.63908+00	2026-07-29 03:25:56.63908+00	\N	7	2026-05-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
342	2026-07-29 03:25:56.640795+00	2026-07-29 03:25:56.640795+00	\N	7	2026-05-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
343	2026-07-29 03:25:56.642537+00	2026-07-29 03:25:56.642537+00	\N	7	2026-05-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
344	2026-07-29 03:25:56.644247+00	2026-07-29 03:25:56.644247+00	\N	7	2026-05-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
345	2026-07-29 03:25:56.645768+00	2026-07-29 03:25:56.645768+00	\N	7	2026-05-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
346	2026-07-29 03:25:56.647384+00	2026-07-29 03:25:56.647384+00	\N	7	2026-06-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
347	2026-07-29 03:25:56.649979+00	2026-07-29 03:25:56.649979+00	\N	7	2026-06-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
348	2026-07-29 03:25:56.652033+00	2026-07-29 03:25:56.652033+00	\N	7	2026-06-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
349	2026-07-29 03:25:56.653774+00	2026-07-29 03:25:56.653774+00	\N	7	2026-06-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
350	2026-07-29 03:25:56.655521+00	2026-07-29 03:25:56.655521+00	\N	7	2026-06-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
351	2026-07-29 03:25:56.657163+00	2026-07-29 03:25:56.657163+00	\N	7	2026-06-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
352	2026-07-29 03:25:56.659178+00	2026-07-29 03:25:56.659178+00	\N	7	2026-06-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
353	2026-07-29 03:25:56.660928+00	2026-07-29 03:25:56.660928+00	\N	7	2026-06-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
354	2026-07-29 03:25:56.662677+00	2026-07-29 03:25:56.662677+00	\N	7	2026-06-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
355	2026-07-29 03:25:56.664937+00	2026-07-29 03:25:56.664937+00	\N	7	2026-06-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
356	2026-07-29 03:25:56.66712+00	2026-07-29 03:25:56.66712+00	\N	7	2026-06-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
357	2026-07-29 03:25:56.669178+00	2026-07-29 03:25:56.669178+00	\N	7	2026-06-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
358	2026-07-29 03:25:56.670828+00	2026-07-29 03:25:56.670828+00	\N	7	2026-06-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
359	2026-07-29 03:25:56.672795+00	2026-07-29 03:25:56.672795+00	\N	7	2026-06-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
360	2026-07-29 03:25:56.674566+00	2026-07-29 03:25:56.674566+00	\N	7	2026-06-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
361	2026-07-29 03:25:56.676348+00	2026-07-29 03:25:56.676348+00	\N	7	2026-06-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
362	2026-07-29 03:25:56.678225+00	2026-07-29 03:25:56.678225+00	\N	7	2026-06-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
363	2026-07-29 03:25:56.680263+00	2026-07-29 03:25:56.680263+00	\N	7	2026-06-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
364	2026-07-29 03:25:56.682389+00	2026-07-29 03:25:56.682389+00	\N	7	2026-06-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
365	2026-07-29 03:25:56.68433+00	2026-07-29 03:25:56.68433+00	\N	7	2026-06-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
366	2026-07-29 03:25:56.686083+00	2026-07-29 03:25:56.686083+00	\N	7	2026-06-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
367	2026-07-29 03:25:56.687954+00	2026-07-29 03:25:56.687954+00	\N	7	2026-06-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
368	2026-07-29 03:25:56.689408+00	2026-07-29 03:25:56.689408+00	\N	7	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
369	2026-07-29 03:25:56.691159+00	2026-07-29 03:25:56.691159+00	\N	7	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
370	2026-07-29 03:25:56.693262+00	2026-07-29 03:25:56.693262+00	\N	7	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
371	2026-07-29 03:25:56.695111+00	2026-07-29 03:25:56.695111+00	\N	7	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
372	2026-07-29 03:25:56.697588+00	2026-07-29 03:25:56.697588+00	\N	7	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
373	2026-07-29 03:25:56.700109+00	2026-07-29 03:25:56.700109+00	\N	7	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
374	2026-07-29 03:25:56.701428+00	2026-07-29 03:25:56.701428+00	\N	7	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
375	2026-07-29 03:25:56.70445+00	2026-07-29 03:25:56.70445+00	\N	7	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
376	2026-07-29 03:25:56.706417+00	2026-07-29 03:25:56.706417+00	\N	7	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
377	2026-07-29 03:25:56.708238+00	2026-07-29 03:25:56.708238+00	\N	7	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
378	2026-07-29 03:25:56.710142+00	2026-07-29 03:25:56.710142+00	\N	7	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
379	2026-07-29 03:25:56.711704+00	2026-07-29 03:25:56.711704+00	\N	7	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
380	2026-07-29 03:25:56.713666+00	2026-07-29 03:25:56.713666+00	\N	7	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
381	2026-07-29 03:25:56.715624+00	2026-07-29 03:25:56.715624+00	\N	7	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
382	2026-07-29 03:25:56.717695+00	2026-07-29 03:25:56.717695+00	\N	7	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
383	2026-07-29 03:25:56.720113+00	2026-07-29 03:25:56.720113+00	\N	7	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
384	2026-07-29 03:25:56.721808+00	2026-07-29 03:25:56.721808+00	\N	7	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
385	2026-07-29 03:25:56.723554+00	2026-07-29 03:25:56.723554+00	\N	7	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
386	2026-07-29 03:25:56.72554+00	2026-07-29 03:25:56.72554+00	\N	7	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
387	2026-07-29 03:25:56.727604+00	2026-07-29 03:25:56.727604+00	\N	7	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
388	2026-07-29 03:25:56.731737+00	2026-07-29 03:25:56.731737+00	\N	8	2026-01-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
389	2026-07-29 03:25:56.733802+00	2026-07-29 03:25:56.733802+00	\N	8	2026-01-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
390	2026-07-29 03:25:56.735605+00	2026-07-29 03:25:56.735605+00	\N	8	2026-01-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
391	2026-07-29 03:25:56.73752+00	2026-07-29 03:25:56.73752+00	\N	8	2026-01-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
392	2026-07-29 03:25:56.739473+00	2026-07-29 03:25:56.739473+00	\N	8	2026-01-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
393	2026-07-29 03:25:56.741465+00	2026-07-29 03:25:56.741465+00	\N	8	2026-01-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
394	2026-07-29 03:25:56.743388+00	2026-07-29 03:25:56.743388+00	\N	8	2026-01-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
395	2026-07-29 03:25:56.745141+00	2026-07-29 03:25:56.745141+00	\N	8	2026-01-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
396	2026-07-29 03:25:56.746952+00	2026-07-29 03:25:56.746952+00	\N	8	2026-01-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
397	2026-07-29 03:25:56.749091+00	2026-07-29 03:25:56.749091+00	\N	8	2026-01-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
398	2026-07-29 03:25:56.750969+00	2026-07-29 03:25:56.750969+00	\N	8	2026-01-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
399	2026-07-29 03:25:56.752745+00	2026-07-29 03:25:56.752745+00	\N	8	2026-01-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
400	2026-07-29 03:25:56.754602+00	2026-07-29 03:25:56.754602+00	\N	8	2026-01-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
401	2026-07-29 03:25:56.756432+00	2026-07-29 03:25:56.756432+00	\N	8	2026-01-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
402	2026-07-29 03:25:56.758259+00	2026-07-29 03:25:56.758259+00	\N	8	2026-01-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
403	2026-07-29 03:25:56.760304+00	2026-07-29 03:25:56.760304+00	\N	8	2026-01-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
404	2026-07-29 03:25:56.762744+00	2026-07-29 03:25:56.762744+00	\N	8	2026-01-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
405	2026-07-29 03:25:56.765068+00	2026-07-29 03:25:56.765068+00	\N	8	2026-01-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
406	2026-07-29 03:25:56.766676+00	2026-07-29 03:25:56.766676+00	\N	8	2026-01-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
407	2026-07-29 03:25:56.769028+00	2026-07-29 03:25:56.769028+00	\N	8	2026-01-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
408	2026-07-29 03:25:56.770855+00	2026-07-29 03:25:56.770855+00	\N	8	2026-01-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
409	2026-07-29 03:25:56.775051+00	2026-07-29 03:25:56.775051+00	\N	8	2026-01-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
410	2026-07-29 03:25:56.777144+00	2026-07-29 03:25:56.777144+00	\N	8	2026-02-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
411	2026-07-29 03:25:56.778767+00	2026-07-29 03:25:56.778767+00	\N	8	2026-02-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
412	2026-07-29 03:25:56.78137+00	2026-07-29 03:25:56.78137+00	\N	8	2026-02-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
413	2026-07-29 03:25:56.783189+00	2026-07-29 03:25:56.783189+00	\N	8	2026-02-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
414	2026-07-29 03:25:56.785038+00	2026-07-29 03:25:56.785038+00	\N	8	2026-02-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
415	2026-07-29 03:25:56.786585+00	2026-07-29 03:25:56.786585+00	\N	8	2026-02-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
416	2026-07-29 03:25:56.788595+00	2026-07-29 03:25:56.788595+00	\N	8	2026-02-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
417	2026-07-29 03:25:56.790483+00	2026-07-29 03:25:56.790483+00	\N	8	2026-02-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
418	2026-07-29 03:25:56.792482+00	2026-07-29 03:25:56.792482+00	\N	8	2026-02-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
419	2026-07-29 03:25:56.794236+00	2026-07-29 03:25:56.794236+00	\N	8	2026-02-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
420	2026-07-29 03:25:56.795969+00	2026-07-29 03:25:56.795969+00	\N	8	2026-02-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
421	2026-07-29 03:25:56.79786+00	2026-07-29 03:25:56.79786+00	\N	8	2026-02-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
422	2026-07-29 03:25:56.799988+00	2026-07-29 03:25:56.799988+00	\N	8	2026-02-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
423	2026-07-29 03:25:56.801924+00	2026-07-29 03:25:56.801924+00	\N	8	2026-02-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
424	2026-07-29 03:25:56.803501+00	2026-07-29 03:25:56.803501+00	\N	8	2026-02-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
425	2026-07-29 03:25:56.80524+00	2026-07-29 03:25:56.80524+00	\N	8	2026-02-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
426	2026-07-29 03:25:56.807007+00	2026-07-29 03:25:56.807007+00	\N	8	2026-02-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
427	2026-07-29 03:25:56.809051+00	2026-07-29 03:25:56.809051+00	\N	8	2026-02-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
428	2026-07-29 03:25:56.81088+00	2026-07-29 03:25:56.81088+00	\N	8	2026-02-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
429	2026-07-29 03:25:56.812606+00	2026-07-29 03:25:56.812606+00	\N	8	2026-02-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
430	2026-07-29 03:25:56.814622+00	2026-07-29 03:25:56.814622+00	\N	8	2026-03-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
431	2026-07-29 03:25:56.816653+00	2026-07-29 03:25:56.816653+00	\N	8	2026-03-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
432	2026-07-29 03:25:56.818776+00	2026-07-29 03:25:56.818776+00	\N	8	2026-03-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
433	2026-07-29 03:25:56.820591+00	2026-07-29 03:25:56.820591+00	\N	8	2026-03-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
434	2026-07-29 03:25:56.82288+00	2026-07-29 03:25:56.82288+00	\N	8	2026-03-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
435	2026-07-29 03:25:56.82442+00	2026-07-29 03:25:56.82442+00	\N	8	2026-03-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
436	2026-07-29 03:25:56.826444+00	2026-07-29 03:25:56.826444+00	\N	8	2026-03-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
437	2026-07-29 03:25:56.828189+00	2026-07-29 03:25:56.828189+00	\N	8	2026-03-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
438	2026-07-29 03:25:56.830008+00	2026-07-29 03:25:56.830008+00	\N	8	2026-03-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
439	2026-07-29 03:25:56.83194+00	2026-07-29 03:25:56.83194+00	\N	8	2026-03-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
440	2026-07-29 03:25:56.833904+00	2026-07-29 03:25:56.833904+00	\N	8	2026-03-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
441	2026-07-29 03:25:56.835808+00	2026-07-29 03:25:56.835808+00	\N	8	2026-03-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
442	2026-07-29 03:25:56.837848+00	2026-07-29 03:25:56.837848+00	\N	8	2026-03-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
443	2026-07-29 03:25:56.839666+00	2026-07-29 03:25:56.839666+00	\N	8	2026-03-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
444	2026-07-29 03:25:56.841485+00	2026-07-29 03:25:56.841485+00	\N	8	2026-03-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
445	2026-07-29 03:25:56.843228+00	2026-07-29 03:25:56.843228+00	\N	8	2026-03-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
446	2026-07-29 03:25:56.844973+00	2026-07-29 03:25:56.844973+00	\N	8	2026-03-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
447	2026-07-29 03:25:56.846742+00	2026-07-29 03:25:56.846742+00	\N	8	2026-03-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
448	2026-07-29 03:25:56.848914+00	2026-07-29 03:25:56.848914+00	\N	8	2026-03-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
449	2026-07-29 03:25:56.850772+00	2026-07-29 03:25:56.850772+00	\N	8	2026-03-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
450	2026-07-29 03:25:56.852367+00	2026-07-29 03:25:56.852367+00	\N	8	2026-03-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
451	2026-07-29 03:25:56.854741+00	2026-07-29 03:25:56.854741+00	\N	8	2026-03-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
452	2026-07-29 03:25:56.856268+00	2026-07-29 03:25:56.856268+00	\N	8	2026-04-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
453	2026-07-29 03:25:56.85802+00	2026-07-29 03:25:56.85802+00	\N	8	2026-04-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
454	2026-07-29 03:25:56.859766+00	2026-07-29 03:25:56.859766+00	\N	8	2026-04-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
455	2026-07-29 03:25:56.861733+00	2026-07-29 03:25:56.861733+00	\N	8	2026-04-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
456	2026-07-29 03:25:56.863642+00	2026-07-29 03:25:56.863642+00	\N	8	2026-04-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
457	2026-07-29 03:25:56.865775+00	2026-07-29 03:25:56.865775+00	\N	8	2026-04-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
458	2026-07-29 03:25:56.867246+00	2026-07-29 03:25:56.867246+00	\N	8	2026-04-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
459	2026-07-29 03:25:56.869472+00	2026-07-29 03:25:56.869472+00	\N	8	2026-04-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
460	2026-07-29 03:25:56.870785+00	2026-07-29 03:25:56.870785+00	\N	8	2026-04-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
461	2026-07-29 03:25:56.872971+00	2026-07-29 03:25:56.872971+00	\N	8	2026-04-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
462	2026-07-29 03:25:56.87439+00	2026-07-29 03:25:56.87439+00	\N	8	2026-04-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
463	2026-07-29 03:25:56.876555+00	2026-07-29 03:25:56.876555+00	\N	8	2026-04-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
464	2026-07-29 03:25:56.878397+00	2026-07-29 03:25:56.878397+00	\N	8	2026-04-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
465	2026-07-29 03:25:56.880421+00	2026-07-29 03:25:56.880421+00	\N	8	2026-04-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
466	2026-07-29 03:25:56.883103+00	2026-07-29 03:25:56.883103+00	\N	8	2026-04-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
467	2026-07-29 03:25:56.885524+00	2026-07-29 03:25:56.885524+00	\N	8	2026-04-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
468	2026-07-29 03:25:56.888118+00	2026-07-29 03:25:56.888118+00	\N	8	2026-04-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
469	2026-07-29 03:25:56.889727+00	2026-07-29 03:25:56.889727+00	\N	8	2026-04-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
470	2026-07-29 03:25:56.891879+00	2026-07-29 03:25:56.891879+00	\N	8	2026-04-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
471	2026-07-29 03:25:56.893759+00	2026-07-29 03:25:56.893759+00	\N	8	2026-04-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
472	2026-07-29 03:25:56.895602+00	2026-07-29 03:25:56.895602+00	\N	8	2026-04-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
473	2026-07-29 03:25:56.897397+00	2026-07-29 03:25:56.897397+00	\N	8	2026-04-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
474	2026-07-29 03:25:56.899517+00	2026-07-29 03:25:56.899517+00	\N	8	2026-05-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
475	2026-07-29 03:25:56.901442+00	2026-07-29 03:25:56.901442+00	\N	8	2026-05-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
476	2026-07-29 03:25:56.903255+00	2026-07-29 03:25:56.903255+00	\N	8	2026-05-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
477	2026-07-29 03:25:56.905044+00	2026-07-29 03:25:56.905044+00	\N	8	2026-05-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
478	2026-07-29 03:25:56.906771+00	2026-07-29 03:25:56.906771+00	\N	8	2026-05-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
479	2026-07-29 03:25:56.908566+00	2026-07-29 03:25:56.908566+00	\N	8	2026-05-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
480	2026-07-29 03:25:56.910021+00	2026-07-29 03:25:56.910021+00	\N	8	2026-05-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
481	2026-07-29 03:25:56.911836+00	2026-07-29 03:25:56.911836+00	\N	8	2026-05-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
482	2026-07-29 03:25:56.914354+00	2026-07-29 03:25:56.914354+00	\N	8	2026-05-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
483	2026-07-29 03:25:56.915748+00	2026-07-29 03:25:56.915748+00	\N	8	2026-05-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
484	2026-07-29 03:25:56.918189+00	2026-07-29 03:25:56.918189+00	\N	8	2026-05-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
485	2026-07-29 03:25:56.919949+00	2026-07-29 03:25:56.919949+00	\N	8	2026-05-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
486	2026-07-29 03:25:56.921816+00	2026-07-29 03:25:56.921816+00	\N	8	2026-05-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
487	2026-07-29 03:25:56.923696+00	2026-07-29 03:25:56.923696+00	\N	8	2026-05-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
488	2026-07-29 03:25:56.925427+00	2026-07-29 03:25:56.925427+00	\N	8	2026-05-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
489	2026-07-29 03:25:56.927202+00	2026-07-29 03:25:56.927202+00	\N	8	2026-05-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
490	2026-07-29 03:25:56.92896+00	2026-07-29 03:25:56.92896+00	\N	8	2026-05-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
491	2026-07-29 03:25:56.930954+00	2026-07-29 03:25:56.930954+00	\N	8	2026-05-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
492	2026-07-29 03:25:56.932765+00	2026-07-29 03:25:56.932765+00	\N	8	2026-05-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
493	2026-07-29 03:25:56.934865+00	2026-07-29 03:25:56.934865+00	\N	8	2026-05-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
494	2026-07-29 03:25:56.936255+00	2026-07-29 03:25:56.936255+00	\N	8	2026-05-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
495	2026-07-29 03:25:56.938659+00	2026-07-29 03:25:56.938659+00	\N	8	2026-06-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
496	2026-07-29 03:25:56.940486+00	2026-07-29 03:25:56.940486+00	\N	8	2026-06-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
497	2026-07-29 03:25:56.942268+00	2026-07-29 03:25:56.942268+00	\N	8	2026-06-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
498	2026-07-29 03:25:56.944003+00	2026-07-29 03:25:56.944003+00	\N	8	2026-06-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
499	2026-07-29 03:25:56.945941+00	2026-07-29 03:25:56.945941+00	\N	8	2026-06-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
500	2026-07-29 03:25:56.947937+00	2026-07-29 03:25:56.947937+00	\N	8	2026-06-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
501	2026-07-29 03:25:56.949754+00	2026-07-29 03:25:56.949754+00	\N	8	2026-06-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
502	2026-07-29 03:25:56.951516+00	2026-07-29 03:25:56.951516+00	\N	8	2026-06-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
503	2026-07-29 03:25:56.953043+00	2026-07-29 03:25:56.953043+00	\N	8	2026-06-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
504	2026-07-29 03:25:56.954842+00	2026-07-29 03:25:56.954842+00	\N	8	2026-06-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
505	2026-07-29 03:25:56.957112+00	2026-07-29 03:25:56.957112+00	\N	8	2026-06-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
506	2026-07-29 03:25:56.958894+00	2026-07-29 03:25:56.958894+00	\N	8	2026-06-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
507	2026-07-29 03:25:56.960368+00	2026-07-29 03:25:56.960368+00	\N	8	2026-06-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
508	2026-07-29 03:25:56.962643+00	2026-07-29 03:25:56.962643+00	\N	8	2026-06-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
509	2026-07-29 03:25:56.964526+00	2026-07-29 03:25:56.964526+00	\N	8	2026-06-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
510	2026-07-29 03:25:56.966693+00	2026-07-29 03:25:56.966693+00	\N	8	2026-06-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
511	2026-07-29 03:25:56.968255+00	2026-07-29 03:25:56.968255+00	\N	8	2026-06-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
512	2026-07-29 03:25:56.970281+00	2026-07-29 03:25:56.970281+00	\N	8	2026-06-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
513	2026-07-29 03:25:56.971953+00	2026-07-29 03:25:56.971953+00	\N	8	2026-06-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
514	2026-07-29 03:25:56.973876+00	2026-07-29 03:25:56.973876+00	\N	8	2026-06-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
515	2026-07-29 03:25:56.975732+00	2026-07-29 03:25:56.975732+00	\N	8	2026-06-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
516	2026-07-29 03:25:56.977484+00	2026-07-29 03:25:56.977484+00	\N	8	2026-06-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
517	2026-07-29 03:25:56.979272+00	2026-07-29 03:25:56.979272+00	\N	8	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
518	2026-07-29 03:25:56.981715+00	2026-07-29 03:25:56.981715+00	\N	8	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
519	2026-07-29 03:25:56.983513+00	2026-07-29 03:25:56.983513+00	\N	8	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
520	2026-07-29 03:25:56.985814+00	2026-07-29 03:25:56.985814+00	\N	8	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
521	2026-07-29 03:25:56.987394+00	2026-07-29 03:25:56.987394+00	\N	8	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
522	2026-07-29 03:25:56.989174+00	2026-07-29 03:25:56.989174+00	\N	8	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
523	2026-07-29 03:25:56.990896+00	2026-07-29 03:25:56.990896+00	\N	8	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
524	2026-07-29 03:25:56.992745+00	2026-07-29 03:25:56.992745+00	\N	8	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
525	2026-07-29 03:25:56.994776+00	2026-07-29 03:25:56.994776+00	\N	8	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
526	2026-07-29 03:25:56.99654+00	2026-07-29 03:25:56.99654+00	\N	8	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
527	2026-07-29 03:25:56.998982+00	2026-07-29 03:25:56.998982+00	\N	8	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
528	2026-07-29 03:25:57.001158+00	2026-07-29 03:25:57.001158+00	\N	8	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
529	2026-07-29 03:25:57.003357+00	2026-07-29 03:25:57.003357+00	\N	8	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
530	2026-07-29 03:25:57.00542+00	2026-07-29 03:25:57.00542+00	\N	8	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
531	2026-07-29 03:25:57.007685+00	2026-07-29 03:25:57.007685+00	\N	8	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
532	2026-07-29 03:25:57.009405+00	2026-07-29 03:25:57.009405+00	\N	8	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
533	2026-07-29 03:25:57.010995+00	2026-07-29 03:25:57.010995+00	\N	8	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
534	2026-07-29 03:25:57.012889+00	2026-07-29 03:25:57.012889+00	\N	8	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
535	2026-07-29 03:25:57.015268+00	2026-07-29 03:25:57.015268+00	\N	8	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
536	2026-07-29 03:25:57.017086+00	2026-07-29 03:25:57.017086+00	\N	8	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
537	2026-07-29 03:25:57.019444+00	2026-07-29 03:25:57.019444+00	\N	9	2026-01-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
538	2026-07-29 03:25:57.021225+00	2026-07-29 03:25:57.021225+00	\N	9	2026-01-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
539	2026-07-29 03:25:57.022995+00	2026-07-29 03:25:57.022995+00	\N	9	2026-01-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
540	2026-07-29 03:25:57.02473+00	2026-07-29 03:25:57.02473+00	\N	9	2026-01-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
541	2026-07-29 03:25:57.026495+00	2026-07-29 03:25:57.026495+00	\N	9	2026-01-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
542	2026-07-29 03:25:57.028274+00	2026-07-29 03:25:57.028274+00	\N	9	2026-01-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
543	2026-07-29 03:25:57.029592+00	2026-07-29 03:25:57.029592+00	\N	9	2026-01-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
544	2026-07-29 03:25:57.032416+00	2026-07-29 03:25:57.032416+00	\N	9	2026-01-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
545	2026-07-29 03:25:57.034284+00	2026-07-29 03:25:57.034284+00	\N	9	2026-01-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
546	2026-07-29 03:25:57.035899+00	2026-07-29 03:25:57.035899+00	\N	9	2026-01-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
547	2026-07-29 03:25:57.037984+00	2026-07-29 03:25:57.037984+00	\N	9	2026-01-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
548	2026-07-29 03:25:57.040061+00	2026-07-29 03:25:57.040061+00	\N	9	2026-01-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
549	2026-07-29 03:25:57.041908+00	2026-07-29 03:25:57.041908+00	\N	9	2026-01-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
550	2026-07-29 03:25:57.043675+00	2026-07-29 03:25:57.043675+00	\N	9	2026-01-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
551	2026-07-29 03:25:57.045446+00	2026-07-29 03:25:57.045446+00	\N	9	2026-01-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
552	2026-07-29 03:25:57.047507+00	2026-07-29 03:25:57.047507+00	\N	9	2026-01-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
553	2026-07-29 03:25:57.049786+00	2026-07-29 03:25:57.049786+00	\N	9	2026-01-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
554	2026-07-29 03:25:57.051732+00	2026-07-29 03:25:57.051732+00	\N	9	2026-01-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
555	2026-07-29 03:25:57.053573+00	2026-07-29 03:25:57.053573+00	\N	9	2026-01-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
556	2026-07-29 03:25:57.055072+00	2026-07-29 03:25:57.055072+00	\N	9	2026-01-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
557	2026-07-29 03:25:57.0568+00	2026-07-29 03:25:57.0568+00	\N	9	2026-01-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
558	2026-07-29 03:25:57.058581+00	2026-07-29 03:25:57.058581+00	\N	9	2026-01-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
559	2026-07-29 03:25:57.060611+00	2026-07-29 03:25:57.060611+00	\N	9	2026-02-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
560	2026-07-29 03:25:57.062467+00	2026-07-29 03:25:57.062467+00	\N	9	2026-02-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
561	2026-07-29 03:25:57.064868+00	2026-07-29 03:25:57.064868+00	\N	9	2026-02-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
562	2026-07-29 03:25:57.066542+00	2026-07-29 03:25:57.066542+00	\N	9	2026-02-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
563	2026-07-29 03:25:57.068463+00	2026-07-29 03:25:57.068463+00	\N	9	2026-02-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
564	2026-07-29 03:25:57.070274+00	2026-07-29 03:25:57.070274+00	\N	9	2026-02-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
565	2026-07-29 03:25:57.072092+00	2026-07-29 03:25:57.072092+00	\N	9	2026-02-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
566	2026-07-29 03:25:57.073718+00	2026-07-29 03:25:57.073718+00	\N	9	2026-02-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
567	2026-07-29 03:25:57.07527+00	2026-07-29 03:25:57.07527+00	\N	9	2026-02-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
568	2026-07-29 03:25:57.077364+00	2026-07-29 03:25:57.077364+00	\N	9	2026-02-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
569	2026-07-29 03:25:57.078608+00	2026-07-29 03:25:57.078608+00	\N	9	2026-02-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
570	2026-07-29 03:25:57.081015+00	2026-07-29 03:25:57.081015+00	\N	9	2026-02-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
571	2026-07-29 03:25:57.083017+00	2026-07-29 03:25:57.083017+00	\N	9	2026-02-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
572	2026-07-29 03:25:57.084925+00	2026-07-29 03:25:57.084925+00	\N	9	2026-02-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
573	2026-07-29 03:25:57.086736+00	2026-07-29 03:25:57.086736+00	\N	9	2026-02-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
574	2026-07-29 03:25:57.088074+00	2026-07-29 03:25:57.088074+00	\N	9	2026-02-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
575	2026-07-29 03:25:57.090263+00	2026-07-29 03:25:57.090263+00	\N	9	2026-02-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
576	2026-07-29 03:25:57.092146+00	2026-07-29 03:25:57.092146+00	\N	9	2026-02-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
577	2026-07-29 03:25:57.094128+00	2026-07-29 03:25:57.094128+00	\N	9	2026-02-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
578	2026-07-29 03:25:57.096004+00	2026-07-29 03:25:57.096004+00	\N	9	2026-02-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
579	2026-07-29 03:25:57.099377+00	2026-07-29 03:25:57.099377+00	\N	9	2026-03-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
580	2026-07-29 03:25:57.101469+00	2026-07-29 03:25:57.101469+00	\N	9	2026-03-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
581	2026-07-29 03:25:57.10371+00	2026-07-29 03:25:57.10371+00	\N	9	2026-03-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
582	2026-07-29 03:25:57.105928+00	2026-07-29 03:25:57.105928+00	\N	9	2026-03-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
583	2026-07-29 03:25:57.108158+00	2026-07-29 03:25:57.108158+00	\N	9	2026-03-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
584	2026-07-29 03:25:57.110291+00	2026-07-29 03:25:57.110291+00	\N	9	2026-03-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
585	2026-07-29 03:25:57.112412+00	2026-07-29 03:25:57.112412+00	\N	9	2026-03-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
586	2026-07-29 03:25:57.115075+00	2026-07-29 03:25:57.115075+00	\N	9	2026-03-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
587	2026-07-29 03:25:57.116966+00	2026-07-29 03:25:57.116966+00	\N	9	2026-03-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
588	2026-07-29 03:25:57.119074+00	2026-07-29 03:25:57.119074+00	\N	9	2026-03-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
589	2026-07-29 03:25:57.121574+00	2026-07-29 03:25:57.121574+00	\N	9	2026-03-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
590	2026-07-29 03:25:57.123645+00	2026-07-29 03:25:57.123645+00	\N	9	2026-03-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
591	2026-07-29 03:25:57.126079+00	2026-07-29 03:25:57.126079+00	\N	9	2026-03-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
592	2026-07-29 03:25:57.128442+00	2026-07-29 03:25:57.128442+00	\N	9	2026-03-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
593	2026-07-29 03:25:57.131477+00	2026-07-29 03:25:57.131477+00	\N	9	2026-03-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
594	2026-07-29 03:25:57.133526+00	2026-07-29 03:25:57.133526+00	\N	9	2026-03-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
595	2026-07-29 03:25:57.135685+00	2026-07-29 03:25:57.135685+00	\N	9	2026-03-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
596	2026-07-29 03:25:57.137806+00	2026-07-29 03:25:57.137806+00	\N	9	2026-03-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
597	2026-07-29 03:25:57.139911+00	2026-07-29 03:25:57.139911+00	\N	9	2026-03-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
598	2026-07-29 03:25:57.141976+00	2026-07-29 03:25:57.141976+00	\N	9	2026-03-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
599	2026-07-29 03:25:57.144075+00	2026-07-29 03:25:57.144075+00	\N	9	2026-03-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
600	2026-07-29 03:25:57.145999+00	2026-07-29 03:25:57.145999+00	\N	9	2026-03-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
601	2026-07-29 03:25:57.148162+00	2026-07-29 03:25:57.148162+00	\N	9	2026-04-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
602	2026-07-29 03:25:57.150409+00	2026-07-29 03:25:57.150409+00	\N	9	2026-04-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
603	2026-07-29 03:25:57.152407+00	2026-07-29 03:25:57.152407+00	\N	9	2026-04-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
604	2026-07-29 03:25:57.154474+00	2026-07-29 03:25:57.154474+00	\N	9	2026-04-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
605	2026-07-29 03:25:57.156643+00	2026-07-29 03:25:57.156643+00	\N	9	2026-04-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
606	2026-07-29 03:25:57.158749+00	2026-07-29 03:25:57.158749+00	\N	9	2026-04-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
607	2026-07-29 03:25:57.160756+00	2026-07-29 03:25:57.160756+00	\N	9	2026-04-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
608	2026-07-29 03:25:57.16178+00	2026-07-29 03:25:57.16178+00	\N	9	2026-04-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
609	2026-07-29 03:25:57.16532+00	2026-07-29 03:25:57.16532+00	\N	9	2026-04-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
610	2026-07-29 03:25:57.167655+00	2026-07-29 03:25:57.167655+00	\N	9	2026-04-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
611	2026-07-29 03:25:57.169767+00	2026-07-29 03:25:57.169767+00	\N	9	2026-04-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
612	2026-07-29 03:25:57.17257+00	2026-07-29 03:25:57.17257+00	\N	9	2026-04-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
613	2026-07-29 03:25:57.174689+00	2026-07-29 03:25:57.174689+00	\N	9	2026-04-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
614	2026-07-29 03:25:57.176723+00	2026-07-29 03:25:57.176723+00	\N	9	2026-04-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
615	2026-07-29 03:25:57.178729+00	2026-07-29 03:25:57.178729+00	\N	9	2026-04-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
616	2026-07-29 03:25:57.181295+00	2026-07-29 03:25:57.181295+00	\N	9	2026-04-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
617	2026-07-29 03:25:57.183372+00	2026-07-29 03:25:57.183372+00	\N	9	2026-04-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
618	2026-07-29 03:25:57.185604+00	2026-07-29 03:25:57.185604+00	\N	9	2026-04-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
619	2026-07-29 03:25:57.187763+00	2026-07-29 03:25:57.187763+00	\N	9	2026-04-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
620	2026-07-29 03:25:57.189823+00	2026-07-29 03:25:57.189823+00	\N	9	2026-04-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
621	2026-07-29 03:25:57.192307+00	2026-07-29 03:25:57.192307+00	\N	9	2026-04-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
622	2026-07-29 03:25:57.194483+00	2026-07-29 03:25:57.194483+00	\N	9	2026-04-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
623	2026-07-29 03:25:57.196633+00	2026-07-29 03:25:57.196633+00	\N	9	2026-05-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
624	2026-07-29 03:25:57.199209+00	2026-07-29 03:25:57.199209+00	\N	9	2026-05-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
625	2026-07-29 03:25:57.201763+00	2026-07-29 03:25:57.201763+00	\N	9	2026-05-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
626	2026-07-29 03:25:57.204043+00	2026-07-29 03:25:57.204043+00	\N	9	2026-05-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
627	2026-07-29 03:25:57.206097+00	2026-07-29 03:25:57.206097+00	\N	9	2026-05-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
628	2026-07-29 03:25:57.20846+00	2026-07-29 03:25:57.20846+00	\N	9	2026-05-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
629	2026-07-29 03:25:57.210679+00	2026-07-29 03:25:57.210679+00	\N	9	2026-05-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
630	2026-07-29 03:25:57.212796+00	2026-07-29 03:25:57.212796+00	\N	9	2026-05-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
631	2026-07-29 03:25:57.215851+00	2026-07-29 03:25:57.215851+00	\N	9	2026-05-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
632	2026-07-29 03:25:57.217782+00	2026-07-29 03:25:57.217782+00	\N	9	2026-05-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
633	2026-07-29 03:25:57.219859+00	2026-07-29 03:25:57.219859+00	\N	9	2026-05-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
634	2026-07-29 03:25:57.221876+00	2026-07-29 03:25:57.221876+00	\N	9	2026-05-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
635	2026-07-29 03:25:57.22407+00	2026-07-29 03:25:57.22407+00	\N	9	2026-05-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
636	2026-07-29 03:25:57.226211+00	2026-07-29 03:25:57.226211+00	\N	9	2026-05-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
637	2026-07-29 03:25:57.228221+00	2026-07-29 03:25:57.228221+00	\N	9	2026-05-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
638	2026-07-29 03:25:57.230883+00	2026-07-29 03:25:57.230883+00	\N	9	2026-05-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
639	2026-07-29 03:25:57.233199+00	2026-07-29 03:25:57.233199+00	\N	9	2026-05-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
640	2026-07-29 03:25:57.235462+00	2026-07-29 03:25:57.235462+00	\N	9	2026-05-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
641	2026-07-29 03:25:57.23756+00	2026-07-29 03:25:57.23756+00	\N	9	2026-05-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
642	2026-07-29 03:25:57.239722+00	2026-07-29 03:25:57.239722+00	\N	9	2026-05-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
643	2026-07-29 03:25:57.241717+00	2026-07-29 03:25:57.241717+00	\N	9	2026-05-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
644	2026-07-29 03:25:57.244226+00	2026-07-29 03:25:57.244226+00	\N	9	2026-06-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
645	2026-07-29 03:25:57.246498+00	2026-07-29 03:25:57.246498+00	\N	9	2026-06-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
646	2026-07-29 03:25:57.249233+00	2026-07-29 03:25:57.249233+00	\N	9	2026-06-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
647	2026-07-29 03:25:57.251512+00	2026-07-29 03:25:57.251512+00	\N	9	2026-06-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
648	2026-07-29 03:25:57.253661+00	2026-07-29 03:25:57.253661+00	\N	9	2026-06-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
649	2026-07-29 03:25:57.255782+00	2026-07-29 03:25:57.255782+00	\N	9	2026-06-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
650	2026-07-29 03:25:57.257847+00	2026-07-29 03:25:57.257847+00	\N	9	2026-06-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
651	2026-07-29 03:25:57.259956+00	2026-07-29 03:25:57.259956+00	\N	9	2026-06-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
652	2026-07-29 03:25:57.262085+00	2026-07-29 03:25:57.262085+00	\N	9	2026-06-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
653	2026-07-29 03:25:57.265214+00	2026-07-29 03:25:57.265214+00	\N	9	2026-06-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
654	2026-07-29 03:25:57.26761+00	2026-07-29 03:25:57.26761+00	\N	9	2026-06-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
655	2026-07-29 03:25:57.27034+00	2026-07-29 03:25:57.27034+00	\N	9	2026-06-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
656	2026-07-29 03:25:57.27275+00	2026-07-29 03:25:57.27275+00	\N	9	2026-06-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
657	2026-07-29 03:25:57.274838+00	2026-07-29 03:25:57.274838+00	\N	9	2026-06-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
658	2026-07-29 03:25:57.276825+00	2026-07-29 03:25:57.276825+00	\N	9	2026-06-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
659	2026-07-29 03:25:57.279047+00	2026-07-29 03:25:57.279047+00	\N	9	2026-06-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
660	2026-07-29 03:25:57.282148+00	2026-07-29 03:25:57.282148+00	\N	9	2026-06-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
661	2026-07-29 03:25:57.284474+00	2026-07-29 03:25:57.284474+00	\N	9	2026-06-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
662	2026-07-29 03:25:57.286547+00	2026-07-29 03:25:57.286547+00	\N	9	2026-06-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
663	2026-07-29 03:25:57.288536+00	2026-07-29 03:25:57.288536+00	\N	9	2026-06-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
664	2026-07-29 03:25:57.290417+00	2026-07-29 03:25:57.290417+00	\N	9	2026-06-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
665	2026-07-29 03:25:57.292316+00	2026-07-29 03:25:57.292316+00	\N	9	2026-06-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
666	2026-07-29 03:25:57.294464+00	2026-07-29 03:25:57.294464+00	\N	9	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
667	2026-07-29 03:25:57.296479+00	2026-07-29 03:25:57.296479+00	\N	9	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
668	2026-07-29 03:25:57.298912+00	2026-07-29 03:25:57.298912+00	\N	9	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
669	2026-07-29 03:25:57.301078+00	2026-07-29 03:25:57.301078+00	\N	9	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
670	2026-07-29 03:25:57.303143+00	2026-07-29 03:25:57.303143+00	\N	9	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
671	2026-07-29 03:25:57.305711+00	2026-07-29 03:25:57.305711+00	\N	9	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
672	2026-07-29 03:25:57.308043+00	2026-07-29 03:25:57.308043+00	\N	9	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
673	2026-07-29 03:25:57.310569+00	2026-07-29 03:25:57.310569+00	\N	9	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
674	2026-07-29 03:25:57.313674+00	2026-07-29 03:25:57.313674+00	\N	9	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
675	2026-07-29 03:25:57.316521+00	2026-07-29 03:25:57.316521+00	\N	9	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
676	2026-07-29 03:25:57.319149+00	2026-07-29 03:25:57.319149+00	\N	9	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
677	2026-07-29 03:25:57.321817+00	2026-07-29 03:25:57.321817+00	\N	9	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
678	2026-07-29 03:25:57.323603+00	2026-07-29 03:25:57.323603+00	\N	9	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
679	2026-07-29 03:25:57.32591+00	2026-07-29 03:25:57.32591+00	\N	9	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
680	2026-07-29 03:25:57.328063+00	2026-07-29 03:25:57.328063+00	\N	9	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
681	2026-07-29 03:25:57.330162+00	2026-07-29 03:25:57.330162+00	\N	9	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
682	2026-07-29 03:25:57.332755+00	2026-07-29 03:25:57.332755+00	\N	9	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
683	2026-07-29 03:25:57.334942+00	2026-07-29 03:25:57.334942+00	\N	9	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
684	2026-07-29 03:25:57.336874+00	2026-07-29 03:25:57.336874+00	\N	9	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
686	2026-07-29 03:25:57.340548+00	2026-07-29 03:25:57.340548+00	\N	10	2026-07-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
687	2026-07-29 03:25:57.342407+00	2026-07-29 03:25:57.342407+00	\N	10	2026-07-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
688	2026-07-29 03:25:57.344177+00	2026-07-29 03:25:57.344177+00	\N	10	2026-07-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
689	2026-07-29 03:25:57.346143+00	2026-07-29 03:25:57.346143+00	\N	10	2026-07-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
690	2026-07-29 03:25:57.347503+00	2026-07-29 03:25:57.347503+00	\N	10	2026-07-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
691	2026-07-29 03:25:57.350198+00	2026-07-29 03:25:57.350198+00	\N	10	2026-07-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
692	2026-07-29 03:25:57.35272+00	2026-07-29 03:25:57.35272+00	\N	10	2026-07-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
693	2026-07-29 03:25:57.354696+00	2026-07-29 03:25:57.354696+00	\N	10	2026-07-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
694	2026-07-29 03:25:57.356863+00	2026-07-29 03:25:57.356863+00	\N	10	2026-07-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
695	2026-07-29 03:25:57.358345+00	2026-07-29 03:25:57.358345+00	\N	10	2026-07-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
696	2026-07-29 03:25:57.360124+00	2026-07-29 03:25:57.360124+00	\N	10	2026-07-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
697	2026-07-29 03:25:57.36166+00	2026-07-29 03:25:57.36166+00	\N	10	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
698	2026-07-29 03:25:57.363439+00	2026-07-29 03:25:57.363439+00	\N	10	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
699	2026-07-29 03:25:57.365604+00	2026-07-29 03:25:57.365604+00	\N	10	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
700	2026-07-29 03:25:57.367754+00	2026-07-29 03:25:57.367754+00	\N	10	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
701	2026-07-29 03:25:57.369564+00	2026-07-29 03:25:57.369564+00	\N	10	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
702	2026-07-29 03:25:57.3706+00	2026-07-29 03:25:57.3706+00	\N	10	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
703	2026-07-29 03:25:57.373153+00	2026-07-29 03:25:57.373153+00	\N	10	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
704	2026-07-29 03:25:57.374451+00	2026-07-29 03:25:57.374451+00	\N	10	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
705	2026-07-29 03:25:57.376681+00	2026-07-29 03:25:57.376681+00	\N	10	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
706	2026-07-29 03:51:36.048761+00	2026-07-29 03:51:36.048761+00	\N	10	2026-07-30	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
712	2026-07-29 05:33:38.674159+00	2026-07-29 05:33:41.049246+00	\N	9	2026-07-28	2026-07-28 02:30:00+00	2026-07-28 11:00:00+00	Terlambat	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	WFO	\N	\N	\N	\N	\N	kantor	t	t	30	t
6	2026-07-23 09:54:38.471706+00	2026-07-23 10:28:48.230232+00	\N	3	2026-07-23	2026-07-23 09:54:38.439188+00	2026-07-23 10:28:48.160342+00	Terlambat	-6.122805261375076	106.80687213843969	149	t	http://localhost:9000/golan-attendance/3173072812041001-checkin-1784800478.jpg	-6.122571057701365	106.80684822884284	183	t	http://localhost:9000/golan-attendance/3173072812041001-checkout-1784802528.jpg	WFH	\N	-6.122571057701365	106.80684822884284	183	t	rumah	f	t	474	f
4	2026-07-23 07:12:51.981159+00	2026-07-23 11:00:43.440789+00	\N	2	2026-07-23	2026-07-23 07:12:51.921896+00	2026-07-23 11:00:00+00	Terlambat	-6.122497108811354	106.8068329683619	202	t	http://localhost:9000/golan-attendance/3215642311567952-checkin-1784790771.jpg	0	0	0	f		Dinas Luar	\N	-6.122497108811354	106.8068329683619	202	t	custom	t	t	312	f
7	2026-07-24 03:31:50.606414+00	2026-07-27 01:33:43.303969+00	\N	3	2026-07-24	2026-07-24 03:31:50.540306+00	2026-07-24 11:00:00+00	Terlambat	-6.122486653619491	106.80683741903422	187	t	http://localhost:9000/golan-attendance/3173072812041001-checkin-1784863910.jpg	0	0	0	f		WFH	\N	-6.122486653619491	106.80683741903422	187	t	rumah	t	t	91	f
84	2026-07-27 04:57:49.714225+00	2026-07-27 10:15:00.144472+00	\N	3	2026-07-27	2026-07-27 04:57:49.655805+00	2026-07-27 10:15:00.107406+00	Terlambat	-6.122910466882941	106.80678391389564	105	t	http://localhost:9000/golan-attendance/3173072812041001-checkin-1785128269.jpg	-6.123004213081404	106.80678032836047	97	t	http://localhost:9000/golan-attendance/3173072812041001-checkout-1785147300.jpg	WFH	\N	-6.123004213081404	106.80678032836047	97	t	rumah	f	t	177	f
87	2026-07-28 02:37:26.521223+00	2026-07-29 00:49:20.468915+00	\N	3	2026-07-28	2026-07-28 02:37:26.3956+00	2026-07-28 11:00:00+00	Terlambat	-6.122970572762854	106.80676949670877	95	t	http://localhost:9000/golan-attendance/3173072812041001-checkin-1785206246.jpg	0	0	0	f		WFH	\N	-6.122970572762854	106.80676949670877	95	t	rumah	t	t	37	f
770	2026-07-30 07:18:22.975287+00	2026-07-30 07:18:22.975287+00	\N	1	2026-08-22	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
771	2026-07-30 07:18:22.976323+00	2026-07-30 07:18:22.976323+00	\N	1	2026-08-23	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
772	2026-07-30 07:18:22.977492+00	2026-07-30 07:18:22.977492+00	\N	1	2026-08-24	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
707	2026-07-29 03:54:30.889421+00	2026-07-30 01:49:06.000692+00	\N	10	2026-07-29	2026-07-29 03:54:30.823866+00	2026-07-29 11:00:00+00	Terlambat	0	0	10	t	http://localhost:9000/golan-attendance/3273010101010003-checkin-1785297270.png	0	0	0	f		Dinas Luar	\N	0	0	10	t	custom	t	t	114	t
708	2026-07-29 04:19:28.237242+00	2026-07-30 01:49:06.040465+00	\N	11	2026-07-29	2026-07-29 04:19:28.204971+00	2026-07-29 11:00:00+00	Terlambat	-6.122970572762854	106.80676949670877	95	t	http://localhost:9000/golan-attendance/3173072812041028-checkin-1785298768.jpg	0	0	0	f		Dinas Luar	\N	-6.122970572762854	106.80676949670877	95	t	custom	t	t	139	t
709	2026-07-29 04:45:46.277155+00	2026-07-30 01:49:06.046492+00	\N	6	2026-07-29	2026-07-29 04:45:46.238161+00	2026-07-29 11:00:00+00	Terlambat	-6.122945119206009	106.80677083648071	98	t	http://localhost:9000/golan-attendance/3173072812041007-checkin-1785300346.jpg	0	0	0	f		Dinas Luar	\N	-6.122945119206009	106.80677083648071	98	t	custom	t	t	165	t
758	2026-07-30 07:18:22.961885+00	2026-07-30 07:18:22.961885+00	\N	1	2026-08-10	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
759	2026-07-30 07:18:22.963293+00	2026-07-30 07:18:22.963293+00	\N	1	2026-08-11	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
760	2026-07-30 07:18:22.964392+00	2026-07-30 07:18:22.964392+00	\N	1	2026-08-12	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
761	2026-07-30 07:18:22.965543+00	2026-07-30 07:18:22.965543+00	\N	1	2026-08-13	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
762	2026-07-30 07:18:22.966723+00	2026-07-30 07:18:22.966723+00	\N	1	2026-08-14	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
763	2026-07-30 07:18:22.967766+00	2026-07-30 07:18:22.967766+00	\N	1	2026-08-15	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
764	2026-07-30 07:18:22.968836+00	2026-07-30 07:18:22.968836+00	\N	1	2026-08-16	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
765	2026-07-30 07:18:22.969883+00	2026-07-30 07:18:22.969883+00	\N	1	2026-08-17	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
766	2026-07-30 07:18:22.970995+00	2026-07-30 07:18:22.970995+00	\N	1	2026-08-18	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
767	2026-07-30 07:18:22.972065+00	2026-07-30 07:18:22.972065+00	\N	1	2026-08-19	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
768	2026-07-30 07:18:22.973119+00	2026-07-30 07:18:22.973119+00	\N	1	2026-08-20	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
769	2026-07-30 07:18:22.974252+00	2026-07-30 07:18:22.974252+00	\N	1	2026-08-21	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
773	2026-07-30 07:18:22.978802+00	2026-07-30 07:18:22.978802+00	\N	1	2026-08-25	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
774	2026-07-30 07:18:22.979995+00	2026-07-30 07:18:22.979995+00	\N	1	2026-08-26	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
775	2026-07-30 07:18:22.98195+00	2026-07-30 07:18:22.98195+00	\N	1	2026-08-27	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
779	2026-07-30 12:52:14.34403+00	2026-07-30 12:52:14.34403+00	\N	9	2026-07-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
780	2026-07-30 12:52:14.410507+00	2026-07-30 12:52:14.410507+00	\N	8	2026-07-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
837	2026-07-30 13:29:48.08882+00	2026-07-30 13:29:48.08882+00	\N	6	2026-07-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
838	2026-07-30 13:29:48.099024+00	2026-07-30 13:29:48.099024+00	\N	6	2026-07-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
839	2026-07-30 13:29:48.124212+00	2026-07-30 13:29:48.124212+00	\N	6	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
713	2026-07-29 07:35:13.053011+00	2026-07-29 07:35:13.053011+00	\N	16	2026-07-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
714	2026-07-29 07:35:13.067485+00	2026-07-29 07:35:13.067485+00	\N	16	2026-07-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
715	2026-07-29 07:35:13.073406+00	2026-07-29 07:35:13.073406+00	\N	16	2026-07-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
716	2026-07-29 07:35:13.079588+00	2026-07-29 07:35:13.079588+00	\N	16	2026-07-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
717	2026-07-29 07:35:13.085555+00	2026-07-29 07:35:13.085555+00	\N	16	2026-07-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
718	2026-07-29 07:35:13.092282+00	2026-07-29 07:35:13.092282+00	\N	16	2026-07-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
719	2026-07-29 07:35:13.121675+00	2026-07-29 07:35:13.121675+00	\N	16	2026-07-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
720	2026-07-29 07:35:13.136648+00	2026-07-29 07:35:13.136648+00	\N	16	2026-07-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
721	2026-07-29 07:35:13.149573+00	2026-07-29 07:35:13.149573+00	\N	16	2026-07-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
722	2026-07-29 07:58:25.665401+00	2026-07-29 07:58:25.665401+00	\N	9	2026-08-04	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
724	2026-07-30 01:49:05.917279+00	2026-07-30 01:49:05.917279+00	\N	3	2026-07-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
726	2026-07-30 01:49:05.931375+00	2026-07-30 01:49:05.931375+00	\N	7	2026-07-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
727	2026-07-30 01:49:05.980568+00	2026-07-30 01:49:05.980568+00	\N	8	2026-07-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
728	2026-07-30 01:49:05.986914+00	2026-07-30 01:49:05.986914+00	\N	9	2026-07-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
710	2026-07-29 04:52:12.02894+00	2026-07-30 01:49:06.053834+00	\N	12	2026-07-29	2026-07-29 04:52:11.990201+00	2026-07-29 11:00:00+00	Terlambat	-6.1229640039014885	106.80676975532427	97	t	http://localhost:9000/golan-attendance/3173072812041011-checkin-1785300732.jpg	0	0	0	f		Dinas Luar	\N	-6.1229640039014885	106.80676975532427	97	t	custom	t	t	172	t
730	2026-07-30 02:07:02.71258+00	2026-07-30 02:07:02.71258+00	\N	2	2026-08-23	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
731	2026-07-30 02:07:02.71955+00	2026-07-30 02:07:02.71955+00	\N	2	2026-08-24	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
732	2026-07-30 02:07:02.72396+00	2026-07-30 02:07:02.72396+00	\N	2	2026-08-25	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
733	2026-07-30 02:07:02.727723+00	2026-07-30 02:07:02.727723+00	\N	2	2026-08-26	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
738	2026-07-30 03:55:28.866925+00	2026-07-30 03:55:28.866925+00	\N	13	2026-07-22	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
739	2026-07-30 03:55:28.86952+00	2026-07-30 03:55:28.86952+00	\N	13	2026-07-23	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
740	2026-07-30 03:55:28.870558+00	2026-07-30 03:55:28.870558+00	\N	13	2026-07-24	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
741	2026-07-30 03:55:28.872054+00	2026-07-30 03:55:28.872054+00	\N	13	2026-07-25	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
742	2026-07-30 03:55:28.873361+00	2026-07-30 03:55:28.873361+00	\N	13	2026-07-26	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
743	2026-07-30 03:55:28.874679+00	2026-07-30 03:55:28.874679+00	\N	13	2026-07-27	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
744	2026-07-30 03:55:28.87805+00	2026-07-30 03:55:28.87805+00	\N	13	2026-07-28	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
711	2026-07-29 04:57:35.137016+00	2026-07-30 03:55:28.881498+00	\N	13	2026-07-29	2026-07-29 04:57:35.100659+00	2026-07-29 11:00:00+00	Izin	-6.122945119206009	106.80677083648071	98	t	http://localhost:9000/golan-attendance/3173072812041006-checkin-1785301055.jpg	0	0	0	f		Dinas Luar	\N	-6.122945119206009	106.80677083648071	98	t	custom	t	t	177	t
729	2026-07-30 02:02:12.271776+00	2026-07-30 12:54:55.851406+00	\N	2	2026-07-30	2026-07-30 02:02:12.164014+00	2026-07-30 11:00:00+00	Cuti	-6.168430209025105	106.7074466282196	89	t	http://localhost:9000/golan-attendance/3215642311567952-checkin-1785376932.jpg	0	0	0	f		Dinas Luar	\N	-6.168430209025105	106.7074466282196	89	t	custom	t	f	0	t
745	2026-07-30 03:55:28.885891+00	2026-07-30 03:55:28.885891+00	\N	13	2026-07-31	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
723	2026-07-30 01:49:05.858232+00	2026-07-30 06:17:58.510241+00	\N	2	2026-07-29	\N	\N	Cuti	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
735	2026-07-30 02:46:17.050257+00	2026-07-30 12:54:55.860223+00	\N	1	2026-07-30	2026-07-30 02:46:16.955716+00	2026-07-30 11:00:00+00	Izin	-6.168445919839777	106.70737699003244	127	t	http://localhost:9000/golan-attendance/3173072812041002-checkin-1785379577.jpg	0	0	0	f		Dinas Luar	\N	-6.168445919839777	106.70737699003244	127	t	custom	t	t	46	t
725	2026-07-30 01:49:05.923641+00	2026-07-30 07:18:22.947613+00	\N	1	2026-07-29	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
748	2026-07-30 07:18:22.950077+00	2026-07-30 07:18:22.950077+00	\N	1	2026-07-31	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
749	2026-07-30 07:18:22.95132+00	2026-07-30 07:18:22.95132+00	\N	1	2026-08-01	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
750	2026-07-30 07:18:22.952552+00	2026-07-30 07:18:22.952552+00	\N	1	2026-08-02	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
751	2026-07-30 07:18:22.953701+00	2026-07-30 07:18:22.953701+00	\N	1	2026-08-03	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
752	2026-07-30 07:18:22.954855+00	2026-07-30 07:18:22.954855+00	\N	1	2026-08-04	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
753	2026-07-30 07:18:22.955897+00	2026-07-30 07:18:22.955897+00	\N	1	2026-08-05	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
754	2026-07-30 07:18:22.956947+00	2026-07-30 07:18:22.956947+00	\N	1	2026-08-06	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
755	2026-07-30 07:18:22.958156+00	2026-07-30 07:18:22.958156+00	\N	1	2026-08-07	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
756	2026-07-30 07:18:22.959209+00	2026-07-30 07:18:22.959209+00	\N	1	2026-08-08	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
757	2026-07-30 07:18:22.960259+00	2026-07-30 07:18:22.960259+00	\N	1	2026-08-09	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
746	2026-07-30 07:18:22.939077+00	2026-07-30 07:18:24.16916+00	\N	1	2026-07-25	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
747	2026-07-30 07:18:22.942588+00	2026-07-30 07:18:24.170624+00	\N	1	2026-07-26	\N	\N	Izin	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
776	2026-07-30 12:52:13.298397+00	2026-07-30 12:52:13.298397+00	\N	3	2026-07-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
777	2026-07-30 12:52:13.650062+00	2026-07-30 12:52:13.650062+00	\N	6	2026-07-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
778	2026-07-30 12:52:13.987532+00	2026-07-30 12:52:13.987532+00	\N	7	2026-07-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
736	2026-07-30 03:51:43.659851+00	2026-07-30 12:54:55.835543+00	\N	12	2026-07-30	2026-07-30 03:51:43.623153+00	2026-07-30 11:00:00+00	Terlambat	-6.1684461633273795	106.70738179311098	106	t	http://localhost:9000/golan-attendance/3173072812041011-checkin-1785383503.jpg	0	0	0	f		Dinas Luar	\N	-6.1684461633273795	106.70738179311098	106	t	custom	t	t	111	t
737	2026-07-30 03:52:10.926581+00	2026-07-30 12:54:55.84325+00	\N	13	2026-07-30	2026-07-30 03:52:10.85333+00	2026-07-30 11:00:00+00	Izin	-6.1684461633273795	106.70738179311098	106	t	http://localhost:9000/golan-attendance/3173072812041006-checkin-1785383530.jpg	0	0	0	f		Dinas Luar	\N	-6.1684461633273795	106.70738179311098	106	t	custom	t	t	112	t
734	2026-07-30 02:25:15.285593+00	2026-07-30 12:54:55.825138+00	\N	11	2026-07-30	2026-07-30 02:25:15.195146+00	2026-07-30 11:00:00+00	Terlambat	-6.1683821080623	106.70744831421587	101	t	http://localhost:9000/golan-attendance/3173072812041028-checkin-1785378315.jpg	0	0	0	f		Dinas Luar	\N	-6.1683821080623	106.70744831421587	101	t	custom	t	t	25	t
781	2026-07-30 13:29:47.243416+00	2026-07-30 13:29:47.243416+00	\N	3	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
782	2026-07-30 13:29:47.256738+00	2026-07-30 13:29:47.256738+00	\N	3	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
783	2026-07-30 13:29:47.281798+00	2026-07-30 13:29:47.281798+00	\N	6	2026-01-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
784	2026-07-30 13:29:47.290571+00	2026-07-30 13:29:47.290571+00	\N	6	2026-01-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
785	2026-07-30 13:29:47.314818+00	2026-07-30 13:29:47.314818+00	\N	6	2026-01-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
786	2026-07-30 13:29:47.322635+00	2026-07-30 13:29:47.322635+00	\N	6	2026-01-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
787	2026-07-30 13:29:47.344547+00	2026-07-30 13:29:47.344547+00	\N	6	2026-01-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
788	2026-07-30 13:29:47.352631+00	2026-07-30 13:29:47.352631+00	\N	6	2026-01-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
789	2026-07-30 13:29:47.375122+00	2026-07-30 13:29:47.375122+00	\N	6	2026-01-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
790	2026-07-30 13:29:47.383008+00	2026-07-30 13:29:47.383008+00	\N	6	2026-01-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
791	2026-07-30 13:29:47.404096+00	2026-07-30 13:29:47.404096+00	\N	6	2026-01-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
792	2026-07-30 13:29:47.411716+00	2026-07-30 13:29:47.411716+00	\N	6	2026-02-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
793	2026-07-30 13:29:47.430778+00	2026-07-30 13:29:47.430778+00	\N	6	2026-02-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
794	2026-07-30 13:29:47.43978+00	2026-07-30 13:29:47.43978+00	\N	6	2026-02-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
795	2026-07-30 13:29:47.460982+00	2026-07-30 13:29:47.460982+00	\N	6	2026-02-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
796	2026-07-30 13:29:47.46908+00	2026-07-30 13:29:47.46908+00	\N	6	2026-02-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
797	2026-07-30 13:29:47.489038+00	2026-07-30 13:29:47.489038+00	\N	6	2026-02-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
798	2026-07-30 13:29:47.498546+00	2026-07-30 13:29:47.498546+00	\N	6	2026-02-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
799	2026-07-30 13:29:47.519489+00	2026-07-30 13:29:47.519489+00	\N	6	2026-02-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
800	2026-07-30 13:29:47.527533+00	2026-07-30 13:29:47.527533+00	\N	6	2026-03-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
801	2026-07-30 13:29:47.548496+00	2026-07-30 13:29:47.548496+00	\N	6	2026-03-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
802	2026-07-30 13:29:47.55701+00	2026-07-30 13:29:47.55701+00	\N	6	2026-03-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
803	2026-07-30 13:29:47.578762+00	2026-07-30 13:29:47.578762+00	\N	6	2026-03-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
804	2026-07-30 13:29:47.588055+00	2026-07-30 13:29:47.588055+00	\N	6	2026-03-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
805	2026-07-30 13:29:47.609582+00	2026-07-30 13:29:47.609582+00	\N	6	2026-03-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
806	2026-07-30 13:29:47.618766+00	2026-07-30 13:29:47.618766+00	\N	6	2026-03-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
807	2026-07-30 13:29:47.641924+00	2026-07-30 13:29:47.641924+00	\N	6	2026-03-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
808	2026-07-30 13:29:47.64992+00	2026-07-30 13:29:47.64992+00	\N	6	2026-03-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
809	2026-07-30 13:29:47.670934+00	2026-07-30 13:29:47.670934+00	\N	6	2026-04-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
810	2026-07-30 13:29:47.678245+00	2026-07-30 13:29:47.678245+00	\N	6	2026-04-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
811	2026-07-30 13:29:47.697545+00	2026-07-30 13:29:47.697545+00	\N	6	2026-04-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
812	2026-07-30 13:29:47.704809+00	2026-07-30 13:29:47.704809+00	\N	6	2026-04-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
813	2026-07-30 13:29:47.724586+00	2026-07-30 13:29:47.724586+00	\N	6	2026-04-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
814	2026-07-30 13:29:47.732405+00	2026-07-30 13:29:47.732405+00	\N	6	2026-04-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
815	2026-07-30 13:29:47.755586+00	2026-07-30 13:29:47.755586+00	\N	6	2026-04-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
816	2026-07-30 13:29:47.764757+00	2026-07-30 13:29:47.764757+00	\N	6	2026-04-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
817	2026-07-30 13:29:47.786788+00	2026-07-30 13:29:47.786788+00	\N	6	2026-05-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
818	2026-07-30 13:29:47.796183+00	2026-07-30 13:29:47.796183+00	\N	6	2026-05-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
819	2026-07-30 13:29:47.818563+00	2026-07-30 13:29:47.818563+00	\N	6	2026-05-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
820	2026-07-30 13:29:47.82702+00	2026-07-30 13:29:47.82702+00	\N	6	2026-05-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
821	2026-07-30 13:29:47.851821+00	2026-07-30 13:29:47.851821+00	\N	6	2026-05-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
822	2026-07-30 13:29:47.85917+00	2026-07-30 13:29:47.85917+00	\N	6	2026-05-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
823	2026-07-30 13:29:47.880471+00	2026-07-30 13:29:47.880471+00	\N	6	2026-05-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
824	2026-07-30 13:29:47.888843+00	2026-07-30 13:29:47.888843+00	\N	6	2026-05-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
825	2026-07-30 13:29:47.910624+00	2026-07-30 13:29:47.910624+00	\N	6	2026-05-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
826	2026-07-30 13:29:47.917922+00	2026-07-30 13:29:47.917922+00	\N	6	2026-05-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
827	2026-07-30 13:29:47.937922+00	2026-07-30 13:29:47.937922+00	\N	6	2026-06-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
828	2026-07-30 13:29:47.946563+00	2026-07-30 13:29:47.946563+00	\N	6	2026-06-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
829	2026-07-30 13:29:47.967685+00	2026-07-30 13:29:47.967685+00	\N	6	2026-06-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
830	2026-07-30 13:29:47.977099+00	2026-07-30 13:29:47.977099+00	\N	6	2026-06-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
831	2026-07-30 13:29:48.000014+00	2026-07-30 13:29:48.000014+00	\N	6	2026-06-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
832	2026-07-30 13:29:48.008805+00	2026-07-30 13:29:48.008805+00	\N	6	2026-06-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
833	2026-07-30 13:29:48.030112+00	2026-07-30 13:29:48.030112+00	\N	6	2026-06-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
834	2026-07-30 13:29:48.037808+00	2026-07-30 13:29:48.037808+00	\N	6	2026-06-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
835	2026-07-30 13:29:48.056995+00	2026-07-30 13:29:48.056995+00	\N	6	2026-07-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
836	2026-07-30 13:29:48.066635+00	2026-07-30 13:29:48.066635+00	\N	6	2026-07-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
840	2026-07-30 13:29:48.134658+00	2026-07-30 13:29:48.134658+00	\N	6	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
841	2026-07-30 13:29:48.159107+00	2026-07-30 13:29:48.159107+00	\N	6	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
842	2026-07-30 13:29:48.168383+00	2026-07-30 13:29:48.168383+00	\N	6	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
843	2026-07-30 13:29:48.194541+00	2026-07-30 13:29:48.194541+00	\N	7	2026-01-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
844	2026-07-30 13:29:48.204063+00	2026-07-30 13:29:48.204063+00	\N	7	2026-01-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
845	2026-07-30 13:29:48.228913+00	2026-07-30 13:29:48.228913+00	\N	7	2026-01-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
846	2026-07-30 13:29:48.237398+00	2026-07-30 13:29:48.237398+00	\N	7	2026-01-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
847	2026-07-30 13:29:48.261918+00	2026-07-30 13:29:48.261918+00	\N	7	2026-01-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
848	2026-07-30 13:29:48.271631+00	2026-07-30 13:29:48.271631+00	\N	7	2026-01-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
849	2026-07-30 13:29:48.295036+00	2026-07-30 13:29:48.295036+00	\N	7	2026-01-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
850	2026-07-30 13:29:48.304555+00	2026-07-30 13:29:48.304555+00	\N	7	2026-01-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
851	2026-07-30 13:29:48.328335+00	2026-07-30 13:29:48.328335+00	\N	7	2026-01-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
852	2026-07-30 13:29:48.338571+00	2026-07-30 13:29:48.338571+00	\N	7	2026-02-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
853	2026-07-30 13:29:48.36215+00	2026-07-30 13:29:48.36215+00	\N	7	2026-02-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
854	2026-07-30 13:29:48.371264+00	2026-07-30 13:29:48.371264+00	\N	7	2026-02-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
855	2026-07-30 13:29:48.393062+00	2026-07-30 13:29:48.393062+00	\N	7	2026-02-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
856	2026-07-30 13:29:48.400754+00	2026-07-30 13:29:48.400754+00	\N	7	2026-02-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
857	2026-07-30 13:29:48.422959+00	2026-07-30 13:29:48.422959+00	\N	7	2026-02-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
858	2026-07-30 13:29:48.430907+00	2026-07-30 13:29:48.430907+00	\N	7	2026-02-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
859	2026-07-30 13:29:48.45291+00	2026-07-30 13:29:48.45291+00	\N	7	2026-02-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
860	2026-07-30 13:29:48.460687+00	2026-07-30 13:29:48.460687+00	\N	7	2026-03-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
861	2026-07-30 13:29:48.483955+00	2026-07-30 13:29:48.483955+00	\N	7	2026-03-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
862	2026-07-30 13:29:48.492455+00	2026-07-30 13:29:48.492455+00	\N	7	2026-03-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
863	2026-07-30 13:29:48.515562+00	2026-07-30 13:29:48.515562+00	\N	7	2026-03-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
864	2026-07-30 13:29:48.523641+00	2026-07-30 13:29:48.523641+00	\N	7	2026-03-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
865	2026-07-30 13:29:48.546712+00	2026-07-30 13:29:48.546712+00	\N	7	2026-03-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
866	2026-07-30 13:29:48.555011+00	2026-07-30 13:29:48.555011+00	\N	7	2026-03-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
867	2026-07-30 13:29:48.57766+00	2026-07-30 13:29:48.57766+00	\N	7	2026-03-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
868	2026-07-30 13:29:48.586188+00	2026-07-30 13:29:48.586188+00	\N	7	2026-03-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
869	2026-07-30 13:29:48.608794+00	2026-07-30 13:29:48.608794+00	\N	7	2026-04-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
870	2026-07-30 13:29:48.617405+00	2026-07-30 13:29:48.617405+00	\N	7	2026-04-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
871	2026-07-30 13:29:48.638118+00	2026-07-30 13:29:48.638118+00	\N	7	2026-04-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
872	2026-07-30 13:29:48.646513+00	2026-07-30 13:29:48.646513+00	\N	7	2026-04-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
873	2026-07-30 13:29:48.668899+00	2026-07-30 13:29:48.668899+00	\N	7	2026-04-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
874	2026-07-30 13:29:48.677735+00	2026-07-30 13:29:48.677735+00	\N	7	2026-04-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
875	2026-07-30 13:29:48.700066+00	2026-07-30 13:29:48.700066+00	\N	7	2026-04-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
876	2026-07-30 13:29:48.708386+00	2026-07-30 13:29:48.708386+00	\N	7	2026-04-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
877	2026-07-30 13:29:48.728333+00	2026-07-30 13:29:48.728333+00	\N	7	2026-05-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
878	2026-07-30 13:29:48.735991+00	2026-07-30 13:29:48.735991+00	\N	7	2026-05-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
879	2026-07-30 13:29:48.755794+00	2026-07-30 13:29:48.755794+00	\N	7	2026-05-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
880	2026-07-30 13:29:48.762113+00	2026-07-30 13:29:48.762113+00	\N	7	2026-05-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
881	2026-07-30 13:29:48.785967+00	2026-07-30 13:29:48.785967+00	\N	7	2026-05-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
882	2026-07-30 13:29:48.795088+00	2026-07-30 13:29:48.795088+00	\N	7	2026-05-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
883	2026-07-30 13:29:48.817088+00	2026-07-30 13:29:48.817088+00	\N	7	2026-05-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
884	2026-07-30 13:29:48.825994+00	2026-07-30 13:29:48.825994+00	\N	7	2026-05-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
885	2026-07-30 13:29:48.848491+00	2026-07-30 13:29:48.848491+00	\N	7	2026-05-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
886	2026-07-30 13:29:48.857017+00	2026-07-30 13:29:48.857017+00	\N	7	2026-05-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
887	2026-07-30 13:29:48.881985+00	2026-07-30 13:29:48.881985+00	\N	7	2026-06-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
888	2026-07-30 13:29:48.889699+00	2026-07-30 13:29:48.889699+00	\N	7	2026-06-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
889	2026-07-30 13:29:48.911663+00	2026-07-30 13:29:48.911663+00	\N	7	2026-06-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
890	2026-07-30 13:29:48.920269+00	2026-07-30 13:29:48.920269+00	\N	7	2026-06-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
891	2026-07-30 13:29:48.943603+00	2026-07-30 13:29:48.943603+00	\N	7	2026-06-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
892	2026-07-30 13:29:48.952394+00	2026-07-30 13:29:48.952394+00	\N	7	2026-06-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
893	2026-07-30 13:29:48.975053+00	2026-07-30 13:29:48.975053+00	\N	7	2026-06-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
894	2026-07-30 13:29:48.983031+00	2026-07-30 13:29:48.983031+00	\N	7	2026-06-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
895	2026-07-30 13:29:49.007246+00	2026-07-30 13:29:49.007246+00	\N	7	2026-07-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
896	2026-07-30 13:29:49.016259+00	2026-07-30 13:29:49.016259+00	\N	7	2026-07-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
897	2026-07-30 13:29:49.0379+00	2026-07-30 13:29:49.0379+00	\N	7	2026-07-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
898	2026-07-30 13:29:49.046477+00	2026-07-30 13:29:49.046477+00	\N	7	2026-07-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
899	2026-07-30 13:29:49.069194+00	2026-07-30 13:29:49.069194+00	\N	7	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
900	2026-07-30 13:29:49.076806+00	2026-07-30 13:29:49.076806+00	\N	7	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
901	2026-07-30 13:29:49.097247+00	2026-07-30 13:29:49.097247+00	\N	7	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
902	2026-07-30 13:29:49.106901+00	2026-07-30 13:29:49.106901+00	\N	7	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
903	2026-07-30 13:29:49.13205+00	2026-07-30 13:29:49.13205+00	\N	9	2026-01-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
904	2026-07-30 13:29:49.140491+00	2026-07-30 13:29:49.140491+00	\N	9	2026-01-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
905	2026-07-30 13:29:49.164349+00	2026-07-30 13:29:49.164349+00	\N	9	2026-01-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
906	2026-07-30 13:29:49.174095+00	2026-07-30 13:29:49.174095+00	\N	9	2026-01-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
907	2026-07-30 13:29:49.197374+00	2026-07-30 13:29:49.197374+00	\N	9	2026-01-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
908	2026-07-30 13:29:49.204816+00	2026-07-30 13:29:49.204816+00	\N	9	2026-01-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
909	2026-07-30 13:29:49.228198+00	2026-07-30 13:29:49.228198+00	\N	9	2026-01-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
910	2026-07-30 13:29:49.236827+00	2026-07-30 13:29:49.236827+00	\N	9	2026-01-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
911	2026-07-30 13:29:49.259015+00	2026-07-30 13:29:49.259015+00	\N	9	2026-01-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
912	2026-07-30 13:29:49.266889+00	2026-07-30 13:29:49.266889+00	\N	9	2026-02-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
913	2026-07-30 13:29:49.288807+00	2026-07-30 13:29:49.288807+00	\N	9	2026-02-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
914	2026-07-30 13:29:49.297167+00	2026-07-30 13:29:49.297167+00	\N	9	2026-02-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
915	2026-07-30 13:29:49.317385+00	2026-07-30 13:29:49.317385+00	\N	9	2026-02-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
916	2026-07-30 13:29:49.327506+00	2026-07-30 13:29:49.327506+00	\N	9	2026-02-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
917	2026-07-30 13:29:49.350416+00	2026-07-30 13:29:49.350416+00	\N	9	2026-02-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
918	2026-07-30 13:29:49.359162+00	2026-07-30 13:29:49.359162+00	\N	9	2026-02-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
919	2026-07-30 13:29:49.379034+00	2026-07-30 13:29:49.379034+00	\N	9	2026-02-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
920	2026-07-30 13:29:49.386987+00	2026-07-30 13:29:49.386987+00	\N	9	2026-03-01	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
921	2026-07-30 13:29:49.407719+00	2026-07-30 13:29:49.407719+00	\N	9	2026-03-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
922	2026-07-30 13:29:49.414117+00	2026-07-30 13:29:49.414117+00	\N	9	2026-03-08	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
923	2026-07-30 13:29:49.432604+00	2026-07-30 13:29:49.432604+00	\N	9	2026-03-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
924	2026-07-30 13:29:49.43991+00	2026-07-30 13:29:49.43991+00	\N	9	2026-03-15	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
925	2026-07-30 13:29:49.46032+00	2026-07-30 13:29:49.46032+00	\N	9	2026-03-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
926	2026-07-30 13:29:49.468419+00	2026-07-30 13:29:49.468419+00	\N	9	2026-03-22	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
927	2026-07-30 13:29:49.488594+00	2026-07-30 13:29:49.488594+00	\N	9	2026-03-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
928	2026-07-30 13:29:49.496969+00	2026-07-30 13:29:49.496969+00	\N	9	2026-03-29	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
929	2026-07-30 13:29:49.518052+00	2026-07-30 13:29:49.518052+00	\N	9	2026-04-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
930	2026-07-30 13:29:49.526154+00	2026-07-30 13:29:49.526154+00	\N	9	2026-04-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
931	2026-07-30 13:29:49.547401+00	2026-07-30 13:29:49.547401+00	\N	9	2026-04-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
932	2026-07-30 13:29:49.555585+00	2026-07-30 13:29:49.555585+00	\N	9	2026-04-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
933	2026-07-30 13:29:49.57734+00	2026-07-30 13:29:49.57734+00	\N	9	2026-04-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
934	2026-07-30 13:29:49.585687+00	2026-07-30 13:29:49.585687+00	\N	9	2026-04-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
935	2026-07-30 13:29:49.60846+00	2026-07-30 13:29:49.60846+00	\N	9	2026-04-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
936	2026-07-30 13:29:49.61713+00	2026-07-30 13:29:49.61713+00	\N	9	2026-04-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
937	2026-07-30 13:29:49.636748+00	2026-07-30 13:29:49.636748+00	\N	9	2026-05-02	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
938	2026-07-30 13:29:49.644955+00	2026-07-30 13:29:49.644955+00	\N	9	2026-05-03	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
939	2026-07-30 13:29:49.664274+00	2026-07-30 13:29:49.664274+00	\N	9	2026-05-09	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
940	2026-07-30 13:29:49.672618+00	2026-07-30 13:29:49.672618+00	\N	9	2026-05-10	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
941	2026-07-30 13:29:49.692579+00	2026-07-30 13:29:49.692579+00	\N	9	2026-05-16	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
942	2026-07-30 13:29:49.700422+00	2026-07-30 13:29:49.700422+00	\N	9	2026-05-17	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
943	2026-07-30 13:29:49.719499+00	2026-07-30 13:29:49.719499+00	\N	9	2026-05-23	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
944	2026-07-30 13:29:49.726657+00	2026-07-30 13:29:49.726657+00	\N	9	2026-05-24	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
945	2026-07-30 13:29:49.745323+00	2026-07-30 13:29:49.745323+00	\N	9	2026-05-30	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
946	2026-07-30 13:29:49.752734+00	2026-07-30 13:29:49.752734+00	\N	9	2026-05-31	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
947	2026-07-30 13:29:49.770466+00	2026-07-30 13:29:49.770466+00	\N	9	2026-06-06	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
948	2026-07-30 13:29:49.778474+00	2026-07-30 13:29:49.778474+00	\N	9	2026-06-07	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
949	2026-07-30 13:29:49.797427+00	2026-07-30 13:29:49.797427+00	\N	9	2026-06-13	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
950	2026-07-30 13:29:49.805126+00	2026-07-30 13:29:49.805126+00	\N	9	2026-06-14	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
951	2026-07-30 13:29:49.827516+00	2026-07-30 13:29:49.827516+00	\N	9	2026-06-20	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
952	2026-07-30 13:29:49.835381+00	2026-07-30 13:29:49.835381+00	\N	9	2026-06-21	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
953	2026-07-30 13:29:49.858076+00	2026-07-30 13:29:49.858076+00	\N	9	2026-06-27	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
954	2026-07-30 13:29:49.865258+00	2026-07-30 13:29:49.865258+00	\N	9	2026-06-28	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
955	2026-07-30 13:29:49.888665+00	2026-07-30 13:29:49.888665+00	\N	9	2026-07-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
956	2026-07-30 13:29:49.896896+00	2026-07-30 13:29:49.896896+00	\N	9	2026-07-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
957	2026-07-30 13:29:49.920303+00	2026-07-30 13:29:49.920303+00	\N	9	2026-07-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
958	2026-07-30 13:29:49.927438+00	2026-07-30 13:29:49.927438+00	\N	9	2026-07-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
959	2026-07-30 13:29:49.947383+00	2026-07-30 13:29:49.947383+00	\N	9	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
960	2026-07-30 13:29:49.954721+00	2026-07-30 13:29:49.954721+00	\N	9	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
961	2026-07-30 13:29:49.974049+00	2026-07-30 13:29:49.974049+00	\N	9	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
962	2026-07-30 13:29:49.980712+00	2026-07-30 13:29:49.980712+00	\N	9	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
963	2026-07-30 13:29:50.021711+00	2026-07-30 13:29:50.021711+00	\N	8	2026-07-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
964	2026-07-30 13:29:50.029336+00	2026-07-30 13:29:50.029336+00	\N	8	2026-07-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
965	2026-07-30 13:29:50.04945+00	2026-07-30 13:29:50.04945+00	\N	8	2026-07-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
966	2026-07-30 13:29:50.05872+00	2026-07-30 13:29:50.05872+00	\N	8	2026-07-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
967	2026-07-30 13:29:50.081631+00	2026-07-30 13:29:50.081631+00	\N	8	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
968	2026-07-30 13:29:50.090322+00	2026-07-30 13:29:50.090322+00	\N	8	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
969	2026-07-30 13:29:50.112201+00	2026-07-30 13:29:50.112201+00	\N	8	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
970	2026-07-30 13:29:50.122076+00	2026-07-30 13:29:50.122076+00	\N	8	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
971	2026-07-30 13:29:50.178337+00	2026-07-30 13:29:50.178337+00	\N	2	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
972	2026-07-30 13:29:50.186738+00	2026-07-30 13:29:50.186738+00	\N	2	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
973	2026-07-30 13:29:50.207829+00	2026-07-30 13:29:50.207829+00	\N	2	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
974	2026-07-30 13:29:50.215373+00	2026-07-30 13:29:50.215373+00	\N	2	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
975	2026-07-30 13:29:50.242779+00	2026-07-30 13:29:50.242779+00	\N	10	2026-07-04	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
976	2026-07-30 13:29:50.251716+00	2026-07-30 13:29:50.251716+00	\N	10	2026-07-05	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
977	2026-07-30 13:29:50.273801+00	2026-07-30 13:29:50.273801+00	\N	10	2026-07-11	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
978	2026-07-30 13:29:50.282267+00	2026-07-30 13:29:50.282267+00	\N	10	2026-07-12	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
979	2026-07-30 13:29:50.30425+00	2026-07-30 13:29:50.30425+00	\N	10	2026-07-18	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
980	2026-07-30 13:29:50.312827+00	2026-07-30 13:29:50.312827+00	\N	10	2026-07-19	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
981	2026-07-30 13:29:50.335247+00	2026-07-30 13:29:50.335247+00	\N	10	2026-07-25	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
982	2026-07-30 13:29:50.344303+00	2026-07-30 13:29:50.344303+00	\N	10	2026-07-26	\N	\N	Alpha	0	0	0	f		0	0	0	f		WFO	\N	0	0	0	f	kantor	f	f	0	f
983	2026-07-30 14:56:05.028748+00	2026-07-30 14:56:05.028748+00	\N	6	2026-07-30	2026-07-30 14:56:04.395286+00	\N	Hadir	-6.122993929732604	106.80677495852323	95	t	http://localhost:9000/golan-attendance/3173072812041007-checkin-1785423365.jpg	0	0	0	f		Dinas Luar	\N	-6.122993929732604	106.80677495852323	95	t	custom	f	t	78	f
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, created_at, updated_at, deleted_at, user_id, action, table_name, record_id, changes_detail) FROM stdin;
1	2026-07-21 15:39:46.891239+00	2026-07-21 15:39:46.891239+00	\N	1	LOGIN	User	1	User berhasil login
2	2026-07-21 15:40:12.230768+00	2026-07-21 15:40:12.230768+00	\N	1	LOGOUT	User	1	User berhasil logout
3	2026-07-21 15:40:15.0635+00	2026-07-21 15:40:15.0635+00	\N	2	LOGIN	User	2	User berhasil login
4	2026-07-21 15:54:49.908327+00	2026-07-21 15:54:49.908327+00	\N	2	LOGOUT	User	2	User berhasil logout
5	2026-07-21 15:54:52.828764+00	2026-07-21 15:54:52.828764+00	\N	1	LOGIN	User	1	User berhasil login
6	2026-07-21 16:06:58.238282+00	2026-07-21 16:06:58.238282+00	\N	1	LOGIN	User	1	User berhasil login
7	2026-07-21 16:07:08.072914+00	2026-07-21 16:07:08.072914+00	\N	1	LOGIN	User	1	User berhasil login
8	2026-07-21 16:24:51.079392+00	2026-07-21 16:24:51.079392+00	\N	1	LOGIN	User	1	User berhasil login
9	2026-07-21 16:28:16.28658+00	2026-07-21 16:28:16.28658+00	\N	1	LOGOUT	User	1	User berhasil logout
10	2026-07-21 16:28:21.306451+00	2026-07-21 16:28:21.306451+00	\N	1	LOGIN	User	1	User berhasil login
11	2026-07-21 16:32:49.738885+00	2026-07-21 16:32:49.738885+00	\N	1	LOGOUT	User	1	User berhasil logout
12	2026-07-21 16:43:07.572622+00	2026-07-21 16:43:07.572622+00	\N	1	LOGIN	User	1	User berhasil login
13	2026-07-21 16:49:25.840271+00	2026-07-21 16:49:25.840271+00	\N	1	LOGOUT	User	1	User berhasil logout
14	2026-07-21 16:49:42.133227+00	2026-07-21 16:49:42.133227+00	\N	2	LOGIN	User	2	User berhasil login
15	2026-07-21 16:51:48.70189+00	2026-07-21 16:51:48.70189+00	\N	2	LOGIN	User	2	User berhasil login
16	2026-07-22 03:53:46.022469+00	2026-07-22 03:53:46.022469+00	\N	1	LOGIN	User	1	User berhasil login
17	2026-07-22 03:54:07.678326+00	2026-07-22 03:54:07.678326+00	\N	1	LOGOUT	User	1	User berhasil logout
18	2026-07-22 03:54:16.08964+00	2026-07-22 03:54:16.08964+00	\N	2	LOGIN	User	2	User berhasil login
19	2026-07-22 03:54:54.737449+00	2026-07-22 03:54:54.737449+00	\N	2	LOGOUT	User	2	User berhasil logout
20	2026-07-22 03:54:57.822919+00	2026-07-22 03:54:57.822919+00	\N	2	LOGIN	User	2	User berhasil login
21	2026-07-22 03:55:52.079735+00	2026-07-22 03:55:52.079735+00	\N	2	CREATE	AttendanceRecord	2	Check-in Hadir untuk EMP-001 (Dinas Luar)
22	2026-07-22 03:56:54.763847+00	2026-07-22 03:56:54.763847+00	\N	2	LOGOUT	User	2	User berhasil logout
23	2026-07-22 03:58:18.801979+00	2026-07-22 03:58:18.801979+00	\N	2	LOGIN	User	2	User berhasil login
24	2026-07-22 03:58:33.168711+00	2026-07-22 03:58:33.168711+00	\N	2	LOGOUT	User	2	User berhasil logout
25	2026-07-22 03:58:38.263657+00	2026-07-22 03:58:38.263657+00	\N	1	LOGIN	User	1	User berhasil login
26	2026-07-22 03:59:20.321068+00	2026-07-22 03:59:20.321068+00	\N	1	LOGOUT	User	1	User berhasil logout
27	2026-07-23 04:18:35.22979+00	2026-07-23 04:18:35.22979+00	\N	2	LOGIN	User	2	User berhasil login
28	2026-07-23 04:18:43.142718+00	2026-07-23 04:18:43.142718+00	\N	1	LOGIN	User	1	User berhasil login
29	2026-07-23 04:27:03.633062+00	2026-07-23 04:27:03.633062+00	\N	2	LOGIN	User	2	User berhasil login
30	2026-07-23 05:03:17.696226+00	2026-07-23 05:03:17.696226+00	\N	1	LOGOUT	User	1	User berhasil logout
31	2026-07-23 05:03:24.807483+00	2026-07-23 05:03:24.807483+00	\N	2	LOGIN	User	2	User berhasil login
32	2026-07-23 05:04:27.936656+00	2026-07-23 05:04:27.936656+00	\N	1	LOGIN	User	1	User berhasil login
33	2026-07-23 05:16:32.891243+00	2026-07-23 05:16:32.891243+00	\N	2	LOGIN	User	2	User berhasil login
34	2026-07-23 05:17:37.084611+00	2026-07-23 05:17:37.084611+00	\N	2	LOGOUT	User	2	User berhasil logout
35	2026-07-23 05:17:39.751301+00	2026-07-23 05:17:39.751301+00	\N	1	LOGIN	User	1	User berhasil login
36	2026-07-23 05:34:13.355558+00	2026-07-23 05:34:13.355558+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: karyawan@golan.com
37	2026-07-23 05:35:42.301204+00	2026-07-23 05:35:42.301204+00	\N	1	LOGOUT	User	1	User berhasil logout
38	2026-07-23 05:35:45.254224+00	2026-07-23 05:35:45.254224+00	\N	1	LOGIN	User	1	User berhasil login
39	2026-07-23 05:35:49.240016+00	2026-07-23 05:35:49.240016+00	\N	1	LOGOUT	User	1	User berhasil logout
40	2026-07-23 05:35:51.722004+00	2026-07-23 05:35:51.722004+00	\N	2	LOGIN	User	2	User berhasil login
41	2026-07-23 05:36:21.635219+00	2026-07-23 05:36:21.635219+00	\N	2	CREATE	AttendanceRecord	3	Check-in Hadir untuk EMP-001 (WFH)
42	2026-07-23 05:39:03.192143+00	2026-07-23 05:39:03.192143+00	\N	2	LOGOUT	User	2	User berhasil logout
43	2026-07-23 05:41:42.084254+00	2026-07-23 05:41:42.084254+00	\N	2	LOGIN	User	2	User berhasil login
44	2026-07-23 05:42:54.180631+00	2026-07-23 05:42:54.180631+00	\N	2	LOGOUT	User	2	User berhasil logout
45	2026-07-23 05:42:57.453296+00	2026-07-23 05:42:57.453296+00	\N	1	LOGIN	User	1	User berhasil login
46	2026-07-23 05:51:35.493325+00	2026-07-23 05:51:35.493325+00	\N	1	LOGOUT	User	1	User berhasil logout
47	2026-07-23 05:51:37.851493+00	2026-07-23 05:51:37.851493+00	\N	2	LOGIN	User	2	User berhasil login
48	2026-07-23 06:40:04.360599+00	2026-07-23 06:40:04.360599+00	\N	2	LOGOUT	User	2	User berhasil logout
49	2026-07-23 06:40:16.782607+00	2026-07-23 06:40:16.782607+00	\N	2	LOGIN	User	2	User berhasil login
50	2026-07-23 06:55:23.64086+00	2026-07-23 06:55:23.64086+00	\N	2	LOGOUT	User	2	User berhasil logout
51	2026-07-23 06:55:31.801064+00	2026-07-23 06:55:31.801064+00	\N	2	LOGIN	User	2	User berhasil login
52	2026-07-23 06:59:19.971092+00	2026-07-23 06:59:19.971092+00	\N	2	LOGIN	User	2	User berhasil login
53	2026-07-23 07:00:04.522692+00	2026-07-23 07:00:04.522692+00	\N	2	LOGOUT	User	2	User berhasil logout
54	2026-07-23 07:00:07.660074+00	2026-07-23 07:00:07.660074+00	\N	1	LOGIN	User	1	User berhasil login
55	2026-07-23 07:11:24.831104+00	2026-07-23 07:11:24.831104+00	\N	1	CREATE	Employee	3	Admin created new employee: irvan@gmail.com
56	2026-07-23 07:11:45.879519+00	2026-07-23 07:11:45.879519+00	\N	1	LOGOUT	User	1	User berhasil logout
57	2026-07-23 07:12:08.843955+00	2026-07-23 07:12:08.843955+00	\N	3	LOGIN	User	3	User berhasil login
58	2026-07-23 07:12:51.991651+00	2026-07-23 07:12:51.991651+00	\N	3	CREATE	AttendanceRecord	4	Check-in Terlambat untuk 3215642311567952 (Dinas Luar)
59	2026-07-23 07:21:27.309567+00	2026-07-23 07:21:27.309567+00	\N	3	LOGOUT	User	3	User berhasil logout
60	2026-07-23 07:21:36.13889+00	2026-07-23 07:21:36.13889+00	\N	3	LOGIN	User	3	User berhasil login
61	2026-07-23 07:27:08.919042+00	2026-07-23 07:27:08.919042+00	\N	2	CREATE	LeaveRequest	1	Pengajuan Sakit oleh EMP-001
62	2026-07-23 07:27:39.542059+00	2026-07-23 07:27:39.542059+00	\N	2	LOGOUT	User	2	User berhasil logout
63	2026-07-23 07:27:44.73993+00	2026-07-23 07:27:44.73993+00	\N	1	LOGIN	User	1	User berhasil login
64	2026-07-23 07:28:18.498632+00	2026-07-23 07:28:18.498632+00	\N	3	LOGOUT	User	3	User berhasil logout
65	2026-07-23 07:28:28.171296+00	2026-07-23 07:28:28.171296+00	\N	1	LOGIN	User	1	User berhasil login
66	2026-07-23 07:28:33.935847+00	2026-07-23 07:28:33.935847+00	\N	1	UPDATE	LeaveRequest	1	Admin Approved leave request for EMP-001
67	2026-07-23 07:28:48.445775+00	2026-07-23 07:28:48.445775+00	\N	1	LOGOUT	User	1	User berhasil logout
68	2026-07-23 07:28:53.508486+00	2026-07-23 07:28:53.508486+00	\N	2	LOGIN	User	2	User berhasil login
69	2026-07-23 07:51:59.048847+00	2026-07-23 07:51:59.048847+00	\N	1	LOGOUT	User	1	User berhasil logout
70	2026-07-23 07:52:08.486599+00	2026-07-23 07:52:08.486599+00	\N	3	LOGIN	User	3	User berhasil login
71	2026-07-23 07:55:56.000154+00	2026-07-23 07:55:56.000154+00	\N	3	LOGOUT	User	3	User berhasil logout
72	2026-07-23 08:00:10.067951+00	2026-07-23 08:00:10.067951+00	\N	1	LOGIN	User	1	User berhasil login
73	2026-07-23 08:01:11.020125+00	2026-07-23 08:01:11.020125+00	\N	1	LOGOUT	User	1	User berhasil logout
74	2026-07-23 08:01:39.453135+00	2026-07-23 08:01:39.453135+00	\N	3	LOGIN	User	3	User berhasil login
75	2026-07-23 08:02:05.893162+00	2026-07-23 08:02:05.893162+00	\N	3	LOGOUT	User	3	User berhasil logout
76	2026-07-23 08:03:13.995768+00	2026-07-23 08:03:13.995768+00	\N	3	LOGIN	User	3	User berhasil login
77	2026-07-23 08:07:25.609816+00	2026-07-23 08:07:25.609816+00	\N	3	LOGIN	User	3	User berhasil login
78	2026-07-23 09:06:13.857954+00	2026-07-23 09:06:13.857954+00	\N	2	LOGOUT	User	2	User berhasil logout
79	2026-07-23 09:06:17.650311+00	2026-07-23 09:06:17.650311+00	\N	1	LOGIN	User	1	User berhasil login
80	2026-07-23 09:10:12.846038+00	2026-07-23 09:10:12.846038+00	\N	1	LOGOUT	User	1	User berhasil logout
81	2026-07-23 09:10:17.053246+00	2026-07-23 09:10:17.053246+00	\N	2	LOGIN	User	2	User berhasil login
82	2026-07-23 09:21:57.074612+00	2026-07-23 09:21:57.074612+00	\N	2	LOGOUT	User	2	User berhasil logout
83	2026-07-23 09:22:02.429187+00	2026-07-23 09:22:02.429187+00	\N	1	LOGIN	User	1	User berhasil login
84	2026-07-23 09:35:09.742179+00	2026-07-23 09:35:09.742179+00	\N	1	LOGIN	User	1	User berhasil login
85	2026-07-23 09:35:18.530667+00	2026-07-23 09:35:18.530667+00	\N	1	LOGIN	User	1	User berhasil login
86	2026-07-23 09:35:26.091961+00	2026-07-23 09:35:26.091961+00	\N	1	LOGIN	User	1	User berhasil login
87	2026-07-23 09:35:39.618278+00	2026-07-23 09:35:39.618278+00	\N	1	LOGIN	User	1	User berhasil login
88	2026-07-23 09:35:58.275732+00	2026-07-23 09:35:58.275732+00	\N	1	LOGIN	User	1	User berhasil login
89	2026-07-23 09:35:58.332204+00	2026-07-23 09:35:58.332204+00	\N	1	CREATE	CompanyEvent	1	Created company event: __CRUD_TEST_EVENT__
90	2026-07-23 09:35:58.348684+00	2026-07-23 09:35:58.348684+00	\N	1	DELETE	CompanyEvent	1	Deleted company event: __CRUD_TEST_EVENT__
91	2026-07-23 09:47:05.563325+00	2026-07-23 09:47:05.563325+00	\N	1	CREATE	CompanyEvent	2	Created company event: pembahasan magang
92	2026-07-23 09:47:19.146511+00	2026-07-23 09:47:19.146511+00	\N	1	LOGOUT	User	1	User berhasil logout
93	2026-07-23 09:47:28.27871+00	2026-07-23 09:47:28.27871+00	\N	2	LOGIN	User	2	User berhasil login
94	2026-07-23 09:47:58.920715+00	2026-07-23 09:47:58.920715+00	\N	2	LOGOUT	User	2	User berhasil logout
95	2026-07-23 09:48:04.260326+00	2026-07-23 09:48:04.260326+00	\N	1	LOGIN	User	1	User berhasil login
96	2026-07-23 09:54:05.61146+00	2026-07-23 09:54:05.61146+00	\N	1	CREATE	Employee	4	Admin created new employee: devanlesmana9@gmail.com
97	2026-07-23 09:54:14.811416+00	2026-07-23 09:54:14.811416+00	\N	1	LOGOUT	User	1	User berhasil logout
98	2026-07-23 09:54:17.109729+00	2026-07-23 09:54:17.109729+00	\N	4	LOGIN	User	4	User berhasil login
99	2026-07-23 09:54:38.475452+00	2026-07-23 09:54:38.475452+00	\N	4	CREATE	AttendanceRecord	6	Check-in Terlambat untuk 3173072812041001 (WFH)
100	2026-07-23 09:55:54.777506+00	2026-07-23 09:55:54.777506+00	\N	4	LOGOUT	User	4	User berhasil logout
101	2026-07-23 09:55:58.686938+00	2026-07-23 09:55:58.686938+00	\N	1	LOGIN	User	1	User berhasil login
102	2026-07-23 10:21:43.821886+00	2026-07-23 10:21:43.821886+00	\N	1	LOGOUT	User	1	User berhasil logout
103	2026-07-23 10:21:48.373327+00	2026-07-23 10:21:48.373327+00	\N	1	LOGIN	User	1	User berhasil login
104	2026-07-23 10:21:54.273691+00	2026-07-23 10:21:54.273691+00	\N	1	LOGOUT	User	1	User berhasil logout
105	2026-07-23 10:21:59.473302+00	2026-07-23 10:21:59.473302+00	\N	4	LOGIN	User	4	User berhasil login
106	2026-07-23 10:28:48.249992+00	2026-07-23 10:28:48.249992+00	\N	4	UPDATE	AttendanceRecord	6	Check-out untuk 3173072812041001
107	2026-07-23 10:29:05.605253+00	2026-07-23 10:29:05.605253+00	\N	4	LOGOUT	User	4	User berhasil logout
108	2026-07-23 10:29:09.849497+00	2026-07-23 10:29:09.849497+00	\N	2	LOGIN	User	2	User berhasil login
109	2026-07-23 10:29:20.014806+00	2026-07-23 10:29:20.014806+00	\N	2	UPDATE	AttendanceRecord	3	Check-out untuk EMP-001
110	2026-07-23 10:29:52.886547+00	2026-07-23 10:29:52.886547+00	\N	2	LOGOUT	User	2	User berhasil logout
111	2026-07-23 10:29:56.944172+00	2026-07-23 10:29:56.944172+00	\N	4	LOGIN	User	4	User berhasil login
112	2026-07-23 10:36:40.893543+00	2026-07-23 10:36:40.893543+00	\N	4	CREATE	LeaveRequest	2	Pengajuan Sakit oleh 3173072812041001
113	2026-07-23 10:36:55.701971+00	2026-07-23 10:36:55.701971+00	\N	4	LOGOUT	User	4	User berhasil logout
114	2026-07-23 10:37:00.472632+00	2026-07-23 10:37:00.472632+00	\N	1	LOGIN	User	1	User berhasil login
115	2026-07-23 11:15:12.19043+00	2026-07-23 11:15:12.19043+00	\N	1	CREATE	Holiday	1	Created holiday: ada libur untuk divis x
116	2026-07-23 11:15:36.794415+00	2026-07-23 11:15:36.794415+00	\N	1	LOGOUT	User	1	User berhasil logout
117	2026-07-23 11:15:41.209705+00	2026-07-23 11:15:41.209705+00	\N	4	LOGIN	User	4	User berhasil login
118	2026-07-23 11:16:00.865204+00	2026-07-23 11:16:00.865204+00	\N	4	LOGOUT	User	4	User berhasil logout
119	2026-07-23 11:16:04.178158+00	2026-07-23 11:16:04.178158+00	\N	1	LOGIN	User	1	User berhasil login
120	2026-07-23 11:26:52.06269+00	2026-07-23 11:26:52.06269+00	\N	1	LOGOUT	User	1	User berhasil logout
121	2026-07-23 11:26:56.157265+00	2026-07-23 11:26:56.157265+00	\N	4	LOGIN	User	4	User berhasil login
122	2026-07-23 11:27:35.7786+00	2026-07-23 11:27:35.7786+00	\N	4	LOGOUT	User	4	User berhasil logout
123	2026-07-23 11:27:43.175721+00	2026-07-23 11:27:43.175721+00	\N	1	LOGIN	User	1	User berhasil login
124	2026-07-23 11:28:07.459878+00	2026-07-23 11:28:07.459878+00	\N	1	DELETE	Holiday	1	Deleted holiday: ada libur untuk divis x
125	2026-07-23 12:51:11.747076+00	2026-07-23 12:51:11.747076+00	\N	1	CREATE	WorkSchedule	2	Admin created work schedule: shift pago
126	2026-07-23 12:51:18.471016+00	2026-07-23 12:51:18.471016+00	\N	1	DELETE	WorkSchedule	2	Admin deleted work schedule: shift pago
127	2026-07-23 12:51:56.694465+00	2026-07-23 12:51:56.694465+00	\N	1	LOGOUT	User	1	User berhasil logout
128	2026-07-23 12:52:00.740355+00	2026-07-23 12:52:00.740355+00	\N	4	LOGIN	User	4	User berhasil login
129	2026-07-23 12:52:47.315663+00	2026-07-23 12:52:47.315663+00	\N	4	LOGOUT	User	4	User berhasil logout
130	2026-07-23 12:53:03.517141+00	2026-07-23 12:53:03.517141+00	\N	4	LOGIN	User	4	User berhasil login
131	2026-07-23 12:53:12.368732+00	2026-07-23 12:53:12.368732+00	\N	4	LOGOUT	User	4	User berhasil logout
132	2026-07-23 12:54:14.466762+00	2026-07-23 12:54:14.466762+00	\N	1	LOGIN	User	1	User berhasil login
133	2026-07-23 13:04:51.292347+00	2026-07-23 13:04:51.292347+00	\N	1	LOGOUT	User	1	User berhasil logout
134	2026-07-23 13:08:08.975214+00	2026-07-23 13:08:08.975214+00	\N	1	LOGIN	User	1	User berhasil login
135	2026-07-23 13:10:46.420913+00	2026-07-23 13:10:46.420913+00	\N	1	CREATE	Holiday	2	Created holiday: ada libur nasional
136	2026-07-23 13:11:11.548472+00	2026-07-23 13:11:11.548472+00	\N	1	DELETE	Holiday	2	Deleted holiday: ada libur nasional
137	2026-07-23 13:11:39.059438+00	2026-07-23 13:11:39.059438+00	\N	1	LOGOUT	User	1	User berhasil logout
138	2026-07-23 13:11:54.852214+00	2026-07-23 13:11:54.852214+00	\N	4	LOGIN	User	4	User berhasil login
139	2026-07-23 13:12:31.301509+00	2026-07-23 13:12:31.301509+00	\N	4	LOGOUT	User	4	User berhasil logout
140	2026-07-23 13:12:37.425897+00	2026-07-23 13:12:37.425897+00	\N	1	LOGIN	User	1	User berhasil login
141	2026-07-23 13:13:55.786382+00	2026-07-23 13:13:55.786382+00	\N	1	LOGOUT	User	1	User berhasil logout
142	2026-07-23 13:14:02.71472+00	2026-07-23 13:14:02.71472+00	\N	4	LOGIN	User	4	User berhasil login
148	2026-07-23 13:26:48.466135+00	2026-07-23 13:26:48.466135+00	\N	4	LOGOUT	User	4	User berhasil logout
149	2026-07-23 13:26:53.536442+00	2026-07-23 13:26:53.536442+00	\N	1	LOGIN	User	1	User berhasil login
150	2026-07-23 13:33:22.857365+00	2026-07-23 13:33:22.857365+00	\N	1	LOGOUT	User	1	User berhasil logout
151	2026-07-23 13:36:18.289785+00	2026-07-23 13:36:18.289785+00	\N	1	LOGIN	User	1	User berhasil login
152	2026-07-23 13:40:58.630917+00	2026-07-23 13:40:58.630917+00	\N	1	LOGOUT	User	1	User berhasil logout
153	2026-07-23 13:41:04.328313+00	2026-07-23 13:41:04.328313+00	\N	4	LOGIN	User	4	User berhasil login
162	2026-07-23 13:57:52.297008+00	2026-07-23 13:57:52.297008+00	\N	4	LOGOUT	User	4	User berhasil logout
163	2026-07-23 13:58:00.542689+00	2026-07-23 13:58:00.542689+00	\N	4	LOGIN	User	4	User berhasil login
143	2026-07-23 13:14:15.061745+00	2026-07-23 13:14:15.061745+00	\N	4	LOGOUT	User	4	User berhasil logout
144	2026-07-23 13:14:22.955162+00	2026-07-23 13:14:22.955162+00	\N	1	LOGIN	User	1	User berhasil login
145	2026-07-23 13:15:55.304044+00	2026-07-23 13:15:55.304044+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
146	2026-07-23 13:16:36.501295+00	2026-07-23 13:16:36.501295+00	\N	1	LOGOUT	User	1	User berhasil logout
147	2026-07-23 13:16:46.307994+00	2026-07-23 13:16:46.307994+00	\N	4	LOGIN	User	4	User berhasil login
154	2026-07-23 13:43:06.290233+00	2026-07-23 13:43:06.290233+00	\N	4	LOGOUT	User	4	User berhasil logout
155	2026-07-23 13:43:14.970438+00	2026-07-23 13:43:14.970438+00	\N	4	LOGIN	User	4	User berhasil login
156	2026-07-23 13:56:59.154894+00	2026-07-23 13:56:59.154894+00	\N	4	LOGOUT	User	4	User berhasil logout
157	2026-07-23 13:57:07.608366+00	2026-07-23 13:57:07.608366+00	\N	1	LOGIN	User	1	User berhasil login
158	2026-07-23 13:57:17.464177+00	2026-07-23 13:57:17.464177+00	\N	1	LOGOUT	User	1	User berhasil logout
159	2026-07-23 13:57:20.474088+00	2026-07-23 13:57:20.474088+00	\N	1	LOGIN	User	1	User berhasil login
160	2026-07-23 13:57:25.271387+00	2026-07-23 13:57:25.271387+00	\N	1	LOGOUT	User	1	User berhasil logout
161	2026-07-23 13:57:34.664518+00	2026-07-23 13:57:34.664518+00	\N	4	LOGIN	User	4	User berhasil login
164	2026-07-23 14:03:05.978944+00	2026-07-23 14:03:05.978944+00	\N	1	LOGIN	User	1	User berhasil login
165	2026-07-23 14:03:16.654395+00	2026-07-23 14:03:16.654395+00	\N	1	LOGIN	User	1	User berhasil login
166	2026-07-23 14:07:05.871325+00	2026-07-23 14:07:05.871325+00	\N	1	LOGIN	User	1	User berhasil login
167	2026-07-23 14:08:18.574923+00	2026-07-23 14:08:18.574923+00	\N	4	UPDATE	User	4	Employee changed login email from devanlesmana9@gmail.com to devanlesmana123@gmail.com
168	2026-07-23 14:08:24.481516+00	2026-07-23 14:08:24.481516+00	\N	4	LOGOUT	User	4	User berhasil logout
169	2026-07-23 14:08:35.763458+00	2026-07-23 14:08:35.763458+00	\N	4	LOGIN	User	4	User berhasil login
170	2026-07-23 14:08:37.791193+00	2026-07-23 14:08:37.791193+00	\N	4	LOGOUT	User	4	User berhasil logout
171	2026-07-23 14:08:46.506599+00	2026-07-23 14:08:46.506599+00	\N	1	LOGIN	User	1	User berhasil login
172	2026-07-23 14:09:38.031457+00	2026-07-23 14:09:38.031457+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri123@gmail.com
173	2026-07-23 14:09:47.330667+00	2026-07-23 14:09:47.330667+00	\N	1	LOGOUT	User	1	User berhasil logout
174	2026-07-23 14:09:54.809265+00	2026-07-23 14:09:54.809265+00	\N	2	LOGIN	User	2	User berhasil login
175	2026-07-23 14:09:58.404259+00	2026-07-23 14:09:58.404259+00	\N	2	LOGOUT	User	2	User berhasil logout
176	2026-07-23 14:10:03.009922+00	2026-07-23 14:10:03.009922+00	\N	2	LOGIN	User	2	User berhasil login
177	2026-07-23 14:11:05.098507+00	2026-07-23 14:11:05.098507+00	\N	2	UPDATE	User	2	Employee changed login email from fakhri123@gmail.com to fakhri@gmail.com
178	2026-07-23 14:11:13.538652+00	2026-07-23 14:11:13.538652+00	\N	2	LOGOUT	User	2	User berhasil logout
179	2026-07-23 14:11:16.540417+00	2026-07-23 14:11:16.540417+00	\N	2	LOGIN	User	2	User berhasil login
180	2026-07-23 14:11:19.705496+00	2026-07-23 14:11:19.705496+00	\N	2	LOGOUT	User	2	User berhasil logout
181	2026-07-23 14:11:34.75927+00	2026-07-23 14:11:34.75927+00	\N	1	LOGIN	User	1	User berhasil login
182	2026-07-24 03:29:20.537429+00	2026-07-24 03:29:20.537429+00	\N	1	LOGOUT	User	1	User berhasil logout
183	2026-07-24 03:29:32.44956+00	2026-07-24 03:29:32.44956+00	\N	1	LOGIN	User	1	User berhasil login
184	2026-07-24 03:30:21.483673+00	2026-07-24 03:30:21.483673+00	\N	1	LOGOUT	User	1	User berhasil logout
185	2026-07-24 03:30:29.380774+00	2026-07-24 03:30:29.380774+00	\N	1	LOGIN	User	1	User berhasil login
186	2026-07-24 03:30:44.373889+00	2026-07-24 03:30:44.373889+00	\N	1	LOGOUT	User	1	User berhasil logout
187	2026-07-24 03:30:51.721415+00	2026-07-24 03:30:51.721415+00	\N	1	LOGIN	User	1	User berhasil login
188	2026-07-24 03:31:00.317443+00	2026-07-24 03:31:00.317443+00	\N	1	LOGOUT	User	1	User berhasil logout
189	2026-07-24 03:31:13.024229+00	2026-07-24 03:31:13.024229+00	\N	2	LOGIN	User	2	User berhasil login
190	2026-07-24 03:31:30.578006+00	2026-07-24 03:31:30.578006+00	\N	2	LOGOUT	User	2	User berhasil logout
191	2026-07-24 03:31:36.980775+00	2026-07-24 03:31:36.980775+00	\N	4	LOGIN	User	4	User berhasil login
192	2026-07-24 03:31:50.62102+00	2026-07-24 03:31:50.62102+00	\N	4	CREATE	AttendanceRecord	7	Check-in Terlambat untuk 3173072812041001 (WFH)
193	2026-07-24 03:33:17.385814+00	2026-07-24 03:33:17.385814+00	\N	4	LOGOUT	User	4	User berhasil logout
194	2026-07-24 03:33:32.224911+00	2026-07-24 03:33:32.224911+00	\N	1	LOGIN	User	1	User berhasil login
195	2026-07-24 03:34:21.315162+00	2026-07-24 03:34:21.315162+00	\N	1	CREATE	Employee	7	Admin created new employee: cc@golan.com
196	2026-07-24 03:34:33.628543+00	2026-07-24 03:34:33.628543+00	\N	1	DELETE	Employee	7	Admin deleted employee data
197	2026-07-24 03:35:13.08451+00	2026-07-24 03:35:13.08451+00	\N	1	LOGOUT	User	1	User berhasil logout
198	2026-07-24 03:35:34.566617+00	2026-07-24 03:35:34.566617+00	\N	4	LOGIN	User	4	User berhasil login
199	2026-07-24 03:50:10.099017+00	2026-07-24 03:50:10.099017+00	\N	1	LOGIN	User	1	User berhasil login
200	2026-07-24 03:50:18.162234+00	2026-07-24 03:50:18.162234+00	\N	1	LOGIN	User	1	User berhasil login
201	2026-07-24 03:51:21.345278+00	2026-07-24 03:51:21.345278+00	\N	1	LOGIN	User	1	User berhasil login
202	2026-07-24 03:51:30.310167+00	2026-07-24 03:51:30.310167+00	\N	1	LOGIN	User	1	User berhasil login
203	2026-07-24 03:52:26.085052+00	2026-07-24 03:52:26.085052+00	\N	1	LOGIN	User	1	User berhasil login
204	2026-07-24 03:52:39.342613+00	2026-07-24 03:52:39.342613+00	\N	1	LOGIN	User	1	User berhasil login
205	2026-07-24 03:53:35.176377+00	2026-07-24 03:53:35.176377+00	\N	1	LOGIN	User	1	User berhasil login
206	2026-07-24 03:54:46.815677+00	2026-07-24 03:54:46.815677+00	\N	4	UPDATE	Employee	3	Employee updated profile photo
207	2026-07-24 03:54:53.068425+00	2026-07-24 03:54:53.068425+00	\N	4	LOGOUT	User	4	User berhasil logout
208	2026-07-24 03:54:59.210057+00	2026-07-24 03:54:59.210057+00	\N	1	LOGIN	User	1	User berhasil login
209	2026-07-24 03:55:25.484254+00	2026-07-24 03:55:25.484254+00	\N	1	LOGOUT	User	1	User berhasil logout
210	2026-07-24 04:18:29.492117+00	2026-07-24 04:18:29.492117+00	\N	1	LOGIN	User	1	User berhasil login
211	2026-07-24 04:18:56.138864+00	2026-07-24 04:18:56.138864+00	\N	1	LOGOUT	User	1	User berhasil logout
212	2026-07-24 04:19:05.948133+00	2026-07-24 04:19:05.948133+00	\N	4	LOGIN	User	4	User berhasil login
213	2026-07-24 04:20:17.270639+00	2026-07-24 04:20:17.270639+00	\N	4	LOGOUT	User	4	User berhasil logout
214	2026-07-24 04:20:23.380145+00	2026-07-24 04:20:23.380145+00	\N	1	LOGIN	User	1	User berhasil login
215	2026-07-24 04:21:53.174811+00	2026-07-24 04:21:53.174811+00	\N	1	LOGOUT	User	1	User berhasil logout
216	2026-07-24 04:22:08.723589+00	2026-07-24 04:22:08.723589+00	\N	1	LOGIN	User	1	User berhasil login
217	2026-07-24 04:22:15.551053+00	2026-07-24 04:22:15.551053+00	\N	1	LOGOUT	User	1	User berhasil logout
218	2026-07-24 04:22:20.642909+00	2026-07-24 04:22:20.642909+00	\N	2	LOGIN	User	2	User berhasil login
219	2026-07-24 04:23:13.585033+00	2026-07-24 04:23:13.585033+00	\N	2	LOGOUT	User	2	User berhasil logout
220	2026-07-24 04:23:20.407721+00	2026-07-24 04:23:20.407721+00	\N	1	LOGIN	User	1	User berhasil login
221	2026-07-24 04:27:38.712147+00	2026-07-24 04:27:38.712147+00	\N	1	LOGIN	User	1	User berhasil login
222	2026-07-24 04:27:55.591812+00	2026-07-24 04:27:55.591812+00	\N	1	LOGIN	User	1	User berhasil login
223	2026-07-24 04:28:04.672498+00	2026-07-24 04:28:04.672498+00	\N	1	LOGIN	User	1	User berhasil login
224	2026-07-24 04:28:13.3314+00	2026-07-24 04:28:13.3314+00	\N	1	LOGIN	User	1	User berhasil login
225	2026-07-24 04:30:04.215272+00	2026-07-24 04:30:04.215272+00	\N	1	LOGOUT	User	1	User berhasil logout
226	2026-07-24 04:30:09.807352+00	2026-07-24 04:30:09.807352+00	\N	4	LOGIN	User	4	User berhasil login
227	2026-07-24 04:30:52.858175+00	2026-07-24 04:30:52.858175+00	\N	4	LOGOUT	User	4	User berhasil logout
228	2026-07-24 04:31:02.862354+00	2026-07-24 04:31:02.862354+00	\N	2	LOGIN	User	2	User berhasil login
229	2026-07-24 04:39:31.51211+00	2026-07-24 04:39:31.51211+00	\N	2	LOGOUT	User	2	User berhasil logout
230	2026-07-24 04:39:36.001088+00	2026-07-24 04:39:36.001088+00	\N	2	LOGIN	User	2	User berhasil login
231	2026-07-24 04:39:40.348073+00	2026-07-24 04:39:40.348073+00	\N	2	LOGOUT	User	2	User berhasil logout
232	2026-07-24 04:39:48.903674+00	2026-07-24 04:39:48.903674+00	\N	1	LOGIN	User	1	User berhasil login
233	2026-07-24 04:41:24.669899+00	2026-07-24 04:41:24.669899+00	\N	1	LOGOUT	User	1	User berhasil logout
234	2026-07-24 04:41:32.236376+00	2026-07-24 04:41:32.236376+00	\N	4	LOGIN	User	4	User berhasil login
235	2026-07-24 04:46:15.666034+00	2026-07-24 04:46:15.666034+00	\N	4	LOGOUT	User	4	User berhasil logout
236	2026-07-24 04:46:27.486438+00	2026-07-24 04:46:27.486438+00	\N	1	LOGIN	User	1	User berhasil login
237	2026-07-24 04:48:54.708048+00	2026-07-24 04:48:54.708048+00	\N	1	LOGOUT	User	1	User berhasil logout
238	2026-07-24 04:49:05.891558+00	2026-07-24 04:49:05.891558+00	\N	4	LOGIN	User	4	User berhasil login
239	2026-07-24 06:01:20.612552+00	2026-07-24 06:01:20.612552+00	\N	4	LOGOUT	User	4	User berhasil logout
240	2026-07-24 06:01:30.118155+00	2026-07-24 06:01:30.118155+00	\N	1	LOGIN	User	1	User berhasil login
241	2026-07-24 06:06:05.018453+00	2026-07-24 06:06:05.018453+00	\N	1	LOGOUT	User	1	User berhasil logout
242	2026-07-24 06:06:12.44551+00	2026-07-24 06:06:12.44551+00	\N	4	LOGIN	User	4	User berhasil login
243	2026-07-24 06:06:20.495189+00	2026-07-24 06:06:20.495189+00	\N	4	LOGOUT	User	4	User berhasil logout
244	2026-07-24 06:06:26.657923+00	2026-07-24 06:06:26.657923+00	\N	1	LOGIN	User	1	User berhasil login
245	2026-07-24 06:10:41.944019+00	2026-07-24 06:10:41.944019+00	\N	1	LOGOUT	User	1	User berhasil logout
246	2026-07-24 06:10:51.43903+00	2026-07-24 06:10:51.43903+00	\N	4	LOGIN	User	4	User berhasil login
247	2026-07-24 06:11:18.608073+00	2026-07-24 06:11:18.608073+00	\N	4	LOGOUT	User	4	User berhasil logout
248	2026-07-24 06:11:25.858144+00	2026-07-24 06:11:25.858144+00	\N	1	LOGIN	User	1	User berhasil login
249	2026-07-24 06:14:51.23378+00	2026-07-24 06:14:51.23378+00	\N	1	LOGOUT	User	1	User berhasil logout
250	2026-07-24 06:14:59.774321+00	2026-07-24 06:14:59.774321+00	\N	4	LOGIN	User	4	User berhasil login
251	2026-07-24 06:15:19.460048+00	2026-07-24 06:15:19.460048+00	\N	4	LOGOUT	User	4	User berhasil logout
252	2026-07-24 06:49:41.204964+00	2026-07-24 06:49:41.204964+00	\N	1	LOGIN	User	1	User berhasil login
253	2026-07-24 09:22:26.571455+00	2026-07-24 09:22:26.571455+00	\N	1	LOGIN	User	1	User berhasil login
254	2026-07-27 01:34:42.385622+00	2026-07-27 01:34:42.385622+00	\N	4	LOGIN	User	4	User berhasil login
255	2026-07-27 01:47:45.302546+00	2026-07-27 01:47:45.302546+00	\N	4	LOGOUT	User	4	User berhasil logout
256	2026-07-27 01:47:55.752271+00	2026-07-27 01:47:55.752271+00	\N	1	LOGIN	User	1	User berhasil login
257	2026-07-27 01:54:59.504054+00	2026-07-27 01:54:59.504054+00	\N	1	LOGOUT	User	1	User berhasil logout
258	2026-07-27 01:56:08.038827+00	2026-07-27 01:56:08.038827+00	\N	4	LOGIN	User	4	User berhasil login
259	2026-07-27 02:00:41.712688+00	2026-07-27 02:00:41.712688+00	\N	1	LOGIN	User	1	User berhasil login
260	2026-07-27 02:01:53.905529+00	2026-07-27 02:01:53.905529+00	\N	4	LOGOUT	User	4	User berhasil logout
261	2026-07-27 02:03:13.330193+00	2026-07-27 02:03:13.330193+00	\N	2	LOGIN	User	2	User berhasil login
262	2026-07-27 02:08:11.699336+00	2026-07-27 02:08:11.699336+00	\N	2	LOGOUT	User	2	User berhasil logout
263	2026-07-27 02:08:18.590073+00	2026-07-27 02:08:18.590073+00	\N	1	LOGIN	User	1	User berhasil login
264	2026-07-27 02:10:38.65631+00	2026-07-27 02:10:38.65631+00	\N	1	LOGOUT	User	1	User berhasil logout
265	2026-07-27 02:10:47.151845+00	2026-07-27 02:10:47.151845+00	\N	4	LOGIN	User	4	User berhasil login
266	2026-07-27 03:09:45.694268+00	2026-07-27 03:09:45.694268+00	\N	4	LOGOUT	User	4	User berhasil logout
267	2026-07-27 03:09:53.468095+00	2026-07-27 03:09:53.468095+00	\N	1	LOGIN	User	1	User berhasil login
268	2026-07-27 03:13:30.583911+00	2026-07-27 03:13:30.583911+00	\N	1	LOGOUT	User	1	User berhasil logout
269	2026-07-27 03:13:42.434126+00	2026-07-27 03:13:42.434126+00	\N	4	LOGIN	User	4	User berhasil login
270	2026-07-27 03:15:26.760469+00	2026-07-27 03:15:26.760469+00	\N	4	LOGOUT	User	4	User berhasil logout
271	2026-07-27 03:15:35.126637+00	2026-07-27 03:15:35.126637+00	\N	1	LOGIN	User	1	User berhasil login
272	2026-07-27 04:04:22.898538+00	2026-07-27 04:04:22.898538+00	\N	1	LOGOUT	User	1	User berhasil logout
273	2026-07-27 04:04:31.263529+00	2026-07-27 04:04:31.263529+00	\N	4	LOGIN	User	4	User berhasil login
274	2026-07-27 04:31:21.943607+00	2026-07-27 04:31:21.943607+00	\N	4	LOGOUT	User	4	User berhasil logout
275	2026-07-27 04:31:28.133333+00	2026-07-27 04:31:28.133333+00	\N	1	LOGIN	User	1	User berhasil login
276	2026-07-27 04:35:46.37858+00	2026-07-27 04:35:46.37858+00	\N	1	LOGOUT	User	1	User berhasil logout
277	2026-07-27 04:35:54.554905+00	2026-07-27 04:35:54.554905+00	\N	4	LOGIN	User	4	User berhasil login
278	2026-07-27 04:38:21.021843+00	2026-07-27 04:38:21.021843+00	\N	1	LOGIN	User	1	User berhasil login
279	2026-07-27 04:38:24.998511+00	2026-07-27 04:38:24.998511+00	\N	1	LOGOUT	User	1	User berhasil logout
280	2026-07-27 04:44:19.518434+00	2026-07-27 04:44:19.518434+00	\N	4	LOGOUT	User	4	User berhasil logout
281	2026-07-27 04:44:25.315205+00	2026-07-27 04:44:25.315205+00	\N	1	LOGIN	User	1	User berhasil login
282	2026-07-27 04:57:29.620047+00	2026-07-27 04:57:29.620047+00	\N	1	LOGOUT	User	1	User berhasil logout
283	2026-07-27 04:57:35.404222+00	2026-07-27 04:57:35.404222+00	\N	4	LOGIN	User	4	User berhasil login
284	2026-07-27 04:57:49.720765+00	2026-07-27 04:57:49.720765+00	\N	4	CREATE	AttendanceRecord	84	Check-in Terlambat untuk 3173072812041001 (WFH)
285	2026-07-27 05:38:54.331106+00	2026-07-27 05:38:54.331106+00	\N	4	LOGIN	User	4	User berhasil login
286	2026-07-27 05:38:56.42849+00	2026-07-27 05:38:56.42849+00	\N	4	LOGOUT	User	4	User berhasil logout
287	2026-07-27 05:39:01.232401+00	2026-07-27 05:39:01.232401+00	\N	1	LOGIN	User	1	User berhasil login
291	2026-07-27 05:49:16.134257+00	2026-07-27 05:49:16.134257+00	\N	4	LOGOUT	User	4	User berhasil logout
288	2026-07-27 05:46:40.739692+00	2026-07-27 05:46:40.739692+00	\N	1	UPDATE	HelpdeskContact	1	Admin updated helpdesk contact settings
289	2026-07-27 05:46:44.841887+00	2026-07-27 05:46:44.841887+00	\N	1	LOGOUT	User	1	User berhasil logout
290	2026-07-27 05:46:57.407775+00	2026-07-27 05:46:57.407775+00	\N	4	LOGIN	User	4	User berhasil login
293	2026-07-27 06:15:56.616732+00	2026-07-27 06:15:56.616732+00	\N	1	LOGOUT	User	1	User berhasil logout
294	2026-07-27 06:16:01.378486+00	2026-07-27 06:16:01.378486+00	\N	1	LOGIN	User	1	User berhasil login
292	2026-07-27 05:49:21.443228+00	2026-07-27 05:49:21.443228+00	\N	1	LOGIN	User	1	User berhasil login
295	2026-07-27 06:16:06.186737+00	2026-07-27 06:16:06.186737+00	\N	1	LOGOUT	User	1	User berhasil logout
296	2026-07-27 06:16:11.596444+00	2026-07-27 06:16:11.596444+00	\N	4	LOGIN	User	4	User berhasil login
297	2026-07-27 06:20:54.649158+00	2026-07-27 06:20:54.649158+00	\N	4	LOGOUT	User	4	User berhasil logout
298	2026-07-27 06:21:01.652643+00	2026-07-27 06:21:01.652643+00	\N	4	LOGIN	User	4	User berhasil login
299	2026-07-27 06:21:08.832563+00	2026-07-27 06:21:08.832563+00	\N	4	LOGOUT	User	4	User berhasil logout
300	2026-07-27 06:21:19.129857+00	2026-07-27 06:21:19.129857+00	\N	4	LOGIN	User	4	User berhasil login
301	2026-07-27 06:21:21.868274+00	2026-07-27 06:21:21.868274+00	\N	4	LOGOUT	User	4	User berhasil logout
302	2026-07-27 06:21:26.635066+00	2026-07-27 06:21:26.635066+00	\N	1	LOGIN	User	1	User berhasil login
303	2026-07-27 06:29:26.906307+00	2026-07-27 06:29:26.906307+00	\N	1	LOGOUT	User	1	User berhasil logout
304	2026-07-27 06:29:29.64117+00	2026-07-27 06:29:29.64117+00	\N	1	LOGIN	User	1	User berhasil login
305	2026-07-27 06:32:43.410789+00	2026-07-27 06:32:43.410789+00	\N	1	LOGOUT	User	1	User berhasil logout
306	2026-07-27 06:32:50.947439+00	2026-07-27 06:32:50.947439+00	\N	4	LOGIN	User	4	User berhasil login
307	2026-07-27 07:19:49.549295+00	2026-07-27 07:19:49.549295+00	\N	4	LOGOUT	User	4	User berhasil logout
308	2026-07-27 07:19:58.944038+00	2026-07-27 07:19:58.944038+00	\N	1	LOGIN	User	1	User berhasil login
309	2026-07-27 07:20:26.348988+00	2026-07-27 07:20:26.348988+00	\N	1	LOGOUT	User	1	User berhasil logout
310	2026-07-27 07:20:30.299753+00	2026-07-27 07:20:30.299753+00	\N	1	LOGIN	User	1	User berhasil login
311	2026-07-27 07:20:34.483589+00	2026-07-27 07:20:34.483589+00	\N	1	LOGOUT	User	1	User berhasil logout
312	2026-07-27 07:20:41.027458+00	2026-07-27 07:20:41.027458+00	\N	4	LOGIN	User	4	User berhasil login
313	2026-07-27 07:21:12.805531+00	2026-07-27 07:21:12.805531+00	\N	4	LOGOUT	User	4	User berhasil logout
314	2026-07-27 07:21:19.488467+00	2026-07-27 07:21:19.488467+00	\N	1	LOGIN	User	1	User berhasil login
315	2026-07-27 07:22:02.394666+00	2026-07-27 07:22:02.394666+00	\N	1	LOGOUT	User	1	User berhasil logout
316	2026-07-27 07:22:25.928339+00	2026-07-27 07:22:25.928339+00	\N	4	LOGIN	User	4	User berhasil login
317	2026-07-27 07:29:19.269753+00	2026-07-27 07:29:19.269753+00	\N	4	LOGOUT	User	4	User berhasil logout
318	2026-07-27 07:29:26.059316+00	2026-07-27 07:29:26.059316+00	\N	1	LOGIN	User	1	User berhasil login
319	2026-07-27 08:48:53.488321+00	2026-07-27 08:48:53.488321+00	\N	1	LOGOUT	User	1	User berhasil logout
320	2026-07-27 08:49:01.508968+00	2026-07-27 08:49:01.508968+00	\N	4	LOGIN	User	4	User berhasil login
321	2026-07-27 08:49:10.185612+00	2026-07-27 08:49:10.185612+00	\N	4	LOGOUT	User	4	User berhasil logout
322	2026-07-27 08:49:14.603965+00	2026-07-27 08:49:14.603965+00	\N	4	LOGIN	User	4	User berhasil login
323	2026-07-27 08:49:16.977773+00	2026-07-27 08:49:16.977773+00	\N	4	LOGOUT	User	4	User berhasil logout
324	2026-07-27 08:49:23.940235+00	2026-07-27 08:49:23.940235+00	\N	1	LOGIN	User	1	User berhasil login
325	2026-07-27 08:56:55.507266+00	2026-07-27 08:56:55.507266+00	\N	1	LOGOUT	User	1	User berhasil logout
326	2026-07-27 08:57:01.07355+00	2026-07-27 08:57:01.07355+00	\N	4	LOGIN	User	4	User berhasil login
327	2026-07-27 08:58:21.236553+00	2026-07-27 08:58:21.236553+00	\N	4	LOGOUT	User	4	User berhasil logout
328	2026-07-27 08:58:27.381171+00	2026-07-27 08:58:27.381171+00	\N	1	LOGIN	User	1	User berhasil login
329	2026-07-27 09:00:03.810875+00	2026-07-27 09:00:03.810875+00	\N	1	LOGOUT	User	1	User berhasil logout
330	2026-07-27 09:00:10.634138+00	2026-07-27 09:00:10.634138+00	\N	4	LOGIN	User	4	User berhasil login
331	2026-07-27 09:31:50.478064+00	2026-07-27 09:31:50.478064+00	\N	4	LOGOUT	User	4	User berhasil logout
332	2026-07-27 09:33:48.76574+00	2026-07-27 09:33:48.76574+00	\N	1	LOGIN	User	1	User berhasil login
333	2026-07-27 10:09:23.711204+00	2026-07-27 10:09:23.711204+00	\N	1	DELETE	Division	1	Deleted division: Migrated Division
334	2026-07-27 10:13:20.732457+00	2026-07-27 10:13:20.732457+00	\N	1	LOGOUT	User	1	User berhasil logout
335	2026-07-27 10:13:25.454964+00	2026-07-27 10:13:25.454964+00	\N	1	LOGIN	User	1	User berhasil login
336	2026-07-27 10:13:30.004028+00	2026-07-27 10:13:30.004028+00	\N	1	LOGOUT	User	1	User berhasil logout
337	2026-07-27 10:13:35.169099+00	2026-07-27 10:13:35.169099+00	\N	4	LOGIN	User	4	User berhasil login
338	2026-07-27 10:15:00.14935+00	2026-07-27 10:15:00.14935+00	\N	4	UPDATE	AttendanceRecord	84	Check-out untuk 3173072812041001
339	2026-07-27 10:15:44.502276+00	2026-07-27 10:15:44.502276+00	\N	4	LOGOUT	User	4	User berhasil logout
340	2026-07-27 10:15:51.649934+00	2026-07-27 10:15:51.649934+00	\N	1	LOGIN	User	1	User berhasil login
341	2026-07-27 10:20:01.6105+00	2026-07-27 10:20:01.6105+00	\N	1	LOGOUT	User	1	User berhasil logout
342	2026-07-27 10:20:07.844375+00	2026-07-27 10:20:07.844375+00	\N	4	LOGIN	User	4	User berhasil login
343	2026-07-27 10:20:25.792955+00	2026-07-27 10:20:25.792955+00	\N	4	LOGOUT	User	4	User berhasil logout
344	2026-07-27 10:20:33.385079+00	2026-07-27 10:20:33.385079+00	\N	1	LOGIN	User	1	User berhasil login
345	2026-07-27 10:22:03.728335+00	2026-07-27 10:22:03.728335+00	\N	1	UPDATE	Position	1	Updated position: Manager
346	2026-07-27 10:46:39.373234+00	2026-07-27 10:46:39.373234+00	\N	1	CREATE	Position	2	Created position: Magang Kampus
347	2026-07-27 10:55:47.029759+00	2026-07-27 10:55:47.029759+00	\N	1	UPDATE	Employee	4	Admin updated employee profile: devanlesmana123@gmail.com
348	2026-07-27 10:56:26.461381+00	2026-07-27 10:56:26.461381+00	\N	1	LOGOUT	User	1	User berhasil logout
349	2026-07-27 10:56:40.53216+00	2026-07-27 10:56:40.53216+00	\N	4	LOGIN	User	4	User berhasil login
350	2026-07-27 11:01:00.999361+00	2026-07-27 11:01:00.999361+00	\N	4	LOGOUT	User	4	User berhasil logout
351	2026-07-27 11:01:08.510246+00	2026-07-27 11:01:08.510246+00	\N	1	LOGIN	User	1	User berhasil login
352	2026-07-27 11:42:53.796923+00	2026-07-27 11:42:53.796923+00	\N	1	LOGOUT	User	1	User berhasil logout
353	2026-07-27 11:42:58.142118+00	2026-07-27 11:42:58.142118+00	\N	1	LOGIN	User	1	User berhasil login
354	2026-07-27 11:43:16.790256+00	2026-07-27 11:43:16.790256+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
355	2026-07-27 11:43:22.746591+00	2026-07-27 11:43:22.746591+00	\N	1	LOGOUT	User	1	User berhasil logout
356	2026-07-27 11:44:07.400741+00	2026-07-27 11:44:07.400741+00	\N	1	LOGIN	User	1	User berhasil login
357	2026-07-27 11:44:30.851945+00	2026-07-27 11:44:30.851945+00	\N	1	LOGOUT	User	1	User berhasil logout
358	2026-07-27 11:45:09.174667+00	2026-07-27 11:45:09.174667+00	\N	2	LOGIN	User	2	User berhasil login
359	2026-07-27 11:45:47.65868+00	2026-07-27 11:45:47.65868+00	\N	2	LOGOUT	User	2	User berhasil logout
360	2026-07-27 11:45:56.787025+00	2026-07-27 11:45:56.787025+00	\N	1	LOGIN	User	1	User berhasil login
361	2026-07-27 11:46:13.040728+00	2026-07-27 11:46:13.040728+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
363	2026-07-27 12:04:39.824611+00	2026-07-27 12:04:39.824611+00	\N	1	CREATE	Position	3	Created position: Magang Kerja
362	2026-07-27 12:04:06.860936+00	2026-07-27 12:04:06.860936+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
364	2026-07-27 14:27:01.164211+00	2026-07-27 14:27:01.164211+00	\N	1	LOGOUT	User	1	User berhasil logout
365	2026-07-27 14:38:15.585857+00	2026-07-27 14:38:15.585857+00	\N	1	LOGIN	User	1	User berhasil login
366	2026-07-28 02:35:58.381558+00	2026-07-28 02:35:58.381558+00	\N	4	LOGIN	User	4	User berhasil login
367	2026-07-28 02:37:26.537037+00	2026-07-28 02:37:26.537037+00	\N	4	CREATE	AttendanceRecord	87	Check-in Terlambat untuk 3173072812041001 (WFH)
368	2026-07-28 02:47:16.941546+00	2026-07-28 02:47:16.941546+00	\N	4	LOGOUT	User	4	User berhasil logout
369	2026-07-28 02:47:28.015742+00	2026-07-28 02:47:28.015742+00	\N	1	LOGIN	User	1	User berhasil login
370	2026-07-28 03:04:14.64526+00	2026-07-28 03:04:14.64526+00	\N	1	LOGOUT	User	1	User berhasil logout
371	2026-07-28 03:04:50.428885+00	2026-07-28 03:04:50.428885+00	\N	1	LOGIN	User	1	User berhasil login
372	2026-07-28 03:05:15.909492+00	2026-07-28 03:05:15.909492+00	\N	1	LOGOUT	User	1	User berhasil logout
373	2026-07-28 03:05:22.576347+00	2026-07-28 03:05:22.576347+00	\N	4	LOGIN	User	4	User berhasil login
374	2026-07-28 03:33:09.259068+00	2026-07-28 03:33:09.259068+00	\N	4	LOGOUT	User	4	User berhasil logout
375	2026-07-28 03:33:15.20319+00	2026-07-28 03:33:15.20319+00	\N	1	LOGIN	User	1	User berhasil login
376	2026-07-29 00:50:56.249112+00	2026-07-29 00:50:56.249112+00	\N	1	LOGIN	User	1	User berhasil login
377	2026-07-29 00:51:26.811291+00	2026-07-29 00:51:26.811291+00	\N	1	UPDATE	Position	2	Updated position: Karyawan
378	2026-07-29 00:52:09.025753+00	2026-07-29 00:52:09.025753+00	\N	1	UPDATE	Position	3	Updated position: Magang
379	2026-07-29 01:29:20.875801+00	2026-07-29 01:29:20.875801+00	\N	1	LOGOUT	User	1	User berhasil logout
380	2026-07-29 01:29:33.118064+00	2026-07-29 01:29:33.118064+00	\N	4	LOGIN	User	4	User berhasil login
381	2026-07-29 02:12:43.237747+00	2026-07-29 02:12:43.237747+00	\N	4	LOGOUT	User	4	User berhasil logout
382	2026-07-29 02:16:07.714121+00	2026-07-29 02:16:07.714121+00	\N	4	LOGIN	User	4	User berhasil login
383	2026-07-29 02:48:54.847521+00	2026-07-29 02:48:54.847521+00	\N	4	LOGOUT	User	4	User berhasil logout
384	2026-07-29 02:49:23.03586+00	2026-07-29 02:49:23.03586+00	\N	1	LOGIN	User	1	User berhasil login
385	2026-07-29 02:52:52.197546+00	2026-07-29 02:52:52.197546+00	\N	1	CREATE	Employee	9	Admin created new employee: kei@gmail.com
386	2026-07-29 02:53:11.449658+00	2026-07-29 02:53:11.449658+00	\N	1	UPDATE	Employee	9	Admin updated employee profile: kei@gmail.com
387	2026-07-29 02:53:21.683994+00	2026-07-29 02:53:21.683994+00	\N	1	LOGOUT	User	1	User berhasil logout
388	2026-07-29 02:53:26.18789+00	2026-07-29 02:53:26.18789+00	\N	9	LOGIN	User	9	User berhasil login
389	2026-07-29 02:54:06.492102+00	2026-07-29 02:54:06.492102+00	\N	9	LOGOUT	User	9	User berhasil logout
390	2026-07-29 02:54:12.25305+00	2026-07-29 02:54:12.25305+00	\N	1	LOGIN	User	1	User berhasil login
391	2026-07-29 03:23:29.413522+00	2026-07-29 03:23:29.413522+00	\N	1	LOGIN	User	1	User berhasil login
392	2026-07-29 03:23:37.340304+00	2026-07-29 03:23:37.340304+00	\N	1	LOGIN	User	1	User berhasil login
393	2026-07-29 03:24:09.443912+00	2026-07-29 03:24:09.443912+00	\N	1	LOGIN	User	1	User berhasil login
394	2026-07-29 03:24:18.948354+00	2026-07-29 03:24:18.948354+00	\N	1	LOGIN	User	1	User berhasil login
395	2026-07-29 03:24:32.477414+00	2026-07-29 03:24:32.477414+00	\N	1	LOGIN	User	1	User berhasil login
396	2026-07-29 03:24:56.962916+00	2026-07-29 03:24:56.962916+00	\N	1	LOGIN	User	1	User berhasil login
397	2026-07-29 03:24:57.038788+00	2026-07-29 03:24:57.038788+00	\N	1	CREATE	Employee	10	Admin created new employee: qa.manager.20260729102456@golan.test
398	2026-07-29 03:24:57.107018+00	2026-07-29 03:24:57.107018+00	\N	1	CREATE	Employee	11	Admin created new employee: qa.member1.20260729102456@golan.test
399	2026-07-29 03:24:57.168402+00	2026-07-29 03:24:57.168402+00	\N	1	CREATE	Employee	12	Admin created new employee: qa.member2.20260729102456@golan.test
400	2026-07-29 03:24:57.23096+00	2026-07-29 03:24:57.23096+00	\N	1	CREATE	Employee	13	Admin created new employee: qa.intern.20260729102456@golan.test
401	2026-07-29 03:49:46.53226+00	2026-07-29 03:49:46.53226+00	\N	1	LOGIN	User	1	User berhasil login
402	2026-07-29 03:49:55.840849+00	2026-07-29 03:49:55.840849+00	\N	1	LOGIN	User	1	User berhasil login
403	2026-07-29 03:50:15.440264+00	2026-07-29 03:50:15.440264+00	\N	13	LOGIN	User	13	User berhasil login
404	2026-07-29 03:50:15.50357+00	2026-07-29 03:50:15.50357+00	\N	10	LOGIN	User	10	User berhasil login
405	2026-07-29 03:50:15.563711+00	2026-07-29 03:50:15.563711+00	\N	1	LOGIN	User	1	User berhasil login
406	2026-07-29 03:50:44.38824+00	2026-07-29 03:50:44.38824+00	\N	13	LOGIN	User	13	User berhasil login
407	2026-07-29 03:50:44.470436+00	2026-07-29 03:50:44.470436+00	\N	10	LOGIN	User	10	User berhasil login
408	2026-07-29 03:50:44.530114+00	2026-07-29 03:50:44.530114+00	\N	1	LOGIN	User	1	User berhasil login
409	2026-07-29 03:50:45.018435+00	2026-07-29 03:50:45.018435+00	\N	13	CREATE	LeaveRequest	3	Pengajuan Sakit oleh 3273010101010003
410	2026-07-29 03:50:58.808726+00	2026-07-29 03:50:58.808726+00	\N	10	LOGIN	User	10	User berhasil login
411	2026-07-29 03:51:07.48089+00	2026-07-29 03:51:07.48089+00	\N	10	LOGIN	User	10	User berhasil login
412	2026-07-29 03:51:23.845727+00	2026-07-29 03:51:23.845727+00	\N	13	LOGIN	User	13	User berhasil login
413	2026-07-29 03:51:23.909819+00	2026-07-29 03:51:23.909819+00	\N	10	LOGIN	User	10	User berhasil login
414	2026-07-29 03:51:23.971006+00	2026-07-29 03:51:23.971006+00	\N	1	LOGIN	User	1	User berhasil login
415	2026-07-29 03:51:35.951225+00	2026-07-29 03:51:35.951225+00	\N	1	LOGIN	User	1	User berhasil login
416	2026-07-29 03:51:36.015302+00	2026-07-29 03:51:36.015302+00	\N	10	LOGIN	User	10	User berhasil login
417	2026-07-29 03:51:36.053467+00	2026-07-29 03:51:36.053467+00	\N	10	UPDATE	LeaveRequest	3	Admin Approved leave request for 3273010101010003
418	2026-07-29 03:51:47.026334+00	2026-07-29 03:51:47.026334+00	\N	1	LOGIN	User	1	User berhasil login
419	2026-07-29 03:52:18.460107+00	2026-07-29 03:52:18.460107+00	\N	1	LOGIN	User	1	User berhasil login
420	2026-07-29 03:52:18.591506+00	2026-07-29 03:52:18.591506+00	\N	13	LOGIN	User	13	User berhasil login
421	2026-07-29 03:52:27.853116+00	2026-07-29 03:52:27.853116+00	\N	13	LOGIN	User	13	User berhasil login
422	2026-07-29 03:52:38.245429+00	2026-07-29 03:52:38.245429+00	\N	13	LOGIN	User	13	User berhasil login
423	2026-07-29 03:52:58.576656+00	2026-07-29 03:52:58.576656+00	\N	13	LOGIN	User	13	User berhasil login
424	2026-07-29 03:53:23.996581+00	2026-07-29 03:53:23.996581+00	\N	13	LOGIN	User	13	User berhasil login
425	2026-07-29 03:54:17.639598+00	2026-07-29 03:54:17.639598+00	\N	1	LOGIN	User	1	User berhasil login
426	2026-07-29 03:54:17.732591+00	2026-07-29 03:54:17.732591+00	\N	13	LOGIN	User	13	User berhasil login
427	2026-07-29 03:54:30.501952+00	2026-07-29 03:54:30.501952+00	\N	13	LOGIN	User	13	User berhasil login
428	2026-07-29 03:54:30.570977+00	2026-07-29 03:54:30.570977+00	\N	1	LOGIN	User	1	User berhasil login
496	2026-07-29 05:34:41.499892+00	2026-07-29 05:34:41.499892+00	\N	12	LOGIN	User	12	User berhasil login
429	2026-07-29 03:54:30.893125+00	2026-07-29 03:54:30.893125+00	\N	13	CREATE	AttendanceRecord	707	Check-in Terlambat untuk 3273010101010003 (Dinas Luar)
430	2026-07-29 03:54:50.192411+00	2026-07-29 03:54:50.192411+00	\N	1	LOGIN	User	1	User berhasil login
431	2026-07-29 03:55:06.0534+00	2026-07-29 03:55:06.0534+00	\N	11	LOGIN	User	11	User berhasil login
432	2026-07-29 03:55:06.15739+00	2026-07-29 03:55:06.15739+00	\N	10	LOGIN	User	10	User berhasil login
433	2026-07-29 03:55:06.478354+00	2026-07-29 03:55:06.478354+00	\N	11	CREATE	LeaveRequest	4	Pengajuan Izin oleh 3273010101010001
434	2026-07-29 03:55:07.18412+00	2026-07-29 03:55:07.18412+00	\N	10	UPDATE	LeaveRequest	4	Admin Rejected leave request for 3273010101010001
435	2026-07-29 03:55:20.778782+00	2026-07-29 03:55:20.778782+00	\N	13	LOGIN	User	13	User berhasil login
436	2026-07-29 03:55:20.882077+00	2026-07-29 03:55:20.882077+00	\N	10	LOGIN	User	10	User berhasil login
437	2026-07-29 03:55:31.614172+00	2026-07-29 03:55:31.614172+00	\N	10	LOGIN	User	10	User berhasil login
438	2026-07-29 03:55:59.140051+00	2026-07-29 03:55:59.140051+00	\N	1	LOGIN	User	1	User berhasil login
439	2026-07-29 03:55:59.227526+00	2026-07-29 03:55:59.227526+00	\N	13	LOGIN	User	13	User berhasil login
440	2026-07-29 04:06:08.801129+00	2026-07-29 04:06:08.801129+00	\N	1	LOGOUT	User	1	User berhasil logout
441	2026-07-29 04:06:15.727669+00	2026-07-29 04:06:15.727669+00	\N	9	LOGIN	User	9	User berhasil login
442	2026-07-29 04:14:00.11494+00	2026-07-29 04:14:00.11494+00	\N	9	LOGOUT	User	9	User berhasil logout
443	2026-07-29 04:14:10.24506+00	2026-07-29 04:14:10.24506+00	\N	4	LOGIN	User	4	User berhasil login
444	2026-07-29 04:14:26.542761+00	2026-07-29 04:14:26.542761+00	\N	4	LOGOUT	User	4	User berhasil logout
445	2026-07-29 04:14:32.894622+00	2026-07-29 04:14:32.894622+00	\N	1	LOGIN	User	1	User berhasil login
446	2026-07-29 04:15:36.920895+00	2026-07-29 04:15:36.920895+00	\N	1	LOGOUT	User	1	User berhasil logout
447	2026-07-29 04:15:51.066848+00	2026-07-29 04:15:51.066848+00	\N	1	LOGIN	User	1	User berhasil login
448	2026-07-29 04:18:37.989567+00	2026-07-29 04:18:37.989567+00	\N	1	CREATE	Employee	14	Admin created new employee: manager@gmail.com
449	2026-07-29 04:18:44.801718+00	2026-07-29 04:18:44.801718+00	\N	1	LOGOUT	User	1	User berhasil logout
450	2026-07-29 04:18:54.164107+00	2026-07-29 04:18:54.164107+00	\N	14	LOGIN	User	14	User berhasil login
451	2026-07-29 04:19:28.24053+00	2026-07-29 04:19:28.24053+00	\N	14	CREATE	AttendanceRecord	708	Check-in Terlambat untuk 3173072812041028 (Dinas Luar)
452	2026-07-29 04:43:52.021016+00	2026-07-29 04:43:52.021016+00	\N	14	LOGOUT	User	14	User berhasil logout
453	2026-07-29 04:43:57.264723+00	2026-07-29 04:43:57.264723+00	\N	1	LOGIN	User	1	User berhasil login
454	2026-07-29 04:45:24.281123+00	2026-07-29 04:45:24.281123+00	\N	1	LOGOUT	User	1	User berhasil logout
455	2026-07-29 04:45:30.685766+00	2026-07-29 04:45:30.685766+00	\N	9	LOGIN	User	9	User berhasil login
456	2026-07-29 04:45:46.280272+00	2026-07-29 04:45:46.280272+00	\N	9	CREATE	AttendanceRecord	709	Check-in Terlambat untuk 3173072812041007 (Dinas Luar)
457	2026-07-29 04:49:17.662102+00	2026-07-29 04:49:17.662102+00	\N	9	LOGOUT	User	9	User berhasil logout
458	2026-07-29 04:49:23.432432+00	2026-07-29 04:49:23.432432+00	\N	9	LOGIN	User	9	User berhasil login
459	2026-07-29 04:49:35.534174+00	2026-07-29 04:49:35.534174+00	\N	9	LOGOUT	User	9	User berhasil logout
460	2026-07-29 04:49:40.909889+00	2026-07-29 04:49:40.909889+00	\N	1	LOGIN	User	1	User berhasil login
461	2026-07-29 04:51:05.849272+00	2026-07-29 04:51:05.849272+00	\N	1	LOGOUT	User	1	User berhasil logout
462	2026-07-29 04:51:10.79152+00	2026-07-29 04:51:10.79152+00	\N	1	LOGIN	User	1	User berhasil login
463	2026-07-29 04:51:50.365172+00	2026-07-29 04:51:50.365172+00	\N	1	CREATE	Employee	15	Admin created new employee: manager2@golan.com
464	2026-07-29 04:51:55.660183+00	2026-07-29 04:51:55.660183+00	\N	1	LOGOUT	User	1	User berhasil logout
465	2026-07-29 04:51:59.380736+00	2026-07-29 04:51:59.380736+00	\N	15	LOGIN	User	15	User berhasil login
466	2026-07-29 04:52:12.032995+00	2026-07-29 04:52:12.032995+00	\N	15	CREATE	AttendanceRecord	710	Check-in Terlambat untuk 3173072812041011 (Dinas Luar)
467	2026-07-29 04:52:19.355749+00	2026-07-29 04:52:19.355749+00	\N	15	LOGOUT	User	15	User berhasil logout
468	2026-07-29 04:52:30.758218+00	2026-07-29 04:52:30.758218+00	\N	1	LOGIN	User	1	User berhasil login
469	2026-07-29 04:53:05.539351+00	2026-07-29 04:53:05.539351+00	\N	1	UPDATE	Employee	15	Admin updated employee profile: manager2@golan.com
470	2026-07-29 04:53:27.367097+00	2026-07-29 04:53:27.367097+00	\N	1	LOGOUT	User	1	User berhasil logout
471	2026-07-29 04:53:32.539341+00	2026-07-29 04:53:32.539341+00	\N	15	LOGIN	User	15	User berhasil login
472	2026-07-29 04:55:43.490889+00	2026-07-29 04:55:43.490889+00	\N	15	LOGOUT	User	15	User berhasil logout
473	2026-07-29 04:56:01.852967+00	2026-07-29 04:56:01.852967+00	\N	1	LOGIN	User	1	User berhasil login
474	2026-07-29 04:57:16.210776+00	2026-07-29 04:57:16.210776+00	\N	1	CREATE	Employee	16	Admin created new employee: manager3@golan.com
475	2026-07-29 04:57:25.706948+00	2026-07-29 04:57:25.706948+00	\N	1	LOGOUT	User	1	User berhasil logout
476	2026-07-29 04:57:29.490952+00	2026-07-29 04:57:29.490952+00	\N	16	LOGIN	User	16	User berhasil login
477	2026-07-29 04:57:35.1408+00	2026-07-29 04:57:35.1408+00	\N	16	CREATE	AttendanceRecord	711	Check-in Terlambat untuk 3173072812041006 (Dinas Luar)
478	2026-07-29 05:31:58.380623+00	2026-07-29 05:31:58.380623+00	\N	1	LOGIN	User	1	User berhasil login
479	2026-07-29 05:32:56.766984+00	2026-07-29 05:32:56.766984+00	\N	10	LOGIN	User	10	User berhasil login
480	2026-07-29 05:32:56.863716+00	2026-07-29 05:32:56.863716+00	\N	11	LOGIN	User	11	User berhasil login
481	2026-07-29 05:32:56.924074+00	2026-07-29 05:32:56.924074+00	\N	13	LOGIN	User	13	User berhasil login
482	2026-07-29 05:33:18.326112+00	2026-07-29 05:33:18.326112+00	\N	11	LOGIN	User	11	User berhasil login
483	2026-07-29 05:33:18.427432+00	2026-07-29 05:33:18.427432+00	\N	12	LOGIN	User	12	User berhasil login
484	2026-07-29 05:33:18.486385+00	2026-07-29 05:33:18.486385+00	\N	13	LOGIN	User	13	User berhasil login
485	2026-07-29 05:33:19.004793+00	2026-07-29 05:33:19.004793+00	\N	12	CREATE	LeaveRequest	5	Pengajuan Cuti oleh 3273010101010002
486	2026-07-29 05:33:40.872244+00	2026-07-29 05:33:40.872244+00	\N	12	LOGIN	User	12	User berhasil login
487	2026-07-29 05:33:40.965599+00	2026-07-29 05:33:40.965599+00	\N	10	LOGIN	User	10	User berhasil login
488	2026-07-29 05:33:41.023579+00	2026-07-29 05:33:41.023579+00	\N	1	LOGIN	User	1	User berhasil login
489	2026-07-29 05:33:48.813748+00	2026-07-29 05:33:48.813748+00	\N	1	LOGIN	User	1	User berhasil login
490	2026-07-29 05:34:16.71016+00	2026-07-29 05:34:16.71016+00	\N	12	LOGIN	User	12	User berhasil login
491	2026-07-29 05:34:16.815388+00	2026-07-29 05:34:16.815388+00	\N	10	LOGIN	User	10	User berhasil login
492	2026-07-29 05:34:16.874133+00	2026-07-29 05:34:16.874133+00	\N	1	LOGIN	User	1	User berhasil login
493	2026-07-29 05:34:33.582651+00	2026-07-29 05:34:33.582651+00	\N	12	LOGIN	User	12	User berhasil login
494	2026-07-29 05:34:33.688069+00	2026-07-29 05:34:33.688069+00	\N	10	LOGIN	User	10	User berhasil login
495	2026-07-29 05:34:33.745944+00	2026-07-29 05:34:33.745944+00	\N	1	LOGIN	User	1	User berhasil login
497	2026-07-29 05:36:35.205943+00	2026-07-29 05:36:35.205943+00	\N	1	LOGIN	User	1	User berhasil login
498	2026-07-29 05:55:52.576527+00	2026-07-29 05:55:52.576527+00	\N	16	LOGOUT	User	16	User berhasil logout
499	2026-07-29 07:00:05.548317+00	2026-07-29 07:00:05.548317+00	\N	1	LOGIN	User	1	User berhasil login
500	2026-07-29 07:01:44.480932+00	2026-07-29 07:01:44.480932+00	\N	1	LOGIN	User	1	User berhasil login
501	2026-07-29 07:25:43.919348+00	2026-07-29 07:25:43.919348+00	\N	1	DELETE	Division	6	Deleted division: Golan Event
502	2026-07-29 07:25:55.812832+00	2026-07-29 07:25:55.812832+00	\N	1	CREATE	Division	9	Created division: jknxikiasjhk
503	2026-07-29 07:26:01.059843+00	2026-07-29 07:26:01.059843+00	\N	1	DELETE	Division	9	Deleted division: jknxikiasjhk
504	2026-07-29 07:29:03.132736+00	2026-07-29 07:29:03.132736+00	\N	1	CREATE	Division	10	Created division: Golan Event
505	2026-07-29 07:29:16.628694+00	2026-07-29 07:29:16.628694+00	\N	1	CREATE	Position	4	Created position: hjvjhvajs
506	2026-07-29 07:29:37.350337+00	2026-07-29 07:29:37.350337+00	\N	1	DELETE	Position	4	Deleted position: hjvjhvajs
507	2026-07-29 07:29:46.669007+00	2026-07-29 07:29:46.669007+00	\N	1	LOGOUT	User	1	User berhasil logout
508	2026-07-29 07:31:21.590275+00	2026-07-29 07:31:21.590275+00	\N	4	LOGIN	User	4	User berhasil login
509	2026-07-29 07:34:57.290395+00	2026-07-29 07:34:57.290395+00	\N	1	CREATE	Employee	22	Admin created new employee: pai@golan.com
510	2026-07-29 07:36:02.293923+00	2026-07-29 07:36:02.293923+00	\N	1	DELETE	Employee	22	Admin deleted employee data
511	2026-07-29 07:37:48.757347+00	2026-07-29 07:37:48.757347+00	\N	1	CREATE	CompanyEvent	3	Created company event: pembahasan magang
512	2026-07-29 07:38:04.684665+00	2026-07-29 07:38:04.684665+00	\N	1	DELETE	CompanyEvent	3	Deleted company event: pembahasan magang
513	2026-07-29 07:44:25.828941+00	2026-07-29 07:44:25.828941+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
514	2026-07-29 07:44:59.626906+00	2026-07-29 07:44:59.626906+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
515	2026-07-29 07:45:29.180309+00	2026-07-29 07:45:29.180309+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
516	2026-07-29 07:45:43.213077+00	2026-07-29 07:45:43.213077+00	\N	4	LOGOUT	User	4	User berhasil logout
517	2026-07-29 07:45:43.432267+00	2026-07-29 07:45:43.432267+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
518	2026-07-29 07:47:57.013784+00	2026-07-29 07:47:57.013784+00	\N	14	LOGIN	User	14	User berhasil login
519	2026-07-29 07:50:17.92569+00	2026-07-29 07:50:17.92569+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
520	2026-07-29 07:51:02.410205+00	2026-07-29 07:51:02.410205+00	\N	1	UPDATE	LeaveQuota	1	Updated employee leave quota
521	2026-07-29 07:51:36.428092+00	2026-07-29 07:51:36.428092+00	\N	1	UPDATE	LeaveQuota	2	Updated employee leave quota
522	2026-07-29 07:56:11.776689+00	2026-07-29 07:56:11.776689+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
523	2026-07-29 07:56:45.078762+00	2026-07-29 07:56:45.078762+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
524	2026-07-29 07:57:00.982104+00	2026-07-29 07:57:00.982104+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
525	2026-07-29 07:58:16.436392+00	2026-07-29 07:58:16.436392+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
526	2026-07-29 07:58:25.687432+00	2026-07-29 07:58:25.687432+00	\N	1	UPDATE	LeaveRequest	5	Admin Approved leave request for 3273010101010002
527	2026-07-29 07:58:57.848929+00	2026-07-29 07:58:57.848929+00	\N	1	UPDATE	LeaveRequest	2	Admin Rejected leave request for 3173072812041001
528	2026-07-29 08:07:32.311423+00	2026-07-29 08:07:32.311423+00	\N	14	LOGOUT	User	14	User berhasil logout
529	2026-07-29 08:08:31.82324+00	2026-07-29 08:08:31.82324+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
530	2026-07-29 08:09:26.897264+00	2026-07-29 08:09:26.897264+00	\N	2	LOGIN	User	2	User berhasil login
531	2026-07-29 08:14:39.419663+00	2026-07-29 08:14:39.419663+00	\N	2	CREATE	LeaveRequest	6	Pengajuan Sakit oleh 3173072812041002
532	2026-07-29 08:16:37.512968+00	2026-07-29 08:16:37.512968+00	\N	2	CREATE	LeaveRequest	7	Pengajuan Lainnya oleh 3173072812041002
533	2026-07-29 08:18:32.687594+00	2026-07-29 08:18:32.687594+00	\N	1	UPDATE	Employee	13	Admin updated employee profile: qa.intern.20260729102456@golan.test
534	2026-07-29 08:19:08.3007+00	2026-07-29 08:19:08.3007+00	\N	2	LOGOUT	User	2	User berhasil logout
535	2026-07-29 08:19:10.619237+00	2026-07-29 08:19:10.619237+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
536	2026-07-29 08:19:24.425701+00	2026-07-29 08:19:24.425701+00	\N	3	LOGIN	User	3	User berhasil login
537	2026-07-29 08:19:57.658093+00	2026-07-29 08:19:57.658093+00	\N	1	UPDATE	Employee	13	Admin updated employee profile: qa.intern.20260729102456@golan.test
538	2026-07-29 08:22:51.458039+00	2026-07-29 08:22:51.458039+00	\N	3	UPDATE	Employee	2	Employee updated profile photo
539	2026-07-29 08:23:41.309257+00	2026-07-29 08:23:41.309257+00	\N	3	LOGOUT	User	3	User berhasil logout
540	2026-07-29 08:24:04.523898+00	2026-07-29 08:24:04.523898+00	\N	2	LOGIN	User	2	User berhasil login
541	2026-07-29 08:25:14.822552+00	2026-07-29 08:25:14.822552+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
542	2026-07-29 08:25:28.976906+00	2026-07-29 08:25:28.976906+00	\N	2	LOGOUT	User	2	User berhasil logout
543	2026-07-29 08:25:49.041261+00	2026-07-29 08:25:49.041261+00	\N	2	LOGIN	User	2	User berhasil login
544	2026-07-29 08:35:45.13115+00	2026-07-29 08:35:45.13115+00	\N	2	LOGOUT	User	2	User berhasil logout
545	2026-07-29 08:36:01.65235+00	2026-07-29 08:36:01.65235+00	\N	3	LOGIN	User	3	User berhasil login
546	2026-07-29 08:40:00.656307+00	2026-07-29 08:40:00.656307+00	\N	3	CREATE	LeaveRequest	8	Pengajuan Cuti oleh 3215642311567952
547	2026-07-29 09:15:59.051903+00	2026-07-29 09:15:59.051903+00	\N	1	UPDATE	EmployeeHomeLocation	1	Updated employee home geofence
548	2026-07-29 09:25:57.301075+00	2026-07-29 09:25:57.301075+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
549	2026-07-29 09:29:27.041149+00	2026-07-29 09:29:27.041149+00	\N	1	LOGOUT	User	1	User berhasil logout
550	2026-07-29 09:29:41.069027+00	2026-07-29 09:29:41.069027+00	\N	2	LOGIN	User	2	User berhasil login
551	2026-07-29 09:30:09.256515+00	2026-07-29 09:30:09.256515+00	\N	2	LOGOUT	User	2	User berhasil logout
552	2026-07-29 09:30:16.00704+00	2026-07-29 09:30:16.00704+00	\N	1	LOGIN	User	1	User berhasil login
553	2026-07-30 01:52:20.287879+00	2026-07-30 01:52:20.287879+00	\N	1	LOGIN	User	1	User berhasil login
554	2026-07-30 01:58:00.020059+00	2026-07-30 01:58:00.020059+00	\N	1	LOGOUT	User	1	User berhasil logout
555	2026-07-30 01:58:21.464408+00	2026-07-30 01:58:21.464408+00	\N	1	LOGIN	User	1	User berhasil login
556	2026-07-30 01:58:41.429337+00	2026-07-30 01:58:41.429337+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
557	2026-07-30 01:58:46.279661+00	2026-07-30 01:58:46.279661+00	\N	1	LOGOUT	User	1	User berhasil logout
558	2026-07-30 01:58:52.032604+00	2026-07-30 01:58:52.032604+00	\N	2	LOGIN	User	2	User berhasil login
559	2026-07-30 02:00:37.623867+00	2026-07-30 02:00:37.623867+00	\N	3	LOGIN	User	3	User berhasil login
560	2026-07-30 02:01:00.249878+00	2026-07-30 02:01:00.249878+00	\N	2	LOGOUT	User	2	User berhasil logout
561	2026-07-30 02:01:08.195348+00	2026-07-30 02:01:08.195348+00	\N	1	LOGIN	User	1	User berhasil login
562	2026-07-30 02:02:12.280624+00	2026-07-30 02:02:12.280624+00	\N	3	CREATE	AttendanceRecord	729	Check-in Hadir untuk 3215642311567952 (Dinas Luar)
563	2026-07-30 02:03:14.823438+00	2026-07-30 02:03:14.823438+00	\N	3	CREATE	LeaveRequest	9	Pengajuan Cuti oleh 3215642311567952
564	2026-07-30 02:05:55.720526+00	2026-07-30 02:05:55.720526+00	\N	3	LOGOUT	User	3	User berhasil logout
565	2026-07-30 02:06:28.972446+00	2026-07-30 02:06:28.972446+00	\N	1	LOGIN	User	1	User berhasil login
566	2026-07-30 02:07:02.745456+00	2026-07-30 02:07:02.745456+00	\N	1	UPDATE	LeaveRequest	9	Admin Approved leave request for 3215642311567952
567	2026-07-30 02:07:09.090582+00	2026-07-30 02:07:09.090582+00	\N	1	LOGOUT	User	1	User berhasil logout
568	2026-07-30 02:07:19.110093+00	2026-07-30 02:07:19.110093+00	\N	3	LOGIN	User	3	User berhasil login
569	2026-07-30 02:24:26.533329+00	2026-07-30 02:24:26.533329+00	\N	3	LOGOUT	User	3	User berhasil logout
570	2026-07-30 02:24:57.475401+00	2026-07-30 02:24:57.475401+00	\N	14	LOGIN	User	14	User berhasil login
571	2026-07-30 02:25:15.295761+00	2026-07-30 02:25:15.295761+00	\N	14	CREATE	AttendanceRecord	734	Check-in Terlambat untuk 3173072812041028 (Dinas Luar)
572	2026-07-30 02:30:52.802466+00	2026-07-30 02:30:52.802466+00	\N	14	LOGOUT	User	14	User berhasil logout
573	2026-07-30 02:31:22.151683+00	2026-07-30 02:31:22.151683+00	\N	2	LOGIN	User	2	User berhasil login
574	2026-07-30 02:31:29.735567+00	2026-07-30 02:31:29.735567+00	\N	1	LOGOUT	User	1	User berhasil logout
575	2026-07-30 02:31:50.911478+00	2026-07-30 02:31:50.911478+00	\N	2	LOGOUT	User	2	User berhasil logout
576	2026-07-30 02:32:21.373669+00	2026-07-30 02:32:21.373669+00	\N	2	LOGIN	User	2	User berhasil login
577	2026-07-30 02:32:33.577363+00	2026-07-30 02:32:33.577363+00	\N	2	LOGIN	User	2	User berhasil login
578	2026-07-30 02:45:57.326509+00	2026-07-30 02:45:57.326509+00	\N	2	LOGOUT	User	2	User berhasil logout
579	2026-07-30 02:46:02.425681+00	2026-07-30 02:46:02.425681+00	\N	2	LOGIN	User	2	User berhasil login
580	2026-07-30 02:46:17.061267+00	2026-07-30 02:46:17.061267+00	\N	2	CREATE	AttendanceRecord	735	Check-in Terlambat untuk 3173072812041002 (Dinas Luar)
581	2026-07-30 02:56:00.916312+00	2026-07-30 02:56:00.916312+00	\N	2	LOGOUT	User	2	User berhasil logout
582	2026-07-30 03:00:15.210182+00	2026-07-30 03:00:15.210182+00	\N	2	LOGOUT	User	2	User berhasil logout
583	2026-07-30 03:00:21.68222+00	2026-07-30 03:00:21.68222+00	\N	1	LOGIN	User	1	User berhasil login
584	2026-07-30 03:00:35.574344+00	2026-07-30 03:00:35.574344+00	\N	14	LOGIN	User	14	User berhasil login
585	2026-07-30 03:05:29.829726+00	2026-07-30 03:05:29.829726+00	\N	1	LOGOUT	User	1	User berhasil logout
586	2026-07-30 03:05:44.299802+00	2026-07-30 03:05:44.299802+00	\N	2	LOGIN	User	2	User berhasil login
587	2026-07-30 03:07:04.393929+00	2026-07-30 03:07:04.393929+00	\N	2	LOGOUT	User	2	User berhasil logout
588	2026-07-30 03:07:11.452642+00	2026-07-30 03:07:11.452642+00	\N	1	LOGIN	User	1	User berhasil login
589	2026-07-30 03:07:33.775329+00	2026-07-30 03:07:33.775329+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
590	2026-07-30 03:11:54.037721+00	2026-07-30 03:11:54.037721+00	\N	1	LOGOUT	User	1	User berhasil logout
591	2026-07-30 03:11:58.141616+00	2026-07-30 03:11:58.141616+00	\N	2	LOGIN	User	2	User berhasil login
592	2026-07-30 03:20:37.801022+00	2026-07-30 03:20:37.801022+00	\N	2	LOGOUT	User	2	User berhasil logout
593	2026-07-30 03:20:48.532425+00	2026-07-30 03:20:48.532425+00	\N	1	LOGIN	User	1	User berhasil login
594	2026-07-30 03:23:45.403958+00	2026-07-30 03:23:45.403958+00	\N	1	LOGOUT	User	1	User berhasil logout
595	2026-07-30 03:23:54.038479+00	2026-07-30 03:23:54.038479+00	\N	14	LOGIN	User	14	User berhasil login
596	2026-07-30 03:43:27.626601+00	2026-07-30 03:43:27.626601+00	\N	14	LOGOUT	User	14	User berhasil logout
597	2026-07-30 03:44:13.76487+00	2026-07-30 03:44:13.76487+00	\N	3	LOGIN	User	3	User berhasil login
598	2026-07-30 03:44:51.113939+00	2026-07-30 03:44:51.113939+00	\N	3	LOGOUT	User	3	User berhasil logout
599	2026-07-30 03:45:00.70531+00	2026-07-30 03:45:00.70531+00	\N	1	LOGIN	User	1	User berhasil login
600	2026-07-30 03:49:33.469015+00	2026-07-30 03:49:33.469015+00	\N	14	LOGOUT	User	14	User berhasil logout
601	2026-07-30 03:49:39.251927+00	2026-07-30 03:49:39.251927+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
602	2026-07-30 03:49:42.0991+00	2026-07-30 03:49:42.0991+00	\N	1	LOGIN	User	1	User berhasil login
603	2026-07-30 03:50:59.167008+00	2026-07-30 03:50:59.167008+00	\N	1	LOGOUT	User	1	User berhasil logout
604	2026-07-30 03:51:07.15955+00	2026-07-30 03:51:07.15955+00	\N	14	LOGIN	User	14	User berhasil login
605	2026-07-30 03:51:22.424672+00	2026-07-30 03:51:22.424672+00	\N	14	LOGOUT	User	14	User berhasil logout
606	2026-07-30 03:51:27.901563+00	2026-07-30 03:51:27.901563+00	\N	15	LOGIN	User	15	User berhasil login
607	2026-07-30 03:51:43.663563+00	2026-07-30 03:51:43.663563+00	\N	15	CREATE	AttendanceRecord	736	Check-in Terlambat untuk 3173072812041011 (Dinas Luar)
608	2026-07-30 03:51:48.339009+00	2026-07-30 03:51:48.339009+00	\N	15	LOGOUT	User	15	User berhasil logout
609	2026-07-30 03:51:55.515774+00	2026-07-30 03:51:55.515774+00	\N	16	LOGIN	User	16	User berhasil login
610	2026-07-30 03:52:10.929721+00	2026-07-30 03:52:10.929721+00	\N	16	CREATE	AttendanceRecord	737	Check-in Terlambat untuk 3173072812041006 (Dinas Luar)
611	2026-07-30 03:52:52.214957+00	2026-07-30 03:52:52.214957+00	\N	16	CREATE	LeaveRequest	10	Pengajuan Sakit oleh 3173072812041006
612	2026-07-30 03:53:04.944691+00	2026-07-30 03:53:04.944691+00	\N	16	LOGOUT	User	16	User berhasil logout
613	2026-07-30 03:53:11.519802+00	2026-07-30 03:53:11.519802+00	\N	14	LOGIN	User	14	User berhasil login
614	2026-07-30 03:55:28.929097+00	2026-07-30 03:55:28.929097+00	\N	14	UPDATE	LeaveRequest	10	Admin Approved leave request for 3173072812041006
615	2026-07-30 03:55:51.87524+00	2026-07-30 03:55:51.87524+00	\N	14	LOGOUT	User	14	User berhasil logout
616	2026-07-30 03:55:59.795228+00	2026-07-30 03:55:59.795228+00	\N	1	LOGIN	User	1	User berhasil login
617	2026-07-30 03:56:08.910403+00	2026-07-30 03:56:08.910403+00	\N	1	LOGOUT	User	1	User berhasil logout
618	2026-07-30 03:56:18.189209+00	2026-07-30 03:56:18.189209+00	\N	3	LOGIN	User	3	User berhasil login
619	2026-07-30 04:51:43.428911+00	2026-07-30 04:51:43.428911+00	\N	2	LOGIN	User	2	User berhasil login
620	2026-07-30 04:52:00.661853+00	2026-07-30 04:52:00.661853+00	\N	2	LOGOUT	User	2	User berhasil logout
621	2026-07-30 04:52:10.914578+00	2026-07-30 04:52:10.914578+00	\N	1	LOGIN	User	1	User berhasil login
622	2026-07-30 04:52:26.758527+00	2026-07-30 04:52:26.758527+00	\N	1	LOGOUT	User	1	User berhasil logout
623	2026-07-30 04:52:37.497007+00	2026-07-30 04:52:37.497007+00	\N	3	LOGIN	User	3	User berhasil login
624	2026-07-30 04:52:58.333034+00	2026-07-30 04:52:58.333034+00	\N	3	LOGOUT	User	3	User berhasil logout
625	2026-07-30 04:53:14.226008+00	2026-07-30 04:53:14.226008+00	\N	3	LOGIN	User	3	User berhasil login
626	2026-07-30 04:53:20.720244+00	2026-07-30 04:53:20.720244+00	\N	3	LOGOUT	User	3	User berhasil logout
627	2026-07-30 04:53:30.917926+00	2026-07-30 04:53:30.917926+00	\N	1	LOGIN	User	1	User berhasil login
628	2026-07-30 04:54:05.266408+00	2026-07-30 04:54:05.266408+00	\N	1	LOGOUT	User	1	User berhasil logout
629	2026-07-30 04:54:26.011669+00	2026-07-30 04:54:26.011669+00	\N	16	LOGIN	User	16	User berhasil login
630	2026-07-30 04:54:31.770571+00	2026-07-30 04:54:31.770571+00	\N	16	LOGOUT	User	16	User berhasil logout
631	2026-07-30 04:54:48.896349+00	2026-07-30 04:54:48.896349+00	\N	16	LOGIN	User	16	User berhasil login
632	2026-07-30 04:54:53.869669+00	2026-07-30 04:54:53.869669+00	\N	16	LOGOUT	User	16	User berhasil logout
633	2026-07-30 04:55:02.280343+00	2026-07-30 04:55:02.280343+00	\N	1	LOGIN	User	1	User berhasil login
634	2026-07-30 04:57:05.402892+00	2026-07-30 04:57:05.402892+00	\N	1	LOGOUT	User	1	User berhasil logout
635	2026-07-30 04:57:35.214525+00	2026-07-30 04:57:35.214525+00	\N	1	LOGIN	User	1	User berhasil login
636	2026-07-30 05:02:41.38093+00	2026-07-30 05:02:41.38093+00	\N	1	LOGOUT	User	1	User berhasil logout
637	2026-07-30 05:02:47.539989+00	2026-07-30 05:02:47.539989+00	\N	2	LOGIN	User	2	User berhasil login
638	2026-07-30 05:05:04.053569+00	2026-07-30 05:05:04.053569+00	\N	2	LOGOUT	User	2	User berhasil logout
639	2026-07-30 05:05:09.530003+00	2026-07-30 05:05:09.530003+00	\N	1	LOGIN	User	1	User berhasil login
640	2026-07-30 05:47:17.686576+00	2026-07-30 05:47:17.686576+00	\N	1	LOGIN	User	1	User berhasil login
641	2026-07-30 05:58:29.193728+00	2026-07-30 05:58:29.193728+00	\N	1	LOGIN	User	1	User berhasil login
642	2026-07-30 05:59:06.416601+00	2026-07-30 05:59:06.416601+00	\N	1	LOGOUT	User	1	User berhasil logout
643	2026-07-30 06:00:19.553009+00	2026-07-30 06:00:19.553009+00	\N	2	LOGIN	User	2	User berhasil login
644	2026-07-30 06:00:33.043609+00	2026-07-30 06:00:33.043609+00	\N	2	LOGIN	User	2	User berhasil login
645	2026-07-30 06:04:58.456336+00	2026-07-30 06:04:58.456336+00	\N	2	LOGOUT	User	2	User berhasil logout
646	2026-07-30 06:05:04.278887+00	2026-07-30 06:05:04.278887+00	\N	1	LOGIN	User	1	User berhasil login
647	2026-07-30 06:05:17.509624+00	2026-07-30 06:05:17.509624+00	\N	2	LOGOUT	User	2	User berhasil logout
648	2026-07-30 06:15:16.354101+00	2026-07-30 06:15:16.354101+00	\N	1	LOGOUT	User	1	User berhasil logout
649	2026-07-30 06:15:23.031382+00	2026-07-30 06:15:23.031382+00	\N	3	LOGIN	User	3	User berhasil login
650	2026-07-30 06:15:58.202925+00	2026-07-30 06:15:58.202925+00	\N	3	LOGOUT	User	3	User berhasil logout
651	2026-07-30 06:16:07.108497+00	2026-07-30 06:16:07.108497+00	\N	3	LOGIN	User	3	User berhasil login
652	2026-07-30 06:16:55.786346+00	2026-07-30 06:16:55.786346+00	\N	3	CREATE	LeaveRequest	11	Pengajuan Cuti oleh 3215642311567952
653	2026-07-30 06:17:00.714894+00	2026-07-30 06:17:00.714894+00	\N	3	LOGOUT	User	3	User berhasil logout
654	2026-07-30 06:17:06.608317+00	2026-07-30 06:17:06.608317+00	\N	1	LOGIN	User	1	User berhasil login
655	2026-07-30 06:17:58.532598+00	2026-07-30 06:17:58.532598+00	\N	1	UPDATE	LeaveRequest	11	Admin Approved leave request for 3215642311567952
656	2026-07-30 06:18:16.725758+00	2026-07-30 06:18:16.725758+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
657	2026-07-30 06:18:41.493052+00	2026-07-30 06:18:41.493052+00	\N	1	LOGOUT	User	1	User berhasil logout
658	2026-07-30 06:18:50.59552+00	2026-07-30 06:18:50.59552+00	\N	3	LOGIN	User	3	User berhasil login
659	2026-07-30 06:19:08.840772+00	2026-07-30 06:19:08.840772+00	\N	3	LOGOUT	User	3	User berhasil logout
660	2026-07-30 06:19:17.117636+00	2026-07-30 06:19:17.117636+00	\N	1	LOGIN	User	1	User berhasil login
661	2026-07-30 06:19:31.025821+00	2026-07-30 06:19:31.025821+00	\N	1	UPDATE	LeaveQuota	4	Updated employee leave quota
662	2026-07-30 06:19:35.283425+00	2026-07-30 06:19:35.283425+00	\N	1	LOGOUT	User	1	User berhasil logout
663	2026-07-30 06:19:43.162035+00	2026-07-30 06:19:43.162035+00	\N	3	LOGIN	User	3	User berhasil login
664	2026-07-30 06:23:59.87051+00	2026-07-30 06:23:59.87051+00	\N	3	LOGOUT	User	3	User berhasil logout
665	2026-07-30 06:26:36.312021+00	2026-07-30 06:26:36.312021+00	\N	1	LOGIN	User	1	User berhasil login
666	2026-07-30 06:45:54.082561+00	2026-07-30 06:45:54.082561+00	\N	1	UPDATE	RolePermission	0	Updated role permissions
667	2026-07-30 06:47:55.051542+00	2026-07-30 06:47:55.051542+00	\N	1	LOGOUT	User	1	User berhasil logout
668	2026-07-30 06:48:03.947196+00	2026-07-30 06:48:03.947196+00	\N	1	LOGIN	User	1	User berhasil login
669	2026-07-30 06:48:16.158685+00	2026-07-30 06:48:16.158685+00	\N	1	LOGOUT	User	1	User berhasil logout
670	2026-07-30 06:48:30.037119+00	2026-07-30 06:48:30.037119+00	\N	2	LOGIN	User	2	User berhasil login
671	2026-07-30 06:49:22.981912+00	2026-07-30 06:49:22.981912+00	\N	2	LOGOUT	User	2	User berhasil logout
672	2026-07-30 06:49:30.745781+00	2026-07-30 06:49:30.745781+00	\N	1	LOGIN	User	1	User berhasil login
673	2026-07-30 07:09:48.988827+00	2026-07-30 07:09:48.988827+00	\N	1	UPDATE	Employee	4	Admin updated employee profile: devanlesmana123@gmail.com
674	2026-07-30 07:17:28.915527+00	2026-07-30 07:17:28.915527+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
675	2026-07-30 07:17:34.534345+00	2026-07-30 07:17:34.534345+00	\N	1	LOGOUT	User	1	User berhasil logout
676	2026-07-30 07:17:38.613127+00	2026-07-30 07:17:38.613127+00	\N	2	LOGIN	User	2	User berhasil login
677	2026-07-30 07:17:51.071615+00	2026-07-30 07:17:51.071615+00	\N	2	LOGOUT	User	2	User berhasil logout
678	2026-07-30 07:17:56.668338+00	2026-07-30 07:17:56.668338+00	\N	15	LOGIN	User	15	User berhasil login
679	2026-07-30 07:18:22.987086+00	2026-07-30 07:18:22.987086+00	\N	15	UPDATE	LeaveRequest	7	Admin Approved leave request for 3173072812041002
680	2026-07-30 07:18:24.182375+00	2026-07-30 07:18:24.182375+00	\N	15	UPDATE	LeaveRequest	6	Admin Approved leave request for 3173072812041002
681	2026-07-30 07:20:48.696021+00	2026-07-30 07:20:48.696021+00	\N	15	LOGOUT	User	15	User berhasil logout
682	2026-07-30 07:20:55.218813+00	2026-07-30 07:20:55.218813+00	\N	1	LOGIN	User	1	User berhasil login
683	2026-07-30 07:21:10.801959+00	2026-07-30 07:21:10.801959+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
684	2026-07-30 07:21:28.11073+00	2026-07-30 07:21:28.11073+00	\N	1	UPDATE	Employee	2	Admin updated employee profile: fakhri@gmail.com
685	2026-07-30 07:21:31.714529+00	2026-07-30 07:21:31.714529+00	\N	1	LOGOUT	User	1	User berhasil logout
686	2026-07-30 07:21:40.196524+00	2026-07-30 07:21:40.196524+00	\N	14	LOGIN	User	14	User berhasil login
687	2026-07-30 07:23:17.76104+00	2026-07-30 07:23:17.76104+00	\N	14	LOGOUT	User	14	User berhasil logout
688	2026-07-30 07:23:25.008188+00	2026-07-30 07:23:25.008188+00	\N	1	LOGIN	User	1	User berhasil login
689	2026-07-30 07:24:02.295199+00	2026-07-30 07:24:02.295199+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
690	2026-07-30 07:31:50.962963+00	2026-07-30 07:31:50.962963+00	\N	1	UPDATE	Employee	3	Admin updated employee profile: irvan@gmail.com
691	2026-07-30 07:46:05.52056+00	2026-07-30 07:46:05.52056+00	\N	1	CREATE	CompanyEvent	4	Created company event: jgfyuut
692	2026-07-30 08:34:03.003301+00	2026-07-30 08:34:03.003301+00	\N	1	CREATE	WorkSchedule	3	Admin created work schedule: pagi pagi
693	2026-07-30 08:40:46.334055+00	2026-07-30 08:40:46.334055+00	\N	1	CREATE	WorkSchedule	4	Admin created work schedule: pagiiii
694	2026-07-30 12:54:54.590755+00	2026-07-30 12:54:54.590755+00	\N	1	LOGIN	User	1	User berhasil login
695	2026-07-30 12:58:16.608949+00	2026-07-30 12:58:16.608949+00	\N	1	CREATE	WorkSchedule	5	Admin created work schedule: khusus
696	2026-07-30 12:58:52.96406+00	2026-07-30 12:58:52.96406+00	\N	1	DELETE	WorkSchedule	3	Admin deleted work schedule: pagi pagi
697	2026-07-30 12:58:57.360136+00	2026-07-30 12:58:57.360136+00	\N	1	DELETE	WorkSchedule	4	Admin deleted work schedule: pagiiii
698	2026-07-30 13:19:42.051598+00	2026-07-30 13:19:42.051598+00	\N	1	CREATE	WorkSchedule	10	Admin created work schedule: Reguler
699	2026-07-30 13:28:49.544262+00	2026-07-30 13:28:49.544262+00	\N	1	DELETE	WorkSchedule	10	Admin deleted work schedule: Reguler
700	2026-07-30 13:28:53.575766+00	2026-07-30 13:28:53.575766+00	\N	1	CREATE	WorkSchedule	11	Admin created work schedule: Reguler
701	2026-07-30 13:29:00.288399+00	2026-07-30 13:29:00.288399+00	\N	1	DELETE	WorkSchedule	11	Admin deleted work schedule: Reguler
702	2026-07-30 13:38:34.472249+00	2026-07-30 13:38:34.472249+00	\N	1	CREATE	WorkSchedule	12	Admin created work schedule: shift malam
703	2026-07-30 13:38:37.428953+00	2026-07-30 13:38:37.428953+00	\N	1	LOGOUT	User	1	User berhasil logout
704	2026-07-30 13:38:45.697703+00	2026-07-30 13:38:45.697703+00	\N	9	LOGIN	User	9	User berhasil login
705	2026-07-30 13:41:05.705141+00	2026-07-30 13:41:05.705141+00	\N	9	LOGOUT	User	9	User berhasil logout
706	2026-07-30 13:43:31.068159+00	2026-07-30 13:43:31.068159+00	\N	9	LOGIN	User	9	User berhasil login
707	2026-07-30 13:43:34.581908+00	2026-07-30 13:43:34.581908+00	\N	9	LOGOUT	User	9	User berhasil logout
708	2026-07-30 13:43:42.190665+00	2026-07-30 13:43:42.190665+00	\N	4	LOGIN	User	4	User berhasil login
709	2026-07-30 13:48:00.153122+00	2026-07-30 13:48:00.153122+00	\N	4	LOGOUT	User	4	User berhasil logout
710	2026-07-30 13:48:07.132893+00	2026-07-30 13:48:07.132893+00	\N	9	LOGIN	User	9	User berhasil login
711	2026-07-30 13:48:39.222502+00	2026-07-30 13:48:39.222502+00	\N	9	LOGOUT	User	9	User berhasil logout
712	2026-07-30 13:48:48.870355+00	2026-07-30 13:48:48.870355+00	\N	1	LOGIN	User	1	User berhasil login
713	2026-07-30 14:13:58.105006+00	2026-07-30 14:13:58.105006+00	\N	1	LOGOUT	User	1	User berhasil logout
714	2026-07-30 14:14:13.881745+00	2026-07-30 14:14:13.881745+00	\N	1	LOGIN	User	1	User berhasil login
715	2026-07-30 14:14:17.902323+00	2026-07-30 14:14:17.902323+00	\N	1	LOGOUT	User	1	User berhasil logout
716	2026-07-30 14:14:24.339856+00	2026-07-30 14:14:24.339856+00	\N	9	LOGIN	User	9	User berhasil login
717	2026-07-30 14:14:32.586862+00	2026-07-30 14:14:32.586862+00	\N	9	LOGOUT	User	9	User berhasil logout
718	2026-07-30 14:15:17.571094+00	2026-07-30 14:15:17.571094+00	\N	9	LOGIN	User	9	User berhasil login
719	2026-07-30 14:35:07.852719+00	2026-07-30 14:35:07.852719+00	\N	9	LOGOUT	User	9	User berhasil logout
720	2026-07-30 14:35:22.403657+00	2026-07-30 14:35:22.403657+00	\N	4	LOGIN	User	4	User berhasil login
721	2026-07-30 14:35:42.347538+00	2026-07-30 14:35:42.347538+00	\N	4	LOGOUT	User	4	User berhasil logout
722	2026-07-30 14:35:50.299896+00	2026-07-30 14:35:50.299896+00	\N	9	LOGIN	User	9	User berhasil login
723	2026-07-30 14:56:05.035018+00	2026-07-30 14:56:05.035018+00	\N	9	CREATE	AttendanceRecord	983	Check-in Hadir untuk 3173072812041007 (Dinas Luar)
724	2026-07-30 14:57:16.330627+00	2026-07-30 14:57:16.330627+00	\N	9	LOGOUT	User	9	User berhasil logout
725	2026-07-30 14:57:23.117455+00	2026-07-30 14:57:23.117455+00	\N	4	LOGIN	User	4	User berhasil login
726	2026-07-30 14:57:28.76455+00	2026-07-30 14:57:28.76455+00	\N	4	LOGOUT	User	4	User berhasil logout
727	2026-07-30 14:57:32.119431+00	2026-07-30 14:57:32.119431+00	\N	4	LOGIN	User	4	User berhasil login
728	2026-07-30 14:57:36.210999+00	2026-07-30 14:57:36.210999+00	\N	4	LOGOUT	User	4	User berhasil logout
729	2026-07-30 14:57:43.6507+00	2026-07-30 14:57:43.6507+00	\N	1	LOGIN	User	1	User berhasil login
\.


--
-- Data for Name: company_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_events (id, created_at, updated_at, deleted_at, tanggal, jam_mulai, jam_selesai, judul, tipe, deskripsi, lokasi, status_aktif, dibuat_oleh) FROM stdin;
1	2026-07-23 09:35:58.328511+00	2026-07-23 09:35:58.328511+00	2026-07-23 09:35:58.345036+00	2026-12-31	12:00	13:00	__CRUD_TEST_EVENT__	rapat	Temporary CRUD verification	Test	t	1
2	2026-07-23 09:47:05.560362+00	2026-07-23 09:47:05.560362+00	\N	2026-07-24	19:00	20:00	pembahasan magang	rapat	nanti saya infokan link zoomnya	online zoom	t	1
3	2026-07-29 07:37:48.743941+00	2026-07-29 07:37:48.743941+00	2026-07-29 07:38:04.667257+00	2026-07-31	16:40	17:42	pembahasan magang	lainnya	nvsajhygjyasfuyguaysguyasgudayugasu	online zoom	t	1
4	2026-07-30 07:46:05.516801+00	2026-07-30 07:46:05.516801+00	\N	2026-07-31	14:48	19:45	jgfyuut	rapat	ghcfhytfh	ghffhtf	t	1
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, created_at, updated_at, deleted_at, nama_departemen) FROM stdin;
1	2026-07-21 04:54:39.956605+00	2026-07-21 04:54:39.956605+00	\N	Engineering
\.


--
-- Data for Name: divisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.divisions (id, created_at, updated_at, deleted_at, nama_divisi, deskripsi) FROM stdin;
1	2026-07-27 09:40:50.771622+00	2026-07-27 09:40:50.771622+00	2026-07-27 10:09:23.706898+00	Migrated Division	\N
6	2026-07-27 09:40:59.30557+00	2026-07-27 10:13:51.796497+00	2026-07-29 07:25:43.909461+00	Golan Event	Event Organizer Digital
9	2026-07-29 07:25:55.791901+00	2026-07-29 07:25:55.791901+00	2026-07-29 07:26:01.044356+00	jknxikiasjhk	jknhsakuh
11	2026-07-30 08:43:02.744713+00	2026-07-30 08:43:02.744713+00	\N	Golan Education	Platform Edukasi dan Pelatihan Online
2	2026-07-27 09:40:59.294346+00	2026-07-30 08:43:02.747826+00	\N	Golan Website	Pembuatan Website Profesional & Content Writer / SEO Writer
3	2026-07-27 09:40:59.297518+00	2026-07-30 08:43:02.750999+00	\N	Golan Nusantara	Portal Berita Online dan Media Promosi Digital
4	2026-07-27 09:40:59.300744+00	2026-07-30 08:43:02.753641+00	\N	Golan Sertifikasi	Lembaga Pelatihan dan Sertifikasi Kompetensi
5	2026-07-27 09:40:59.303388+00	2026-07-30 08:43:02.756823+00	\N	Golan Properti	Platform Iklan dan Layanan Properti
10	2026-07-29 07:29:03.114202+00	2026-07-30 08:43:02.759031+00	\N	Golan Event	Event Organizer Digital
7	2026-07-27 09:40:59.308209+00	2026-07-30 08:43:02.761524+00	\N	Golan Jurnal	Layanan Publikasi Jurnal Ilmiah
8	2026-07-27 09:40:59.310333+00	2026-07-30 08:43:02.764196+00	\N	Golan SDM	Layanan Perekrutan Tenaga Kerja
\.


--
-- Data for Name: employee_home_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_home_locations (id, created_at, updated_at, deleted_at, employee_id, latitude_rumah, longitude_rumah, radius_meter, alamat_rumah, google_maps_url) FROM stdin;
4	2026-07-24 03:34:21.304473+00	2026-07-24 03:34:21.304473+00	\N	4	-6.1202471	106.7118952	100		https://maps.app.goo.gl/e3wNfVYXS8whxHRF7
5	2026-07-29 02:52:52.193241+00	2026-07-29 02:53:11.44701+00	\N	6	-6.1202471	106.7118952	100		https://maps.app.goo.gl/Bc1NJLbcxHrPLUh59
6	2026-07-29 04:18:37.986021+00	2026-07-29 04:18:37.986021+00	\N	11	-6.1202471	106.7118952	100		https://maps.app.goo.gl/Bc1NJLbcxHrPLUh59
7	2026-07-29 04:51:50.36206+00	2026-07-29 04:53:05.536929+00	\N	12	-6.1232231	106.8067674	100		https://maps.app.goo.gl/poMxhPfKu575iNRY7
8	2026-07-29 04:57:16.207864+00	2026-07-29 04:57:16.207864+00	\N	13	-6.1232231	106.8067674	100		https://maps.app.goo.gl/poMxhPfKu575iNRY7
9	2026-07-29 07:34:57.280731+00	2026-07-29 07:34:57.280731+00	\N	16	-6.1232231	106.8067674	100		https://maps.app.goo.gl/poMxhPfKu575iNRY7
3	2026-07-23 09:54:05.608077+00	2026-07-30 07:09:48.986382+00	\N	3	-6.1232231	106.8067674	100		https://maps.app.goo.gl/poMxhPfKu575iNRY7
1	2026-07-23 05:34:13.351318+00	2026-07-30 07:21:28.10833+00	\N	1	-6.1232231	106.8067674	100		https://maps.app.goo.gl/poMxhPfKu575iNRY7
2	2026-07-23 07:11:24.821513+00	2026-07-30 07:31:50.951342+00	\N	2	-6.1684777	106.7057041	100		https://maps.app.goo.gl/VyZdouQeokJMGVso7
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, created_at, updated_at, deleted_at, user_id, nik, division_id, position_id, tanggal_bergabung, home_latitude, home_longitude, foto_profil_url) FROM stdin;
4	2026-07-24 03:34:21.294645+00	2026-07-24 03:34:21.294645+00	2026-07-24 03:34:33.613996+00	7	3173072812041003	1	1	2026-07-24	-6.1202471	106.7118952	\N
3	2026-07-23 09:54:05.604672+00	2026-07-30 07:09:48.984386+00	\N	4	3173072812041001	2	2	2026-07-23	-6.1232231	106.8067674	http://localhost:9000/golan-attendance/3173072812041001-profile-1784865286.jpeg
6	2026-07-29 02:52:52.187591+00	2026-07-29 02:53:11.445329+00	\N	9	3173072812041007	2	1	0001-01-01	-6.1202471	106.7118952	
7	2026-07-29 03:24:57.036099+00	2026-07-29 03:24:57.036099+00	\N	10	327301010101	2	1	2026-01-01	0	0	
9	2026-07-29 03:24:57.166296+00	2026-07-29 03:24:57.166296+00	\N	12	3273010101010002	2	2	2026-01-01	0	0	
11	2026-07-29 04:18:37.983225+00	2026-07-29 04:18:37.983225+00	\N	14	3173072812041028	2	1	2026-07-29	-6.1202471	106.7118952	
12	2026-07-29 04:51:50.349898+00	2026-07-29 04:53:05.534047+00	\N	15	3173072812041011	2	1	2026-07-29	-6.1232231	106.8067674	
13	2026-07-29 04:57:16.205483+00	2026-07-29 04:57:16.205483+00	\N	16	3173072812041006	3	1	2026-07-29	-6.1232231	106.8067674	
8	2026-07-29 03:24:57.105215+00	2026-07-29 03:24:57.105215+00	\N	11	3273010101010001	2	2	2026-07-01	0	0	
16	2026-07-29 07:34:57.271444+00	2026-07-29 07:34:57.271444+00	2026-07-29 07:36:02.279873+00	22	0997327867867837	2	2	2026-07-16	-6.1232231	106.8067674	
1	2026-07-21 04:54:39.956605+00	2026-07-30 07:21:28.105975+00	\N	2	3173072812041002	2	3	2026-07-21	-6.1232231	106.8067674	
2	2026-07-23 07:11:24.808027+00	2026-07-30 07:31:50.948024+00	\N	3	3215642311567952	2	2	2026-07-14	-6.1684777	106.7057041	http://localhost:9000/golan-attendance/3215642311567952-profile-1785313371.jpeg
10	2026-07-29 03:24:57.228771+00	2026-07-29 08:19:57.649031+00	\N	13	3273010101010003	2	3	2026-07-01	0	0	
\.


--
-- Data for Name: general_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.general_settings (id, created_at, updated_at, deleted_at, minimum_masa_kerja_cuti_bulan, batas_laporan_setelah_checkout_jam) FROM stdin;
1	2026-07-29 05:31:10.479654+00	2026-07-29 05:31:10.479654+00	\N	3	1
\.


--
-- Data for Name: helpdesk_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.helpdesk_contacts (id, created_at, updated_at, deleted_at, email_helpdesk, email_it, whats_app_hrd, whats_app_it, jam_layanan) FROM stdin;
1	2026-07-27 05:38:38.509672+00	2026-07-27 05:46:40.7347+00	\N	info.golandigital.com	devanlesmana9@gmail.com	+62 813-2493-7038	+62 895-3414-40181	Senin - Jumat: 09:00 - 17:00 WIB
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.holidays (id, created_at, updated_at, deleted_at, tanggal, keterangan) FROM stdin;
1	2026-07-23 11:15:12.175047+00	2026-07-23 11:15:12.175047+00	2026-07-23 11:28:07.450252+00	2026-07-28	ada libur untuk divis x
2	2026-07-23 13:10:46.412543+00	2026-07-23 13:10:46.412543+00	2026-07-23 13:11:11.529309+00	2026-07-29	ada libur nasional
\.


--
-- Data for Name: internship_certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.internship_certificates (id, created_at, updated_at, deleted_at, user_id, issued_at, certificate_no, file_url, storage_key, file_name, mime_type, file_size, uploaded_by, uploaded_at) FROM stdin;
1	2026-07-29 03:52:19.081924+00	2026-07-29 04:05:54.407076+00	\N	13	2026-07-29	MAGANG-000013	http://localhost:9000/golan-attendance/certificates/13/1785297954311171200-bug.pdf	certificates/13/1785297954311171200-bug.pdf	bug.pdf	application/pdf	398409	1	2026-07-29 11:05:54.406201
2	2026-07-29 04:05:33.582564+00	2026-07-29 08:22:42.46175+00	\N	9	2026-07-29	MAGANG-000009	http://localhost:9000/golan-attendance/certificates/9/1785313362361222100-sertifikat-magang-1.pdf	certificates/9/1785313362361222100-sertifikat-magang-1.pdf	sertifikat-magang (1).pdf	application/pdf	398409	1	2026-07-29 15:22:42.459902
3	2026-07-29 08:26:33.536571+00	2026-07-29 08:26:38.228907+00	\N	2	2026-07-29	MAGANG-000002					0	\N	\N
\.


--
-- Data for Name: leave_quota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_quota (id, created_at, updated_at, deleted_at, employee_id, tahun, jenis_cuti, sisa_kuota) FROM stdin;
1	2026-07-29 07:51:02.400092+00	2026-07-29 07:51:02.400092+00	\N	6	2026	Cuti Tahunan	7
2	2026-07-29 07:51:36.411679+00	2026-07-29 07:51:36.411679+00	\N	6	2026	Izin Khusus	7
3	2026-07-29 07:58:25.642213+00	2026-07-29 07:58:25.642213+00	\N	9	2026	Cuti	11
4	2026-07-30 02:07:02.695678+00	2026-07-30 06:19:31.009912+00	\N	2	2026	Cuti	12
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, created_at, updated_at, deleted_at, employee_id, jenis_izin, tanggal_mulai, tanggal_selesai, alasan, lampiran_url, status, approved_by, approved_at, notes) FROM stdin;
1	2026-07-23 07:27:08.907735+00	2026-07-23 07:28:33.916401+00	\N	1	Sakit	2026-07-24	2026-07-24	izin kena HIV	http://localhost:9000/golan-attendance/leave-EMP-001-1784791628.jpeg	Approved	1	\N	\N
3	2026-07-29 03:50:45.014698+00	2026-07-29 03:51:36.046564+00	\N	10	Sakit	2026-07-30	2026-07-30	Demam untuk QA E2E		Approved	10	2026-07-29 10:51:36.044944	Disetujui manager pada QA E2E
4	2026-07-29 03:55:06.44641+00	2026-07-29 03:55:07.165923+00	\N	8	Lainnya	2026-08-01	2026-08-01	QA pending approval		Rejected	10	2026-07-29 10:55:07.163656	Ditolak untuk validasi E2E
5	2026-07-29 05:33:19.001312+00	2026-07-29 07:58:25.633261+00	\N	9	Cuti	2026-08-04	2026-08-04	Cuti E2E		Approved	1	2026-07-29 14:58:25.626649	
2	2026-07-23 10:36:40.876674+00	2026-07-29 07:58:57.835717+00	\N	3	Sakit	2026-07-24	2026-07-24	nggak enak badan	http://localhost:9000/golan-attendance/leave-3173072812041001-1784803000.jpeg	Rejected	1	2026-07-29 14:58:57.829059	
8	2026-07-29 08:40:00.647805+00	2026-07-29 08:40:00.647805+00	\N	2	Cuti	2026-08-03	2026-08-06	mau izin cuti touring ke yogyakarta		Pending	\N	\N	
9	2026-07-30 02:03:14.801702+00	2026-07-30 02:07:02.687698+00	\N	2	Cuti	2026-08-23	2026-08-26	saya mau touring		Approved	1	2026-07-30 09:07:02.679893	
10	2026-07-30 03:52:52.211087+00	2026-07-30 03:55:28.864482+00	\N	13	Sakit	2026-07-22	2026-07-31	hguyguytufu	http://localhost:9000/golan-attendance/leave-3173072812041006-1785383572.pdf	Approved	14	2026-07-30 10:55:28.861865	
11	2026-07-30 06:16:55.777218+00	2026-07-30 06:17:58.492357+00	\N	2	Cuti	2026-07-29	2026-07-30	jugyu	http://localhost:9000/golan-attendance/leave-3215642311567952-1785392215.png	Approved	1	2026-07-30 13:17:58.48325	
7	2026-07-29 08:16:37.506644+00	2026-07-30 07:18:22.928069+00	\N	1	Lainnya	2026-07-25	2026-08-27	saya mau ada acara nikahan 	http://localhost:9000/golan-attendance/leave-3173072812041002-1785312997.png	Approved	15	2026-07-30 14:18:22.92536	
6	2026-07-29 08:14:39.410791+00	2026-07-30 07:18:24.167904+00	\N	1	Sakit	2026-07-25	2026-07-26	Saya sakit mencret mecret 	http://localhost:9000/golan-attendance/leave-3173072812041002-1785312879.png	Approved	15	2026-07-30 14:18:24.165846	
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_settings (id, created_at, updated_at, deleted_at, tipe_notifikasi, role, is_email_enabled, is_in_app_enabled) FROM stdin;
1	2026-07-21 15:37:22.672795+00	2026-07-21 15:37:22.672795+00	\N	Pengajuan Izin	HRD	t	t
2	2026-07-21 15:37:22.677042+00	2026-07-21 15:37:22.677042+00	\N	Status Pengajuan	Karyawan	t	t
3	2026-07-21 15:37:22.68003+00	2026-07-21 15:37:22.68003+00	\N	Keterlambatan	HRD	t	t
4	2026-07-21 15:37:22.682994+00	2026-07-21 15:37:22.682994+00	\N	Kehadiran WFH	HRD	t	t
6	2026-07-24 04:27:11.072363+00	2026-07-24 04:27:11.072363+00	\N	Info Admin	Karyawan	t	t
7	2026-07-24 04:27:11.085591+00	2026-07-24 04:27:11.085591+00	\N	Info Admin	HRD	t	t
9	2026-07-29 03:23:56.225274+00	2026-07-29 03:23:56.225274+00	\N	Info Admin	MAGANG	t	t
10	2026-07-29 03:23:56.228544+00	2026-07-29 03:23:56.228544+00	\N	Info Admin	MANAJER	t	t
11	2026-07-29 03:23:56.23307+00	2026-07-29 03:23:56.23307+00	\N	Persetujuan Izin Tim	MANAJER	t	t
12	2026-07-29 03:23:56.236383+00	2026-07-29 03:23:56.236383+00	\N	Status Pengajuan	MAGANG	t	t
13	2026-07-29 03:23:56.23835+00	2026-07-29 03:23:56.23835+00	\N	Status Pengajuan	MANAJER	t	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, created_at, updated_at, deleted_at, user_id, judul, pesan, status_baca, waktu) FROM stdin;
1	2026-07-23 05:36:21.639899+00	2026-07-23 05:36:21.639899+00	\N	1	Kehadiran WFH	EMP-001 melakukan check-in 23 Jul 2026 12:36	f	2026-07-23 05:36:21.639899+00
3	2026-07-23 07:27:08.940478+00	2026-07-23 07:27:08.940478+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari EMP-001	f	2026-07-23 07:27:08.939187+00
4	2026-07-23 07:28:33.928545+00	2026-07-23 07:29:45.299163+00	\N	2	Status Pengajuan Izin	Pengajuan Sakit Anda telah Approved	t	2026-07-23 07:28:33.928545+00
5	2026-07-23 09:54:38.480805+00	2026-07-23 09:54:38.480805+00	\N	1	Karyawan Terlambat	3173072812041001 melakukan check-in terlambat pada 23 Jul 2026 16:54	f	2026-07-23 09:54:38.480805+00
6	2026-07-23 09:54:38.483951+00	2026-07-23 09:54:38.483951+00	\N	1	Kehadiran WFH	3173072812041001 melakukan check-in 23 Jul 2026 16:54	f	2026-07-23 09:54:38.483951+00
7	2026-07-23 10:36:40.912082+00	2026-07-23 10:36:40.912082+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari 3173072812041001	f	2026-07-23 10:36:40.910935+00
8	2026-07-24 03:31:50.6369+00	2026-07-24 03:31:50.6369+00	\N	1	Karyawan Terlambat	3173072812041001 melakukan check-in terlambat pada 24 Jul 2026 10:31	f	2026-07-24 03:31:50.636299+00
9	2026-07-24 03:31:50.648234+00	2026-07-24 03:31:50.648234+00	\N	1	Kehadiran WFH	3173072812041001 melakukan check-in 24 Jul 2026 10:31	f	2026-07-24 03:31:50.646979+00
2	2026-07-23 07:12:52.010917+00	2026-07-24 04:18:37.279833+00	\N	1	Karyawan Terlambat	3215642311567952 melakukan check-in terlambat pada 23 Jul 2026 14:12	t	2026-07-23 07:12:52.009736+00
10	2026-07-24 04:27:38.864762+00	2026-07-24 04:27:38.864762+00	\N	3	Tes pengumuman	Pengumuman dari admin	f	2026-07-24 04:27:38.862373+00
13	2026-07-24 04:29:53.014141+00	2026-07-24 04:29:53.014141+00	\N	3	pembahasan magang	tes	f	2026-07-24 04:29:53.012391+00
14	2026-07-24 04:29:53.035302+00	2026-07-24 04:30:36.805511+00	\N	4	pembahasan magang	tes	t	2026-07-24 04:29:53.034661+00
11	2026-07-24 04:27:38.88317+00	2026-07-27 01:35:53.725442+00	\N	4	Tes pengumuman	Pengumuman dari admin	t	2026-07-24 04:27:38.882066+00
17	2026-07-27 04:57:49.731432+00	2026-07-27 10:32:11.741964+00	\N	1	Kehadiran WFH	3173072812041001 melakukan check-in 27 Jul 2026 11:57	t	2026-07-27 04:57:49.730896+00
18	2026-07-27 10:57:11.994863+00	2026-07-27 10:57:11.994863+00	\N	1	Laporan Kerja Baru	Ada laporan kerja baru dari DEVAN LESMANA RICHARDO pada tanggal 27-07-2026	f	2026-07-27 10:57:11.994863+00
19	2026-07-27 11:45:41.971171+00	2026-07-27 11:45:41.971171+00	\N	1	Laporan Kerja Baru	Ada laporan kerja baru dari Muhammad Fakhri Robbani pada tanggal 27-07-2026	f	2026-07-27 11:45:41.971171+00
20	2026-07-28 02:37:26.560457+00	2026-07-28 02:37:26.560457+00	\N	1	Karyawan Terlambat	3173072812041001 melakukan check-in terlambat pada 28 Jul 2026 09:37	f	2026-07-28 02:37:26.559304+00
16	2026-07-27 04:57:49.724972+00	2026-07-29 01:14:53.812886+00	\N	1	Karyawan Terlambat	3173072812041001 melakukan check-in terlambat pada 27 Jul 2026 11:57	t	2026-07-27 04:57:49.724972+00
23	2026-07-29 03:50:45.022687+00	2026-07-29 03:50:45.022687+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari 3273010101010003	f	2026-07-29 03:50:45.021915+00
24	2026-07-29 03:50:45.02674+00	2026-07-29 03:50:45.02674+00	\N	10	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari 3273010101010003	f	2026-07-29 03:50:45.026214+00
25	2026-07-29 03:51:36.03318+00	2026-07-29 03:51:36.03318+00	\N	13	Status Logbook Diperbarui	Logbook harian Anda telah diperbarui menjadi approved	f	2026-07-29 03:51:36.032359+00
26	2026-07-29 03:51:36.051279+00	2026-07-29 03:51:36.051279+00	\N	13	Status Pengajuan Izin	Pengajuan Sakit Anda telah Approved	f	2026-07-29 03:51:36.051279+00
27	2026-07-29 03:54:30.89855+00	2026-07-29 03:54:30.89855+00	\N	1	Karyawan Terlambat	3273010101010003 melakukan check-in terlambat pada 29 Jul 2026 10:54	f	2026-07-29 03:54:30.89855+00
28	2026-07-29 03:55:06.525614+00	2026-07-29 03:55:06.525614+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Izin baru dari 3273010101010001	f	2026-07-29 03:55:06.525614+00
29	2026-07-29 03:55:06.562655+00	2026-07-29 03:55:06.562655+00	\N	10	Pengajuan Izin Baru	Ada pengajuan Izin baru dari 3273010101010001	f	2026-07-29 03:55:06.560958+00
30	2026-07-29 03:55:07.167973+00	2026-07-29 03:55:07.167973+00	\N	11	Status Pengajuan Izin	Pengajuan Izin Anda telah Rejected	f	2026-07-29 03:55:07.167973+00
31	2026-07-29 04:19:28.248895+00	2026-07-29 04:19:28.248895+00	\N	1	Karyawan Terlambat	3173072812041028 melakukan check-in terlambat pada 29 Jul 2026 11:19	f	2026-07-29 04:19:28.248895+00
32	2026-07-29 04:45:46.284644+00	2026-07-29 04:45:46.284644+00	\N	1	Karyawan Terlambat	3173072812041007 melakukan check-in terlambat pada 29 Jul 2026 11:45	f	2026-07-29 04:45:46.284644+00
34	2026-07-29 04:57:35.147589+00	2026-07-29 04:57:35.147589+00	\N	1	Karyawan Terlambat	3173072812041006 melakukan check-in terlambat pada 29 Jul 2026 11:57	f	2026-07-29 04:57:35.147589+00
36	2026-07-29 05:33:19.014208+00	2026-07-29 05:33:19.014208+00	\N	10	Pengajuan Izin Baru	Ada pengajuan Cuti baru dari 3273010101010002	f	2026-07-29 05:33:19.01367+00
37	2026-07-29 05:34:34.034036+00	2026-07-29 07:02:43.814903+00	\N	1	Laporan Kerja Baru	Ada laporan kerja baru dari QA ANGGOTA DUA 20260729102456 pada tanggal 28-07-2026	t	2026-07-29 05:34:34.033531+00
35	2026-07-29 05:33:19.010249+00	2026-07-29 07:02:45.906429+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Cuti baru dari 3273010101010002	t	2026-07-29 05:33:19.010249+00
33	2026-07-29 04:52:12.039461+00	2026-07-29 07:02:56.115218+00	\N	1	Karyawan Terlambat	3173072812041011 melakukan check-in terlambat pada 29 Jul 2026 11:52	t	2026-07-29 04:52:12.038953+00
38	2026-07-29 07:37:48.775038+00	2026-07-29 07:37:48.775038+00	\N	11	Event Perusahaan Baru	Ada event perusahaan baru: pembahasan magang	f	2026-07-29 07:37:48.773488+00
39	2026-07-29 07:37:48.788249+00	2026-07-29 07:37:48.788249+00	\N	12	Event Perusahaan Baru	Ada event perusahaan baru: pembahasan magang	f	2026-07-29 07:37:48.785777+00
42	2026-07-29 07:37:48.834029+00	2026-07-29 07:37:48.834029+00	\N	3	Event Perusahaan Baru	Ada event perusahaan baru: pembahasan magang	f	2026-07-29 07:37:48.832391+00
21	2026-07-29 01:00:42.356652+00	2026-07-29 07:41:36.614934+00	\N	4	Status Laporan Diperbarui	Laporan kerja Anda tanggal 28-07-2026 telah diperbarui menjadi: Tidak Sesuai	t	2026-07-29 01:00:42.355168+00
22	2026-07-29 01:00:47.603555+00	2026-07-29 07:41:36.614934+00	\N	4	Status Laporan Diperbarui	Laporan kerja Anda tanggal 28-07-2026 telah diperbarui menjadi: Sesuai	t	2026-07-29 01:00:47.601656+00
40	2026-07-29 07:37:48.802981+00	2026-07-29 07:41:36.614934+00	\N	4	Event Perusahaan Baru	Ada event perusahaan baru: pembahasan magang	t	2026-07-29 07:37:48.799561+00
43	2026-07-29 07:58:25.676087+00	2026-07-29 07:58:25.676087+00	\N	12	Status Pengajuan Izin	Pengajuan Cuti Anda telah Approved	f	2026-07-29 07:58:25.676087+00
44	2026-07-29 07:58:57.840502+00	2026-07-29 07:58:57.840502+00	\N	4	Status Pengajuan Izin	Pengajuan Sakit Anda telah Rejected	f	2026-07-29 07:58:57.840502+00
12	2026-07-24 04:27:38.890475+00	2026-07-29 08:12:32.188117+00	\N	2	Tes pengumuman	Pengumuman dari admin	t	2026-07-24 04:27:38.889372+00
15	2026-07-24 04:29:53.04458+00	2026-07-29 08:12:32.188117+00	\N	2	pembahasan magang	tes	t	2026-07-24 04:29:53.043892+00
41	2026-07-29 07:37:48.821764+00	2026-07-29 08:12:32.188117+00	\N	2	Event Perusahaan Baru	Ada event perusahaan baru: pembahasan magang	t	2026-07-29 07:37:48.818301+00
45	2026-07-29 08:14:39.434948+00	2026-07-29 08:14:57.870159+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari 3173072812041002	t	2026-07-29 08:14:39.433993+00
46	2026-07-29 08:16:37.523541+00	2026-07-29 08:16:37.523541+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Lainnya baru dari 3173072812041002	f	2026-07-29 08:16:37.522137+00
47	2026-07-29 08:40:00.674696+00	2026-07-29 08:40:00.674696+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Cuti baru dari 3215642311567952	f	2026-07-29 08:40:00.674126+00
48	2026-07-30 02:02:12.29757+00	2026-07-30 02:02:12.29757+00	\N	1	Check-In Karyawan	3215642311567952 melakukan check-in pada 30 Jul 2026 09:02 (Dinas Luar)	f	2026-07-30 02:02:12.296043+00
49	2026-07-30 02:03:14.840981+00	2026-07-30 02:06:40.779168+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Cuti baru dari 3215642311567952	t	2026-07-30 02:03:14.840467+00
50	2026-07-30 02:07:02.73442+00	2026-07-30 02:07:02.73442+00	\N	3	Status Pengajuan Izin	Pengajuan Cuti Anda telah Approved	f	2026-07-30 02:07:02.73442+00
51	2026-07-30 02:25:15.313011+00	2026-07-30 02:25:15.313011+00	\N	1	Karyawan Terlambat	3173072812041028 melakukan check-in terlambat pada 30 Jul 2026 09:25	f	2026-07-30 02:25:15.311643+00
52	2026-07-30 02:46:17.080873+00	2026-07-30 02:46:17.080873+00	\N	1	Karyawan Terlambat	3173072812041002 melakukan check-in terlambat pada 30 Jul 2026 09:46	f	2026-07-30 02:46:17.079494+00
53	2026-07-30 03:36:39.284152+00	2026-07-30 03:36:39.284152+00	\N	1	Laporan Kerja Baru	Ada laporan kerja baru dari manager1 pada tanggal 30-07-2026	f	2026-07-30 03:36:39.283643+00
54	2026-07-30 03:51:43.671057+00	2026-07-30 03:51:43.671057+00	\N	1	Karyawan Terlambat	3173072812041011 melakukan check-in terlambat pada 30 Jul 2026 10:51	f	2026-07-30 03:51:43.671057+00
55	2026-07-30 03:52:10.9371+00	2026-07-30 03:52:10.9371+00	\N	1	Karyawan Terlambat	3173072812041006 melakukan check-in terlambat pada 30 Jul 2026 10:52	f	2026-07-30 03:52:10.936593+00
56	2026-07-30 03:52:52.221574+00	2026-07-30 03:52:52.221574+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Sakit baru dari 3173072812041006	f	2026-07-30 03:52:52.221574+00
57	2026-07-30 03:55:28.898675+00	2026-07-30 03:55:28.898675+00	\N	16	Status Pengajuan Izin	Pengajuan Sakit Anda telah Approved	f	2026-07-30 03:55:28.898675+00
58	2026-07-30 06:16:55.805239+00	2026-07-30 06:16:55.805239+00	\N	1	Pengajuan Izin Baru	Ada pengajuan Cuti baru dari 3215642311567952	f	2026-07-30 06:16:55.803956+00
59	2026-07-30 06:17:58.519623+00	2026-07-30 06:17:58.519623+00	\N	3	Status Pengajuan Izin	Pengajuan Cuti Anda telah Approved	f	2026-07-30 06:17:58.519623+00
60	2026-07-30 07:18:22.984153+00	2026-07-30 07:18:22.984153+00	\N	2	Status Pengajuan Izin	Pengajuan Lainnya Anda telah Approved	f	2026-07-30 07:18:22.984153+00
61	2026-07-30 07:18:24.171895+00	2026-07-30 07:18:24.171895+00	\N	2	Status Pengajuan Izin	Pengajuan Sakit Anda telah Approved	f	2026-07-30 07:18:24.171895+00
62	2026-07-30 07:46:05.529549+00	2026-07-30 07:46:05.529549+00	\N	11	Event Perusahaan Baru	Ada event perusahaan baru: jgfyuut	f	2026-07-30 07:46:05.529024+00
63	2026-07-30 07:46:05.532987+00	2026-07-30 07:46:05.532987+00	\N	12	Event Perusahaan Baru	Ada event perusahaan baru: jgfyuut	f	2026-07-30 07:46:05.532407+00
64	2026-07-30 07:46:05.537215+00	2026-07-30 07:46:05.537215+00	\N	3	Event Perusahaan Baru	Ada event perusahaan baru: jgfyuut	f	2026-07-30 07:46:05.536689+00
65	2026-07-30 07:46:05.540579+00	2026-07-30 07:46:05.540579+00	\N	4	Event Perusahaan Baru	Ada event perusahaan baru: jgfyuut	f	2026-07-30 07:46:05.540034+00
66	2026-07-30 14:56:05.042907+00	2026-07-30 14:56:05.042907+00	\N	1	Check-In Karyawan	3173072812041007 melakukan check-in pada 30 Jul 2026 21:56 (Dinas Luar)	f	2026-07-30 14:56:05.042334+00
\.


--
-- Data for Name: office_locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.office_locations (id, created_at, updated_at, deleted_at, nama_lokasi, latitude, longitude, radius_meter, alamat, google_maps_url) FROM stdin;
1	2026-07-21 04:54:39.83261+00	2026-07-21 04:54:39.83261+00	\N	Kantor Pusat PT. Golan Digital Kreatif	-6.1202471	106.7118952	100	Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat	\N
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, created_at, updated_at, deleted_at, kode, nama, deskripsi) FROM stdin;
1	2026-07-21 15:37:22.600447+00	2026-07-21 15:37:22.600447+00	\N	employee.view	Lihat data karyawan	Melihat daftar dan detail karyawan
2	2026-07-21 15:37:22.61436+00	2026-07-21 15:37:22.61436+00	\N	employee.manage	Kelola data karyawan	Menambah, mengubah, menghapus, dan import karyawan
3	2026-07-21 15:37:22.623681+00	2026-07-21 15:37:22.623681+00	\N	leave.approve	Approval izin/cuti	Memproses pengajuan izin dan cuti
4	2026-07-21 15:37:22.63366+00	2026-07-21 15:37:22.63366+00	\N	attendance.report	Rekap absensi	Melihat dan mengekspor rekap absensi
5	2026-07-21 15:37:22.643016+00	2026-07-21 15:37:22.643016+00	\N	organization.manage	Kelola organisasi	Mengelola departemen dan jabatan
6	2026-07-21 15:37:22.65082+00	2026-07-21 15:37:22.65082+00	\N	settings.manage	Pengaturan sistem	Mengelola lokasi, shift, hari libur, dan tipe kerja
7	2026-07-21 15:37:22.659952+00	2026-07-21 15:37:22.659952+00	\N	quota.manage	Kuota izin/cuti	Mengelola kuota izin dan cuti karyawan
8	2026-07-29 03:23:56.171436+00	2026-07-29 03:23:56.171436+00	\N	team.attendance	Absensi tim	Melihat absensi anggota tim sendiri
9	2026-07-29 03:23:56.182044+00	2026-07-29 03:23:56.182044+00	\N	team.reports	Laporan tim	Melihat laporan dan logbook anggota tim sendiri
10	2026-07-29 03:23:56.192039+00	2026-07-29 03:23:56.192039+00	\N	team.leave.approve	Approval izin tim	Approve/reject izin anggota tim sendiri
11	2026-07-29 03:23:56.201928+00	2026-07-29 03:23:56.201928+00	\N	internship.logbook	Logbook magang	Mengelola logbook harian peserta magang
12	2026-07-29 03:23:56.211489+00	2026-07-29 03:23:56.211489+00	\N	internship.certificate	Sertifikat magang	Mengunduh sertifikat setelah periode selesai
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.positions (id, created_at, updated_at, deleted_at, nama_jabatan, deskripsi) FROM stdin;
1	2026-07-21 04:54:39.956605+00	2026-07-27 10:22:03.725106+00	\N	Manager	Manager IT\n
2	2026-07-27 10:46:39.359262+00	2026-07-29 00:51:26.793354+00	\N	Karyawan	tes
3	2026-07-27 12:04:39.8075+00	2026-07-29 00:52:09.019214+00	\N	Magang	p
4	2026-07-29 07:29:16.609733+00	2026-07-29 07:29:16.609733+00	2026-07-29 07:29:37.340346+00	hjvjhvajs	
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.push_subscriptions (id, created_at, updated_at, deleted_at, user_id, endpoint, p256dh, auth) FROM stdin;
8	2026-07-27 01:47:55.985709+00	2026-07-27 01:50:35.112593+00	2026-07-27 04:57:50.038631+00	1	https://fcm.googleapis.com/fcm/send/d1sNRFppaUk:APA91bHiPUe3Au7niBAEu7VNRgmESlgWyY-9N4KIq3bqOdaSUo8uW98ZKrVh9DvHlBGfMhodVhFbRt8Iwsm7Sr5rowGp3c7WAX3UwVteaaNmElDnAfExN99MP1WbplDYEpMEz-9qXyIs	BBkAis4hBQg4_PzZYrUxzDqNHXCKUMzy62_q4NAeB199-7qoew_qN8THjEG3qmK4rDzFWuZuIcAmM_ALVtTYI5Y	G8Ud_niTyik3WAWf_Z0JkQ
1	2026-07-24 04:30:32.9344+00	2026-07-24 04:46:27.655001+00	2026-07-27 04:57:50.094917+00	1	https://fcm.googleapis.com/fcm/send/eZEqsjSkrT4:APA91bHXz_9lRokRoV-rBJV5z3aLDsgQvLKOA4AtbJaV4oHupFbJrJBrNi9mzhaxz2pXbuz1TY32P1h_YxfnzW51h-n6e4vXOAnLVXMJewAmpNAVhJaGfQ6lTgK3RGMOz40zj3B3Dy1q	BPLnXTlEDobIWq-93IxyJQI7szxCZQeIj0WUsN3Ig8Eaq3Hv-zsDhd8SSD9q3RSqH_PRYuQSabeNkq7UJGwU5Ws	uqhqL1tupoCPFKBWGW4NFw
2	2026-07-24 04:48:31.993988+00	2026-07-24 05:42:20.355727+00	2026-07-29 01:00:42.679707+00	4	https://fcm.googleapis.com/fcm/send/cg_wFEiXFPM:APA91bEQ7PCLmxsBq7AarU2P1GdXLgCI3sFhrlVunbLsU3MqSjyR-hrd3icYPg7DMuEfK2pJbqt7U9LygAZst3MSKIidvfjcsfw4lQl2QpfFlGYgzJ1THhb0VFX_zLGDmQY3Gwu0Vc7f	BHCpjITmIvyKpQlWOIxSa0UdtbqU3Sp2FuozSYJp2Eq9ALDwtP3cJwwh4Qiy07FIe_byyM3YNEt9HVmE720F7fw	OMyLyiZ3q_dnOtuNvFzVNQ
5	2026-07-24 06:10:25.756754+00	2026-07-24 06:15:16.164836+00	2026-07-29 01:00:42.768932+00	4	https://fcm.googleapis.com/fcm/send/d6fb2dMTi9U:APA91bFLBk32V1mjB1bCzXwP352r1bJUP012fofv1afSBCIYqaPYeWWJbiloa8aVdGX7Rz6UuPt_xzjxc2TyOuS74QrZQebk9I3Yw84TJ3VnviANk17wjZHYY6l5Fs-eIzIWXttSyYmH	BK0d8HqJUuUpS7fTMS-Kaz246bcFube1AgPKU0mNunVO_tsDMFGE6WiEKMJkXho8dd9jwkom8MgSpvj4nNJ05ec	dl41IhlhWVwGbs9ITcgMSQ
7	2026-07-24 09:22:43.500756+00	2026-07-27 01:39:48.302067+00	2026-07-29 01:00:42.853368+00	4	https://fcm.googleapis.com/fcm/send/cFVe-GBkW50:APA91bEty17RNXraHC3gJitnJPcHCCOoitnshou3TUsNjA8Ceki6VN4q0nrOSB7kU9MtcJZ7gqUI2I3yhCou05Gc7Zer4U7iq-pcesz_x_XkEVvkmCe1O0zzV6y35jrWUPzmsfBM8k1C	BFAudi1D49noaH_mGnbzJ-dYufRVowbR2cB-MdsuAfPuhyVwKctlI-LJcnsCzRteeukxTI16waNUqceYPPHYGR4	GfYdg_UTypO-nuG4v2Hmyw
3	2026-07-24 06:01:32.429536+00	2026-07-24 06:01:32.429536+00	2026-07-27 04:57:50.157769+00	1	https://fcm.googleapis.com/fcm/send/fMBNM7yrygE:APA91bEVUKJu3CuktzXxl5YmQp2SWU5FXftcgCk4fAuPqmwN5mCriRGiFJ24UYaReInfbbXkWw6ob92wVcCr7JfIC9bRtLXnrp1p2yjGg-Zl4107R3k3kc4mGkc6cqAsPkaW8FxD6bGe	BE6xoGlI9FLcgklhaP8pZ2yuk79PJ9hCrTCpXtm0iyU-BrHRaBPMiGOc1cRtkaC_Bkc5FpByccGDudNIBgv2Lio	_AYKJJj6pSNEr6XBDu8acA
4	2026-07-24 06:06:14.814481+00	2026-07-24 06:06:47.441788+00	2026-07-27 04:57:50.226989+00	1	https://fcm.googleapis.com/fcm/send/dbuT7jbDelc:APA91bE8Cqwo006yk3Oa53jg65tOK-jRWyn0nSj_eSYrNRpQ3-o59u1JY31J6bZtZbFLphKleO4VOKNMbByN1aM0dljtAQUMH8E9uFQkAjUIj0cgLbdCGhw0qn4KpqGHTKC9aiGtwhh4	BNk1uA7cKAeP4M1GiXvs2_kyePfJ2K5tntxNOODprhXNIEKh5u_8AX80lJNNt3ntcUSitRyHfvdF9w0VwaZDMkg	BepoyboGIs7Uk1TD_vjodw
6	2026-07-24 06:49:43.086495+00	2026-07-24 09:22:27.906558+00	2026-07-27 04:57:50.333344+00	1	https://fcm.googleapis.com/fcm/send/fxdDzIwKvKs:APA91bEv_jX0IYnz3TyKxpAL_tOLb6ymOh_fC0EZkgMjBtbzJPggeN-6WdAH2xj9HsXQ0TgvewkddLFbKIMo0TnG1xfepJy2uV561RFJob5e6iPbW7f49C5-ZpAdF098WBXgkfbd6RCa	BIEkSIR5wTNMFX4KV5Nkw6VP8Ls3AI3RMAZISELfxzmVQYyekOhFJYsEv6SrTVnElB-j5fTgzAz5_1TkmgbHE9Y	rc4Jz3ciltYyXSNaK9nQHg
15	2026-07-27 14:55:13.483673+00	2026-07-29 04:57:29.744595+00	2026-07-30 03:55:29.051476+00	16	https://fcm.googleapis.com/fcm/send/e0WEQf6mWnU:APA91bFhh4z8ehFxQ_F-2st4z89fyOBTAjxEcfS5dC6HbR8_PRwAY80QfTImj18DmuE29drKxSOKjFwjBtMeg5awNOdB8NoFI9lhlY7b43ujgKNipzwOJdadi2WgAkrq3V8DggBzPTmU	BFyBm8xai8zr3pHLQftQA5sT_c6v1aoGCXqj8E831Jh4COiIFQI2HVb8Sui8AwXe5aknQmJdEQOD8oDbTAOAT2g	AMCybMShqHB2tCIzzdL8fg
14	2026-07-27 05:08:40.47531+00	2026-07-27 13:29:53.66984+00	2026-07-28 02:37:27.153451+00	1	https://fcm.googleapis.com/fcm/send/c2dHngMgoIc:APA91bF5DTGybkHuzEyTo_90IJuHNsowjJMNt1qZQjrZ9FvTGd2pVcijHXIq7mE2vWIU2gA0QvTTp-ayAcChELx9dGGvzksPjDqQir8a-8lnqOgfuxVT-dMtP5GUfMvU_L8MfRW_SinX	BIhJzTUXTd0Y0WyJDd0m5WxxxRg-f_Xat2ppMJZ5MURfA-mNNZZYQAZB8KKfF3XYxt_lXGKj3_WH7eMCRIPVZFc	UHfGetT_a6IVQsHw_9pPCw
13	2026-07-27 04:07:26.151914+00	2026-07-27 04:35:54.892928+00	2026-07-29 01:00:43.011225+00	4	https://fcm.googleapis.com/fcm/send/cChOz0fWZ9o:APA91bGpuCIIU9bAv1uWDKBwhuRK1q6ctrJLwknqri5llirFqiUIVcgLNTcjc45OWDLPQ0JdURfh2TQIfAJs6vhxPuKv93pEHY7wU4SsYutesmRXb3tPsv84yZrf-UPbwlDFRBUfnZLA	BFLsjFQ-IqiR3RoNzvHsYOcm6BgefKvpFI-1cWHshMswHDt5ev-s9hml8KLnGiqBRQDkx-6u2BWGpX6Bx0e77NA	o_CVGAttf5BmYCzp34hf5g
10	2026-07-27 02:03:13.655386+00	2026-07-27 02:10:47.656238+00	2026-07-29 01:00:43.090832+00	4	https://fcm.googleapis.com/fcm/send/cMBgiOab4GE:APA91bF3kgkHdtcIl5cDmIsCLfO2inCSHHAGkU_gEHfQnV4ytXVE4S4QFcK395vx1ehzZ98qOBR0rSPePs9axbe988iOkOlzaVLGZ1U7LtF_CNB-y2SSiy1INToC4tW-e4oOC5EEkcpg	BLKKGYvgx_ePWoZMxDIlER7HU87ToNn5e79iSQ8FnXEJaiWX0osgSKsIETlT-P62d_EhoYzUMRGn0xvG2WEGdOM	gjFfySJwDZ7gPk_yi6grMA
16	2026-07-29 07:01:46.593452+00	2026-07-30 15:04:04.710839+00	\N	1	https://fcm.googleapis.com/fcm/send/c6ItC_64p9U:APA91bHPBCit8O57iXcnM9mFNDinXTUKmDOMYXl3QK4GISsm84aPQ3WAQ3qf22qPQVdk7LJzSgvuqnE-sg-_avhbbNX80GKCgtVqnnj_x34GcDsySww5b1aEMz-zGfePiXzJdIOw4o6f	BLaMZ_Cfx5Kin-wOluQ1Z73zeQx7LRjIrUJ-E0wLW_rWssOjoIHmoWNeYO6AEDtAxIunypz9zmiijDtPtu5Ieww	R3MWlDQqqwBj5ZQq-oWCow
11	2026-07-27 03:09:55.477527+00	2026-07-27 03:09:55.477527+00	2026-07-27 04:57:50.416016+00	1	https://fcm.googleapis.com/fcm/send/feSTyHNMPbA:APA91bG1K8yH9zIQrlx_JEXV__33iIvG-nr3tVIOMrPKpOp4XONnCwQ65J2j2CF8qpOyYpsddoeJF7yyGG_V-MIzoS7CxzDgJSJDmDHiBwtmnsFesqhgiHuFJKUlOPaq0j3Fdh0IzAiI	BEnF47hyG7dQ5GpiipxK-UqEivjdF_cb1VzUUCk6cn7jHdCT24IVEfuX2g_BzP_gKhjsakIGTGc0kW5rdLCh7KU	nLz_Y-LjdUiw6w66sNtMgQ
12	2026-07-27 03:18:17.80306+00	2026-07-27 03:18:17.80306+00	2026-07-27 04:57:50.511443+00	1	https://fcm.googleapis.com/fcm/send/deB31s_gMNA:APA91bEbaYud42TO0IEbHPCZh_GNWLTMZKI2whFyBOK0h1o2zF8ucYuAOi4vZSmNM_cOLLjO5VipN6jJv_jAn6afUH9Ga9XGhRb35zun4W4QeVGkChJB20eWaNphQEFxMkaNVPuPS3dJ	BIrkVVS4QOJEpnb2Lg1FSCXN74AI6pkGUzk9D03WWRZHSTRbdh_shgXTLozg--fetff1NHHoFfVNj3KVKdllI4k	ZdNMHwaa3a5DEKbHTQZPdA
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, created_at, updated_at, deleted_at, role, permission_id, diizinkan) FROM stdin;
30	2026-07-29 03:23:56.198781+00	2026-07-30 06:45:54.068966+00	\N	MANAJER	10	t
31	2026-07-29 03:23:56.203968+00	2026-07-30 06:45:54.069916+00	\N	HRD	11	t
33	2026-07-29 03:23:56.208732+00	2026-07-30 06:45:54.071301+00	\N	MANAJER	11	t
34	2026-07-29 03:23:56.213465+00	2026-07-30 06:45:54.072166+00	\N	HRD	12	t
36	2026-07-29 03:23:56.218754+00	2026-07-30 06:45:54.073881+00	\N	MANAJER	12	t
1	2026-07-21 15:37:22.607961+00	2026-07-30 06:45:54.074385+00	\N	HRD	1	t
3	2026-07-21 15:37:22.617104+00	2026-07-30 06:45:54.075974+00	\N	HRD	2	t
5	2026-07-21 15:37:22.626063+00	2026-07-30 06:45:54.078073+00	\N	HRD	3	t
7	2026-07-21 15:37:22.636164+00	2026-07-30 06:45:54.079583+00	\N	HRD	4	t
9	2026-07-21 15:37:22.645481+00	2026-07-30 06:45:54.048018+00	\N	HRD	5	t
11	2026-07-21 15:37:22.653426+00	2026-07-30 06:45:54.05222+00	\N	HRD	6	t
13	2026-07-21 15:37:22.662605+00	2026-07-30 06:45:54.053611+00	\N	HRD	7	t
15	2026-07-29 03:23:56.142396+00	2026-07-30 06:45:54.055665+00	\N	MANAJER	1	t
16	2026-07-29 03:23:56.148416+00	2026-07-30 06:45:54.056503+00	\N	MANAJER	2	t
17	2026-07-29 03:23:56.152878+00	2026-07-30 06:45:54.057308+00	\N	MANAJER	3	t
18	2026-07-29 03:23:56.15708+00	2026-07-30 06:45:54.057812+00	\N	MANAJER	4	t
19	2026-07-29 03:23:56.160725+00	2026-07-30 06:45:54.058608+00	\N	MANAJER	5	t
20	2026-07-29 03:23:56.164442+00	2026-07-30 06:45:54.059409+00	\N	MANAJER	6	t
21	2026-07-29 03:23:56.168302+00	2026-07-30 06:45:54.060565+00	\N	MANAJER	7	t
22	2026-07-29 03:23:56.174516+00	2026-07-30 06:45:54.061069+00	\N	HRD	8	t
24	2026-07-29 03:23:56.179166+00	2026-07-30 06:45:54.062663+00	\N	MANAJER	8	t
25	2026-07-29 03:23:56.184608+00	2026-07-30 06:45:54.063446+00	\N	HRD	9	t
27	2026-07-29 03:23:56.189284+00	2026-07-30 06:45:54.066156+00	\N	MANAJER	9	t
28	2026-07-29 03:23:56.194209+00	2026-07-30 06:45:54.066684+00	\N	HRD	10	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, created_at, updated_at, deleted_at, nama, email, password_hash, role, status, reset_password_token, reset_password_expiry, manager_id, team_id, internship_start_date, internship_end_date, mentor_name, mentor_contact, institution_name) FROM stdin;
1	2026-07-21 04:54:39.894097+00	2026-07-21 04:54:39.894097+00	\N	Super Admin	admin@golan.com	$2a$10$wftZRMwNONwwn2.TF8SmjuGe3uVKn2Z3Jdm3AhLYoJqPckWxv2EX6	HRD	aktif	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	2026-07-29 03:24:57.034099+00	2026-07-29 03:24:57.034099+00	\N	QA MANAJER E2E 20260729102456	qa.manager.20260729102456@golan.test	$2a$10$PjocywX6LldtI2/ByLq6D.lbeljp30UI/0Wl9b4rol9LjcNf.w5Qy	MANAJER	aktif		0001-01-01 00:00:00	\N	qa-team-20260729102456	\N	\N			
11	2026-07-29 03:24:57.103758+00	2026-07-29 03:24:57.103758+00	\N	QA ANGGOTA SATU 20260729102456	qa.member1.20260729102456@golan.test	$2a$10$PjocywX6LldtI2/ByLq6D.lbeljp30UI/0Wl9b4rol9LjcNf.w5Qy	Karyawan	aktif		0001-01-01 00:00:00	10		\N	\N			
12	2026-07-29 03:24:57.165287+00	2026-07-29 03:24:57.165287+00	\N	QA ANGGOTA DUA 20260729102456	qa.member2.20260729102456@golan.test	$2a$10$PjocywX6LldtI2/ByLq6D.lbeljp30UI/0Wl9b4rol9LjcNf.w5Qy	Karyawan	aktif		0001-01-01 00:00:00	10		\N	\N			
7	2026-07-24 03:34:21.280529+00	2026-07-24 03:34:21.280529+00	2026-07-24 03:34:33.620355+00	cc	cc@golan.com	$2a$10$Y/fdWvUNv9qyor5LP5Xk2.PrIqfdJnbCJwKdl1y8XkRwH13mC1ltq	Karyawan	aktif		0001-01-01 00:00:00	\N	\N	\N	\N	\N	\N	\N
3	2026-07-23 07:11:24.791217+00	2026-07-30 07:31:50.946023+00	\N	IRVAN SABILAL	irvan@gmail.com	$2a$10$eTWsiI94mVWMD44QNviyeOuvPHFRJ/OSVOdPwBHiEKLp7G7rAmqQq	Karyawan	aktif		0001-01-01 00:00:00	15	Project-Absensi	\N	\N			
9	2026-07-29 02:52:52.186077+00	2026-07-29 02:53:11.436032+00	\N	Kei	kei@gmail.com	$2a$10$QrsUuRUnSJW8vlQ/EsSZVeFm.riKJyIE2lREmasMOPQmXNmI8lyoa	MAGANG	aktif		0001-01-01 00:00:00	\N	\N	\N	\N	\N	\N	\N
14	2026-07-29 04:18:37.980252+00	2026-07-29 04:18:37.980252+00	\N	manager1	manager@gmail.com	$2a$10$UM3i0t.4SYHvz8vVsDPmo.dvyOntSGmhL0DcUzTHHaIdXWJjhBAPq	MANAJER	aktif		0001-01-01 00:00:00	\N	Project-Absensi	\N	\N			
15	2026-07-29 04:51:50.347377+00	2026-07-29 04:53:05.530038+00	\N	manager2	manager2@golan.com	$2a$10$/jQ8F4fRDruvrjHQkkVhIuW8pJ3MXzC/uQOX.z/yzZAsmdgE.OiOa	MANAJER	aktif		0001-01-01 00:00:00	\N	Project-Absensi	\N	\N			
16	2026-07-29 04:57:16.203011+00	2026-07-29 04:57:16.203011+00	\N	manager 3	manager3@golan.com	$2a$10$aZnEicB/MQFG4eH4j4qD.udrRMBiUl8WJcbvr75KOf56D.OG..UO6	MANAJER	aktif		0001-01-01 00:00:00	\N	Project-Absensi	\N	\N			
4	2026-07-23 09:54:05.601479+00	2026-07-30 07:09:48.982859+00	\N	DEVAN LESMANA RICHARDO	devanlesmana123@gmail.com	$2a$10$X/5zBJswCsCVv/1me4A68ePUajTih0yRIfqhYS7RoW5Pg0Rqmq0ye	Karyawan	aktif		0001-01-01 00:00:00	\N		\N	\N			
22	2026-07-29 07:34:57.271444+00	2026-07-29 07:34:57.271444+00	2026-07-29 07:36:02.284689+00	guygsau	pai@golan.com	$2a$10$13Ogn3tVkMJfokDhQLKZqe1vw12shjhaKDDdLP44goSzqnmHCWqtW	Karyawan	aktif		0001-01-01 00:00:00	\N	Project-Absensi	\N	\N			
13	2026-07-29 03:24:57.227978+00	2026-07-29 08:19:57.641211+00	\N	QA MAGANG E2E 20260729102456	qa.intern.20260729102456@golan.test	$2a$10$PjocywX6LldtI2/ByLq6D.lbeljp30UI/0Wl9b4rol9LjcNf.w5Qy	MAGANG	aktif		0001-01-01 00:00:00	10		2026-07-01	2026-08-31	QA MANAJER E2E 20260729102456	081234567890	Universitas QA
2	2026-07-21 04:54:39.956605+00	2026-07-30 07:21:28.096163+00	\N	Muhammad Fakhri Robbani	fakhri@gmail.com	$2a$10$eLu7INdNL3CUfE5/JhFvberjrK/uJoI3y3me/z8g3XfLgBZR88xri	MAGANG	aktif		0001-01-01 00:00:00	14		2026-07-22	2026-07-29	QA MANAJER E2E 20260729102456	081234567890	Universitas QA
\.


--
-- Data for Name: work_report_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_report_attachments (id, created_at, updated_at, deleted_at, work_report_id, file_url, storage_key, file_name, mime_type, file_size) FROM stdin;
1	2026-07-29 05:34:34.024928+00	2026-07-29 05:34:34.024928+00	\N	9	http://localhost:9000/golan-attendance/3273010101010002-work-report-9-1785303274008249200.png	3273010101010002-work-report-9-1785303274008249200.png	icon_golan.png	image/png	9003
2	2026-07-29 08:28:12.870664+00	2026-07-29 08:28:12.870664+00	\N	10	http://localhost:9000/golan-attendance/3173072812041002-work-report-10-1785313692834167900.jpeg	3173072812041002-work-report-10-1785313692834167900.jpeg	pas 3x4.jpeg	image/jpeg	196143
3	2026-07-29 08:30:11.330857+00	2026-07-29 08:30:11.330857+00	\N	10	http://localhost:9000/golan-attendance/3173072812041002-work-report-10-1785313811265988800.jpeg	3173072812041002-work-report-10-1785313811265988800.jpeg	pas 3x4.jpeg	image/jpeg	196143
4	2026-07-29 08:30:42.165391+00	2026-07-29 08:30:42.165391+00	\N	11	http://localhost:9000/golan-attendance/3173072812041002-work-report-11-1785313842125544700.jpeg	3173072812041002-work-report-11-1785313842125544700.jpeg	foto pas irvan.jpeg	image/jpeg	189116
5	2026-07-29 08:31:25.779473+00	2026-07-29 08:31:25.779473+00	\N	12	http://localhost:9000/golan-attendance/3173072812041002-work-report-12-1785313885737423000.jpeg	3173072812041002-work-report-12-1785313885737423000.jpeg	pas 3x4.jpeg	image/jpeg	196143
6	2026-07-30 03:36:39.273362+00	2026-07-30 03:36:39.273362+00	\N	13	http://localhost:9000/golan-attendance/3173072812041028-work-report-13-1785382599250150100.jpg	3173072812041028-work-report-13-1785382599250150100.jpg	VB Analis Program flip.jpg	image/jpeg	328620
\.


--
-- Data for Name: work_report_columns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_report_columns (id, created_at, updated_at, deleted_at, nama_kolom, tipe_input, opsi, aktif, wajib_diisi, urutan) FROM stdin;
\.


--
-- Data for Name: work_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_reports (id, created_at, updated_at, deleted_at, employee_id, tanggal, tugas, judul, deskripsi_kegiatan, realisasi_kegiatan, kendala, rencana_minggu_depan, link_artikel, catatan_tambahan, status_sesuai, validasi_oleh_hr, custom_fields, status_logbook, reviewed_by, reviewed_at, review_notes, is_late_submission) FROM stdin;
4	2026-07-27 07:15:46.454609+00	2026-07-27 07:15:46.454609+00	2026-07-27 07:19:44.255015+00	3	2026-07-27	c		c	10%						f	{}	draft	\N	\N	\N	f
3	2026-07-27 07:10:36.338179+00	2026-07-27 07:10:36.338179+00	2026-07-27 07:29:06.816974+00	3	2026-07-27	ee	s	e	10%						f	{}	draft	\N	\N	\N	f
2	2026-07-27 06:54:12.433018+00	2026-07-27 06:54:12.433018+00	2026-07-27 07:29:10.818986+00	3	2026-07-27	p		p	12%						f	{}	draft	\N	\N	\N	f
1	2026-07-27 06:48:59.82334+00	2026-07-27 07:36:26.804077+00	\N	3	2026-07-27	Perancangan struktur database sistem absensi		Menentukan tabel dan relasi data untuk karyawan, absensi, izin/cuti, jadwal kerja, serta pengguna.	50%					Sesuai	t	{}	draft	\N	\N	\N	f
6	2026-07-27 10:57:11.979676+00	2026-07-27 10:57:11.979676+00	\N	3	2026-07-27	c		v	10%						f	{}	draft	\N	\N	\N	f
7	2026-07-27 11:45:41.958062+00	2026-07-27 11:45:41.958062+00	\N	1	2026-07-27	p		s	10%						f	{}	draft	\N	\N	\N	f
5	2026-07-27 10:15:40.145274+00	2026-07-29 01:00:47.584101+00	\N	3	2026-07-28	A		S	12%					Sesuai	t	{}	draft	\N	\N	\N	f
8	2026-07-29 03:50:15.651203+00	2026-07-29 03:51:36.027766+00	\N	10	2026-07-29	QA E2E		Menguji alur logbook sampai admin		Tidak ada					f		approved	1	2026-07-29 10:51:36.024212	Review HRD QA	f
9	2026-07-29 05:34:34.002882+00	2026-07-29 05:34:34.002882+00	\N	9	2026-07-28	Verifikasi screenshot E2E		Laporan dibuat setelah batas waktu	100%						f	{}	draft	\N	\N		t
10	2026-07-29 08:28:12.821792+00	2026-07-29 08:30:11.240223+00	\N	1	2026-08-01	ui/ux		sdfsdkl		dsgsd					f		submitted	\N	\N		f
11	2026-07-29 08:30:42.111001+00	2026-07-29 08:30:42.111001+00	\N	1	2026-07-29	ui/ux		ehofe		dsnjsd					f		submitted	\N	\N		f
12	2026-07-29 08:31:25.718858+00	2026-07-29 08:31:25.718858+00	\N	1	2026-07-29	ui/ux		fdhdhdf		fdhjdgjfg					f		submitted	\N	\N		f
13	2026-07-30 03:36:39.243743+00	2026-07-30 03:36:39.243743+00	\N	11	2026-07-30	ajdsiuas	sakjgdiuad	hiuaheiasd	20%	akjsbdk	kajsbdka	ajkshdk	jbkcds		f	{}	draft	\N	\N		f
\.


--
-- Data for Name: work_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_schedules (id, created_at, updated_at, deleted_at, nama_shift, jam_mulai, jam_selesai, toleransi_terlambat_menit, hari_kerja, employee_id, tanggal) FROM stdin;
1	2026-07-21 07:07:00.781981+00	2026-07-21 07:07:00.781981+00	\N	Reguler	09:00:00	17:00:00	10	1,2,3,4,5	\N	\N
2	2026-07-23 12:51:11.708197+00	2026-07-23 12:51:11.708197+00	2026-07-23 12:51:18.457365+00	shift pago	09:00:00	17:00:00	10	1,2,3,4,5	\N	\N
5	2026-07-30 12:58:16.585638+00	2026-07-30 12:58:16.585638+00	\N	khusus	12:00:00	17:00:00	10	1,2,3,4,5	3	2026-07-30
3	2026-07-30 08:34:02.997402+00	2026-07-30 08:34:02.997402+00	2026-07-30 12:58:52.95318+00	pagi pagi	09:00:00	17:00:00	10	1,2,3,4,5	\N	\N
4	2026-07-30 08:40:46.330131+00	2026-07-30 08:40:46.330131+00	2026-07-30 12:58:57.344758+00	pagiiii	09:00:00	17:00:00	10	1,2,3,4,5	\N	\N
10	2026-07-30 13:19:42.032437+00	2026-07-30 13:19:42.032437+00	2026-07-30 13:28:49.526242+00	Reguler	09:00:00	17:00:00	10	1,2,3,4,5	\N	2026-07-30
11	2026-07-30 13:28:53.557991+00	2026-07-30 13:28:53.557991+00	2026-07-30 13:29:00.27411+00	Reguler	09:00:00	17:00:00	10	1,2,3,4,5	\N	2026-07-30
12	2026-07-30 13:38:34.454013+00	2026-07-30 13:38:34.454013+00	\N	shift malam	20:38:00	22:00:00	10	1,2,3,4,5	6	2026-07-30
\.


--
-- Data for Name: work_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_types (id, created_at, updated_at, deleted_at, nama, is_home_base, deskripsi, is_default, butuh_validasi_geofence, radius_yang_berlaku, wajib_selfie, warna_label, status_aktif) FROM stdin;
1	2026-07-21 06:15:27.437275+00	2026-07-21 06:15:27.437275+00	\N	WFO	f	\N	f	t	kantor	t	#3B82F6	t
2	2026-07-21 06:15:27.439684+00	2026-07-21 06:15:27.439684+00	\N	WFH	t	\N	f	t	kantor	t	#3B82F6	t
3	2026-07-21 06:15:27.441362+00	2026-07-21 06:15:27.441362+00	\N	Dinas Luar	f	\N	f	t	kantor	t	#3B82F6	t
\.


--
-- Name: attendance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_records_id_seq', 983, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 729, true);


--
-- Name: company_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_events_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 1, true);


--
-- Name: divisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.divisions_id_seq', 11, true);


--
-- Name: employee_home_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_home_locations_id_seq', 9, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employees_id_seq', 16, true);


--
-- Name: general_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.general_settings_id_seq', 1, true);


--
-- Name: helpdesk_contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.helpdesk_contacts_id_seq', 1, true);


--
-- Name: holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.holidays_id_seq', 2, true);


--
-- Name: internship_certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.internship_certificates_id_seq', 3, true);


--
-- Name: leave_quota_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_quota_id_seq', 4, true);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 11, true);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 13, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 66, true);


--
-- Name: office_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.office_locations_id_seq', 1, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 12, true);


--
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.positions_id_seq', 4, true);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.push_subscriptions_id_seq', 16, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 36, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 37, true);


--
-- Name: work_report_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_report_attachments_id_seq', 6, true);


--
-- Name: work_report_columns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_report_columns_id_seq', 1, false);


--
-- Name: work_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_reports_id_seq', 13, true);


--
-- Name: work_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_schedules_id_seq', 12, true);


--
-- Name: work_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_types_id_seq', 3, true);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: company_events company_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_events
    ADD CONSTRAINT company_events_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: employee_home_locations employee_home_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_home_locations
    ADD CONSTRAINT employee_home_locations_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: general_settings general_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_settings
    ADD CONSTRAINT general_settings_pkey PRIMARY KEY (id);


--
-- Name: helpdesk_contacts helpdesk_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpdesk_contacts
    ADD CONSTRAINT helpdesk_contacts_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: internship_certificates internship_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_certificates
    ADD CONSTRAINT internship_certificates_pkey PRIMARY KEY (id);


--
-- Name: leave_quota leave_quota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT leave_quota_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: office_locations office_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office_locations
    ADD CONSTRAINT office_locations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_report_attachments work_report_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_report_attachments
    ADD CONSTRAINT work_report_attachments_pkey PRIMARY KEY (id);


--
-- Name: work_report_columns work_report_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_report_columns
    ADD CONSTRAINT work_report_columns_pkey PRIMARY KEY (id);


--
-- Name: work_reports work_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT work_reports_pkey PRIMARY KEY (id);


--
-- Name: work_schedules work_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT work_schedules_pkey PRIMARY KEY (id);


--
-- Name: work_types work_types_nama_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_types
    ADD CONSTRAINT work_types_nama_key UNIQUE (nama);


--
-- Name: work_types work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_types
    ADD CONSTRAINT work_types_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_records_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_deleted_at ON public.attendance_records USING btree (deleted_at);


--
-- Name: idx_attendance_records_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_employee_id ON public.attendance_records USING btree (employee_id);


--
-- Name: idx_attendance_records_is_checkout_missing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_is_checkout_missing ON public.attendance_records USING btree (is_checkout_missing);


--
-- Name: idx_attendance_records_is_late; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_is_late ON public.attendance_records USING btree (is_late);


--
-- Name: idx_attendance_records_tipe_kerja_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_tipe_kerja_id ON public.attendance_records USING btree (tipe_kerja_id);


--
-- Name: idx_audit_logs_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_deleted_at ON public.audit_logs USING btree (deleted_at);


--
-- Name: idx_audit_logs_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_record_id ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_company_events_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_events_deleted_at ON public.company_events USING btree (deleted_at);


--
-- Name: idx_company_events_dibuat_oleh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_events_dibuat_oleh ON public.company_events USING btree (dibuat_oleh);


--
-- Name: idx_company_events_status_aktif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_events_status_aktif ON public.company_events USING btree (status_aktif);


--
-- Name: idx_company_events_tanggal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_events_tanggal ON public.company_events USING btree (tanggal);


--
-- Name: idx_departments_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_deleted_at ON public.departments USING btree (deleted_at);


--
-- Name: idx_divisions_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_divisions_deleted_at ON public.divisions USING btree (deleted_at);


--
-- Name: idx_employee_home_locations_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_home_locations_deleted_at ON public.employee_home_locations USING btree (deleted_at);


--
-- Name: idx_employee_home_locations_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employee_home_locations_employee_id ON public.employee_home_locations USING btree (employee_id);


--
-- Name: idx_employees_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_deleted_at ON public.employees USING btree (deleted_at);


--
-- Name: idx_employees_nik; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employees_nik ON public.employees USING btree (nik);


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employees_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_general_settings_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_general_settings_deleted_at ON public.general_settings USING btree (deleted_at);


--
-- Name: idx_helpdesk_contacts_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_helpdesk_contacts_deleted_at ON public.helpdesk_contacts USING btree (deleted_at);


--
-- Name: idx_holidays_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holidays_deleted_at ON public.holidays USING btree (deleted_at);


--
-- Name: idx_holidays_tanggal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_holidays_tanggal ON public.holidays USING btree (tanggal);


--
-- Name: idx_internship_certificates_certificate_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_internship_certificates_certificate_no ON public.internship_certificates USING btree (certificate_no);


--
-- Name: idx_internship_certificates_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internship_certificates_deleted_at ON public.internship_certificates USING btree (deleted_at);


--
-- Name: idx_internship_certificates_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internship_certificates_uploaded_by ON public.internship_certificates USING btree (uploaded_by);


--
-- Name: idx_internship_certificates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_internship_certificates_user_id ON public.internship_certificates USING btree (user_id);


--
-- Name: idx_leave_quota_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_quota_deleted_at ON public.leave_quota USING btree (deleted_at);


--
-- Name: idx_leave_quota_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_quota_employee_id ON public.leave_quota USING btree (employee_id);


--
-- Name: idx_leave_requests_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_deleted_at ON public.leave_requests USING btree (deleted_at);


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_notif_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_notif_role ON public.notification_settings USING btree (tipe_notifikasi, role);


--
-- Name: idx_notification_settings_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_settings_deleted_at ON public.notification_settings USING btree (deleted_at);


--
-- Name: idx_notifications_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_deleted_at ON public.notifications USING btree (deleted_at);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_office_locations_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_office_locations_deleted_at ON public.office_locations USING btree (deleted_at);


--
-- Name: idx_permissions_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_deleted_at ON public.permissions USING btree (deleted_at);


--
-- Name: idx_permissions_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_permissions_kode ON public.permissions USING btree (kode);


--
-- Name: idx_positions_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_deleted_at ON public.positions USING btree (deleted_at);


--
-- Name: idx_push_subscriptions_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_deleted_at ON public.push_subscriptions USING btree (deleted_at);


--
-- Name: idx_push_subscriptions_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions USING btree (endpoint);


--
-- Name: idx_push_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_role_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_role_permission ON public.role_permissions USING btree (role, permission_id);


--
-- Name: idx_role_permissions_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_deleted_at ON public.role_permissions USING btree (deleted_at);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_manager_id ON public.users USING btree (manager_id);


--
-- Name: idx_users_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_reset_password_token ON public.users USING btree (reset_password_token);


--
-- Name: idx_users_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_team_id ON public.users USING btree (team_id);


--
-- Name: idx_work_report_attachments_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_report_attachments_deleted_at ON public.work_report_attachments USING btree (deleted_at);


--
-- Name: idx_work_report_attachments_work_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_report_attachments_work_report_id ON public.work_report_attachments USING btree (work_report_id);


--
-- Name: idx_work_report_columns_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_report_columns_deleted_at ON public.work_report_columns USING btree (deleted_at);


--
-- Name: idx_work_reports_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_reports_deleted_at ON public.work_reports USING btree (deleted_at);


--
-- Name: idx_work_reports_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_reports_employee_id ON public.work_reports USING btree (employee_id);


--
-- Name: idx_work_reports_is_late_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_reports_is_late_submission ON public.work_reports USING btree (is_late_submission);


--
-- Name: idx_work_reports_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_reports_reviewed_by ON public.work_reports USING btree (reviewed_by);


--
-- Name: idx_work_schedules_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_schedules_deleted_at ON public.work_schedules USING btree (deleted_at);


--
-- Name: idx_work_schedules_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_schedules_employee_id ON public.work_schedules USING btree (employee_id);


--
-- Name: idx_work_schedules_tanggal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_schedules_tanggal ON public.work_schedules USING btree (tanggal);


--
-- Name: idx_work_types_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_types_deleted_at ON public.work_types USING btree (deleted_at);


--
-- Name: attendance_records fk_attendance_records_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fk_attendance_records_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employees fk_divisions_employees; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_divisions_employees FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: employee_home_locations fk_employee_home_locations_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_home_locations
    ADD CONSTRAINT fk_employee_home_locations_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employee_home_locations fk_employees_home_location; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_home_locations
    ADD CONSTRAINT fk_employees_home_location FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: internship_certificates fk_internship_certificates_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_certificates
    ADD CONSTRAINT fk_internship_certificates_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: leave_quota fk_leave_quota_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_quota
    ADD CONSTRAINT fk_leave_quota_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: leave_requests fk_leave_requests_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employees fk_positions_employees; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_positions_employees FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: push_subscriptions fk_push_subscriptions_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: role_permissions fk_role_permissions_permission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: employees fk_users_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_users_employee FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users fk_users_manager; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: work_report_attachments fk_work_reports_attachments; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_report_attachments
    ADD CONSTRAINT fk_work_reports_attachments FOREIGN KEY (work_report_id) REFERENCES public.work_reports(id);


--
-- Name: work_reports fk_work_reports_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_reports
    ADD CONSTRAINT fk_work_reports_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: work_schedules fk_work_schedules_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT fk_work_schedules_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- PostgreSQL database dump complete
--

\unrestrict aEcQWFhI8QxtjaWACkxJUpVeFRJfbXsY5Pv50hTW1iDaTa1zuMOW7khYyXUKkFR
