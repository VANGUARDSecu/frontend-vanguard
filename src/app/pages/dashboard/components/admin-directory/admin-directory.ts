import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import {
  ProtocolStatus,
  SaaSApp,
  SignInEvent,
  SSHKey,
  DirectoryUser,
  TenantAuditEvent,
  SamlConnector,
  OidcClient,
  IdpCertMetadata,
  LdapHost,
  RadiusAccessPoint,
  VlanMapping,
  EnrolledDevice,
  MobilePolicyConfig,
} from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-directory.html',
  styleUrl: './admin-directory.css'
})
export class AdminDirectory {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly directoryDepartmentFilter = this.dashboardService.directoryDepartmentFilter;
  readonly directoryStatusFilter = this.dashboardService.directoryStatusFilter;
  readonly directoryUsers = this.dashboardService.directoryUsers;
  readonly filteredDirectoryUsers = this.dashboardService.filteredDirectoryUsers;
  readonly showInviteModal = this.dashboardService.showInviteModal;
  readonly inviteSuccess = this.dashboardService.inviteSuccess;
  readonly inviteError = this.dashboardService.inviteError;

  readonly directorySearch = this.dashboardService.directorySearch;
  readonly organizationName = this.dashboardService.organizationName;
  readonly inviteCreatedUser = this.dashboardService.inviteCreatedUser;
  readonly passwordCopied = this.dashboardService.passwordCopied;
  readonly inviteEmailStatus = this.dashboardService.inviteEmailStatus;
  readonly inviteEmailMessage = this.dashboardService.inviteEmailMessage;

  get inviteFirstName() { return this.dashboardService.inviteFirstName; }
  set inviteFirstName(v: string) { this.dashboardService.inviteFirstName = v; }
  get inviteLastName() { return this.dashboardService.inviteLastName; }
  set inviteLastName(v: string) { this.dashboardService.inviteLastName = v; }
  get inviteEmail() { return this.dashboardService.inviteEmail; }
  set inviteEmail(v: string) { this.dashboardService.inviteEmail = v; }
  get invitePassword() { return this.dashboardService.invitePassword; }
  set invitePassword(v: string) { this.dashboardService.invitePassword = v; }
  get inviteDepartment() { return this.dashboardService.inviteDepartment; }
  set inviteDepartment(v: any) { this.dashboardService.inviteDepartment = v; }
  get inviteRole() { return this.dashboardService.inviteRole; }
  set inviteRole(v: any) { this.dashboardService.inviteRole = v; }

  setDirectoryDepartment(dept: string) { this.dashboardService.setDirectoryDepartment(dept); }
  setDirectoryStatus(status: string) { this.dashboardService.setDirectoryStatus(status); }
  suspendUser(user: DirectoryUser) { this.dashboardService.suspendUser(user); }
  reactivateUser(user: DirectoryUser) { this.dashboardService.reactivateUser(user); }
  changeUserRole(user: DirectoryUser, role: any) { this.dashboardService.changeUserRole(user, role); }
  forceUserPasswordReset(user: DirectoryUser) { this.dashboardService.forceUserPasswordReset(user); }
  adminRevokeUserSessions(user: DirectoryUser) { this.dashboardService.adminRevokeUserSessions(user); }
  openInviteModal() { this.dashboardService.openInviteModal(); }
  closeInviteModal() { this.dashboardService.closeInviteModal(); }
  submitInviteUser() { this.dashboardService.submitInviteUser(); }
  generateRandomPassword() { return this.dashboardService.generateRandomPassword(); }
  copyTemporaryPassword() { this.dashboardService.copyTemporaryPassword(); }

}
