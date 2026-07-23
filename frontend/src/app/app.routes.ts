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
import { AdminLateReportsComponent } from './features/admin/admin-late-reports/admin-late-reports.component';
import { AdminAlphaReportsComponent } from './features/admin/admin-alpha-reports/admin-alpha-reports.component';
import { ExecutiveDepartmentStatsComponent } from './features/executive/executive-department-stats/executive-department-stats.component';
import { ExecutiveComparisonComponent } from './features/executive/executive-comparison/executive-comparison.component';
import { AdminBackupComponent } from './features/admin/admin-backup/admin-backup.component';
import { HelpFaqComponent } from './features/shared/help-faq/help-faq.component';
import { AboutAppComponent } from './features/shared/about-app/about-app.component';
import { NotificationsComponent } from './features/employee/notifications/notifications.component';
import { StatisticsComponent } from './features/employee/statistics/statistics.component';
import { AdminManagementComponent } from './features/admin/admin-management/admin-management.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  { path: 'employee/dashboard', component: DashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/checkin', component: CheckinComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/checkout', component: CheckinComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/history', component: HistoryComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/leaves', component: LeaveRequestComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/statistics', component: StatisticsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/notifications', component: NotificationsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  { path: 'employee/profile', component: ProfileComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Karyawan'] } },
  // Executive / Pimpinan module routes
  {
    path: 'executive/dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Pimpinan'] },
    loadComponent: () => import('./features/executive/executive-dashboard/executive-dashboard.component').then(m => m.ExecutiveDashboardComponent)
  },
  {
    path: 'executive/reports',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Pimpinan'] },
    loadComponent: () => import('./features/executive/executive-reports/executive-reports.component').then(m => m.ExecutiveReportsComponent)
  },
  {
    path: 'executive/departments/stats',
    component: ExecutiveDepartmentStatsComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Pimpinan'] }
  },
  {
    path: 'executive/departments/comparison',
    component: ExecutiveComparisonComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Pimpinan'] }
  },
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/employees', component: EmployeeListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/roles', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'roles' } },
  { path: 'admin/schedules', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'schedules' } },
  { path: 'admin/home-locations', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'home' } },
  { path: 'admin/leave-quotas', component: AdminManagementComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], section: 'quotas' } },
  { path: 'admin/organization', component: OrganizationComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/worktypes', component: WorktypeListComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/leaves', component: LeaveApprovalComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports/daily', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Harian' } },
  { path: 'admin/reports/weekly', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Mingguan' } },
  { path: 'admin/reports/monthly', component: AdminReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'], periode: 'Bulanan' } },
  { path: 'admin/reports/late', component: AdminLateReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/reports/alpha', component: AdminAlphaReportsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings', component: AdminSettingsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/settings/notifications', component: AdminNotificationSettingsComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'admin/backup', component: AdminBackupComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD', 'Pimpinan'] } },
  { path: 'admin/audit', component: AdminAuditComponent, canActivate: [authGuard, roleGuard], data: { roles: ['HRD'] } },
  { path: 'help', component: HelpFaqComponent, canActivate: [authGuard] },
  { path: 'about', component: AboutAppComponent, canActivate: [authGuard] },
  { path: 'admin/help', redirectTo: 'help', pathMatch: 'full' },
  { path: 'admin/about', redirectTo: 'about', pathMatch: 'full' },
  
  { path: 'pimpinan/dashboard', redirectTo: 'executive/dashboard', pathMatch: 'full' },

  { path: '403', component: ForbiddenComponent },
  { path: 'forbidden', redirectTo: '403', pathMatch: 'full' },
  { path: 'maintenance', component: MaintenanceComponent },
  { path: '**', component: NotFoundComponent }
];
