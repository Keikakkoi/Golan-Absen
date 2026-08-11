import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/employee/dashboard/dashboard.component';
import { CheckinComponent } from './features/employee/checkin/checkin.component';
import { HistoryComponent } from './features/employee/history/history.component';
import { EmployeeListComponent } from './features/admin/employee-list/employee-list.component';
import { LeaveRequestComponent } from './features/employee/leave-request/leave-request.component';
import { ProfileComponent } from './features/employee/profile/profile.component';
import { LeaveApprovalComponent } from './features/admin/leave-approval/leave-approval.component';
import { AdminReportsComponent } from './features/admin/admin-reports/admin-reports.component';
import { WorktypeListComponent } from './features/admin/worktype-list/worktype-list.component';
import { AdminSettingsComponent } from './features/admin/admin-settings/admin-settings.component';
import { AdminAuditComponent } from './features/admin/admin-audit/admin-audit.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { NotFoundComponent } from './features/errors/not-found/not-found.component';
import { ForbiddenComponent } from './features/errors/forbidden/forbidden.component';
import { MaintenanceComponent } from './features/errors/maintenance/maintenance.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { OrganizationComponent } from './features/admin/organization/organization.component';
import { AdminNotificationSettingsComponent } from './features/admin/admin-notification-settings/admin-notification-settings.component';
import { AdminAlphaReportsComponent } from './features/admin/admin-alpha-reports/admin-alpha-reports.component';
import { AdminBackupComponent } from './features/admin/admin-backup/admin-backup.component';
import { HelpFaqComponent } from './features/shared/help-faq/help-faq.component';
import { AboutAppComponent } from './features/shared/about-app/about-app.component';
import { NotificationsComponent } from './features/employee/notifications/notifications.component';
import { StatisticsComponent } from './features/employee/statistics/statistics.component';
import { AdminManagementComponent } from './features/admin/admin-management/admin-management.component';
import { AdminEventsComponent } from './features/admin/admin-events/admin-events.component';
import { WorkReportComponent } from './features/employee/work-report/work-report.component';
import { WorkReportAdminComponent } from './features/admin/work-report-admin/work-report-admin.component';
import { RoleOperationsComponent } from './features/admin/role-operations/role-operations.component';
import { InternDashboardComponent } from './features/intern/intern-dashboard/intern-dashboard.component';
import { InternLogbookComponent } from './features/intern/intern-logbook/intern-logbook.component';
import { InternMentorComponent } from './features/intern/intern-mentor/intern-mentor.component';
import { InternCertificateComponent } from './features/intern/intern-certificate/intern-certificate.component';
import { InternStatisticsComponent } from './features/intern/intern-statistics/intern-statistics.component';
import { ManagerDashboardComponent } from './features/manager/manager-dashboard/manager-dashboard.component';
import { TeamAttendanceComponent } from './features/manager/team-attendance/team-attendance.component';
import { TeamReportsComponent } from './features/manager/team-reports/team-reports.component';
import { TeamStatisticsComponent } from './features/manager/team-statistics/team-statistics.component';
import { ManagerLeaveApprovalComponent } from './features/manager/leave-approval/manager-leave-approval.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  { path: 'employee/dashboard', component: DashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/checkin', component: CheckinComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/checkout', component: CheckinComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/history', component: HistoryComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/leaves', component: LeaveRequestComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/work-report', component: WorkReportComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MANAJER'] } },
  { path: 'employee/statistics', component: StatisticsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/notifications', component: NotificationsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'employee/profile', component: ProfileComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan', 'MAGANG', 'MANAJER'] } },
  { path: 'intern/dashboard', component: InternDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/logbooks', component: InternLogbookComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/statistics', component: InternStatisticsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/mentor', component: InternMentorComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'intern/certificate', component: InternCertificateComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MAGANG'] } },
  { path: 'manager/dashboard', component: ManagerDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER'] } },
  { path: 'manager/team/attendance', component: TeamAttendanceComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER'] } },
  { path: 'manager/team/reports', component: TeamReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER'] } },
  { path: 'manager/team/statistics', component: TeamStatisticsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER'] } },
  { path: 'manager/leaves', component: ManagerLeaveApprovalComponent, canActivate: [authGuard, roleGuard], data: { roles: ['MANAJER'] } },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/notifications', component: NotificationsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/employees', component: EmployeeListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/schedules', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'schedules' } },
  { path: 'admin/home-locations', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'home' } },
  { path: 'admin/leave-quotas', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'quotas' } },
  { path: 'admin/organization', component: OrganizationComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/events', component: AdminEventsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/worktypes', component: WorktypeListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/leaves', component: LeaveApprovalComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/work-reports', component: WorkReportAdminComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/role-operations', component: RoleOperationsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports/daily', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Harian' } },
  { path: 'admin/reports/weekly', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Mingguan' } },
  { path: 'admin/reports/monthly', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Bulanan' } },
  { path: 'admin/reports/alpha', component: AdminAlphaReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings', component: AdminSettingsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings/notifications', component: AdminNotificationSettingsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/backup', component: AdminBackupComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/audit', component: AdminAuditComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'help', component: HelpFaqComponent, canActivate: [authGuard] },
  { path: 'about', component: AboutAppComponent, canActivate: [authGuard] },
  { path: 'admin/help', redirectTo: 'help', pathMatch: 'full' },
  { path: 'admin/about', redirectTo: 'about', pathMatch: 'full' },
  
  { path: '403', component: ForbiddenComponent },
  { path: 'forbidden', redirectTo: '403', pathMatch: 'full' },
  { path: 'maintenance', component: MaintenanceComponent },
  { path: '**', component: NotFoundComponent }
];
