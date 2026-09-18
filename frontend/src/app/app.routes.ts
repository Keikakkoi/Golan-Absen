import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

const noIndex = { indexable: false };
const publicHomeSeo = {
  title: 'Absensi Golan Digital Kreatif | Sistem Absensi Digital PT. Golan Digital Kreatif',
  description: 'Absensi Golan Digital Kreatif adalah sistem absensi digital untuk membantu PT. Golan Digital Kreatif mengelola kehadiran karyawan secara mudah, cepat, dan terintegrasi.',
  indexable: true,
  type: 'software' as const
};
const loginSeo = {
  title: 'Masuk | Absensi Golan Digital Kreatif',
  description: 'Masuk ke sistem Absensi Golan Digital Kreatif untuk mengelola kehadiran, laporan kerja, dan aktivitas operasional tim PT. Golan Digital Kreatif.',
  indexable: true,
  type: 'software' as const
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent), data: { seo: publicHomeSeo } },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent), data: { seo: loginSeo } },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), data: { seo: { title: 'Lupa Password | Absensi Golan Digital Kreatif', ...noIndex } } },
  { path: 'verify-password-otp', loadComponent: () => import('./features/auth/verify-password-otp/verify-password-otp.component').then(m => m.VerifyPasswordOtpComponent), data: { seo: { title: 'Verifikasi Kode OTP | Absensi Golan Digital Kreatif', ...noIndex } } },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent), data: { seo: { title: 'Atur Ulang Password | Absensi Golan Digital Kreatif', ...noIndex } } },
  
  { path: 'employee/dashboard', loadComponent: () => import('./features/employee/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/checkin', loadComponent: () => import('./features/employee/checkin/checkin.component').then(m => m.CheckinComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/checkout', loadComponent: () => import('./features/employee/checkin/checkin.component').then(m => m.CheckinComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/history', loadComponent: () => import('./features/employee/history/history.component').then(m => m.HistoryComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/leaves', loadComponent: () => import('./features/employee/leave-request/leave-request.component').then(m => m.LeaveRequestComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/work-report', loadComponent: () => import('./features/employee/work-report/work-report.component').then(m => m.WorkReportComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MANAJER'] } },
  { path: 'employee/statistics', loadComponent: () => import('./features/employee/statistics/statistics.component').then(m => m.StatisticsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/notifications', loadComponent: () => import('./features/employee/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/profile', loadComponent: () => import('./features/employee/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/manager', loadComponent: () => import('./features/employee/manager/manager.component').then(m => m.ManagerComponent), canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'intern/dashboard', loadComponent: () => import('./features/intern/intern-dashboard/intern-dashboard.component').then(m => m.InternDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/logbooks', loadComponent: () => import('./features/intern/intern-logbook/intern-logbook.component').then(m => m.InternLogbookComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/statistics', loadComponent: () => import('./features/intern/intern-statistics/intern-statistics.component').then(m => m.InternStatisticsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/mentor', loadComponent: () => import('./features/intern/intern-mentor/intern-mentor.component').then(m => m.InternMentorComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/certificate', loadComponent: () => import('./features/intern/intern-certificate/intern-certificate.component').then(m => m.InternCertificateComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'manager/dashboard', loadComponent: () => import('./features/manager/manager-dashboard/manager-dashboard.component').then(m => m.ManagerDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER', 'HRD'] } },
  { path: 'manager/team/attendance', loadComponent: () => import('./features/manager/team-attendance/team-attendance.component').then(m => m.TeamAttendanceComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER', 'HRD'] } },
  { path: 'manager/team/reports', loadComponent: () => import('./features/manager/team-reports/team-reports.component').then(m => m.TeamReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER', 'HRD'] } },
  { path: 'manager/team/statistics', loadComponent: () => import('./features/manager/team-statistics/team-statistics.component').then(m => m.TeamStatisticsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER', 'HRD'] } },
  { path: 'manager/leaves', loadComponent: () => import('./features/manager/leave-approval/manager-leave-approval.component').then(m => m.ManagerLeaveApprovalComponent), canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER', 'HRD'] } },
  { path: 'admin/dashboard', loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/notifications', loadComponent: () => import('./features/employee/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/employees', loadComponent: () => import('./features/admin/employee-list/employee-list.component').then(m => m.EmployeeListComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/schedules', loadComponent: () => import('./features/admin/admin-management/admin-management.component').then(m => m.AdminManagementComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'schedules' } },
  { path: 'admin/home-locations', loadComponent: () => import('./features/admin/admin-management/admin-management.component').then(m => m.AdminManagementComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'home' } },
  { path: 'admin/leave-quotas', loadComponent: () => import('./features/admin/admin-management/admin-management.component').then(m => m.AdminManagementComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'quotas' } },
  { path: 'admin/organization', loadComponent: () => import('./features/admin/organization/organization.component').then(m => m.OrganizationComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/events', loadComponent: () => import('./features/admin/admin-events/admin-events.component').then(m => m.AdminEventsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/worktypes', loadComponent: () => import('./features/admin/worktype-list/worktype-list.component').then(m => m.WorktypeListComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/leaves', loadComponent: () => import('./features/admin/leave-approval/leave-approval.component').then(m => m.LeaveApprovalComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/work-reports', loadComponent: () => import('./features/admin/work-report-admin/work-report-admin.component').then(m => m.WorkReportAdminComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/role-operations', loadComponent: () => import('./features/admin/role-operations/role-operations.component').then(m => m.RoleOperationsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports', loadComponent: () => import('./features/admin/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports/daily', loadComponent: () => import('./features/admin/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Harian' } },
  { path: 'admin/reports/weekly', loadComponent: () => import('./features/admin/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Mingguan' } },
  { path: 'admin/reports/monthly', loadComponent: () => import('./features/admin/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Bulanan' } },
  { path: 'admin/reports/alpha', loadComponent: () => import('./features/admin/admin-alpha-reports/admin-alpha-reports.component').then(m => m.AdminAlphaReportsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings', loadComponent: () => import('./features/admin/admin-settings/admin-settings.component').then(m => m.AdminSettingsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings/notifications', loadComponent: () => import('./features/admin/admin-notification-settings/admin-notification-settings.component').then(m => m.AdminNotificationSettingsComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/backup', loadComponent: () => import('./features/admin/admin-backup/admin-backup.component').then(m => m.AdminBackupComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/audit', loadComponent: () => import('./features/admin/admin-audit/admin-audit.component').then(m => m.AdminAuditComponent), canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'help', loadComponent: () => import('./features/shared/help-faq/help-faq.component').then(m => m.HelpFaqComponent), canActivate: [authGuard] },
  { path: 'about', loadComponent: () => import('./features/shared/about-app/about-app.component').then(m => m.AboutAppComponent), canActivate: [authGuard] },
  { path: 'admin/help', redirectTo: 'help', pathMatch: 'full' },
  { path: 'admin/about', redirectTo: 'about', pathMatch: 'full' },
  
  { path: '403', loadComponent: () => import('./features/errors/forbidden/forbidden.component').then(m => m.ForbiddenComponent), data: { seo: { title: 'Akses Ditolak | Absensi Golan Digital Kreatif', ...noIndex } } },
  { path: 'forbidden', redirectTo: '403', pathMatch: 'full' },
  { path: 'maintenance', loadComponent: () => import('./features/errors/maintenance/maintenance.component').then(m => m.MaintenanceComponent), data: { seo: { title: 'Pemeliharaan Sistem | Absensi Golan Digital Kreatif', ...noIndex } } },
  { path: '**', loadComponent: () => import('./features/errors/not-found/not-found.component').then(m => m.NotFoundComponent), data: { seo: { title: 'Halaman Tidak Ditemukan | Absensi Golan Digital Kreatif', ...noIndex } } }
];
