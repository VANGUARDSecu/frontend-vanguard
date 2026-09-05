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
  selector: 'app-admin-cloud-ldap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cloud-ldap.html',
  styleUrl: './admin-cloud-ldap.css'
})
export class AdminCloudLdap {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly directoryUsers = this.dashboardService.directoryUsers;

  get ldapDiagUserId() { return this.dashboardService.ldapDiagUserId; }
  set ldapDiagUserId(v: string) { this.dashboardService.ldapDiagUserId = v; }
  readonly ldapAdminPassword = this.dashboardService.ldapAdminPassword;
  readonly ldapAdminPwRevealed = this.dashboardService.ldapAdminPwRevealed;
  readonly ldapReadonlyPassword = this.dashboardService.ldapReadonlyPassword;
  readonly ldapReadonlyPwRevealed = this.dashboardService.ldapReadonlyPwRevealed;
  readonly ldapHosts = this.dashboardService.ldapHosts;
  readonly showAddLdapHostModal = this.dashboardService.showAddLdapHostModal;
  readonly addLdapHostSuccess = this.dashboardService.addLdapHostSuccess;
  readonly addLdapHostError = this.dashboardService.addLdapHostError;
  readonly ldapDiagRunning = this.dashboardService.ldapDiagRunning;
  readonly ldapDiagExecuted = this.dashboardService.ldapDiagExecuted;
  readonly copiedLdapLog = this.dashboardService.copiedLdapLog;
  readonly ldapDiagLog = this.dashboardService.ldapDiagLog;

  get newLdapHostName() { return this.dashboardService.newLdapHostName; }
  set newLdapHostName(v: string) { this.dashboardService.newLdapHostName = v; }
  get newLdapHostType() { return this.dashboardService.newLdapHostType; }
  set newLdapHostType(v: any) { this.dashboardService.newLdapHostType = v; }
  get newLdapHostIp() { return this.dashboardService.newLdapHostIp; }
  set newLdapHostIp(v: string) { this.dashboardService.newLdapHostIp = v; }
  get newLdapHostProtocol() { return this.dashboardService.newLdapHostProtocol; }
  set newLdapHostProtocol(v: any) { this.dashboardService.newLdapHostProtocol = v; }

  runLdapBindTest() { this.dashboardService.runLdapBindTest(); }
  copyLdapDiagLog() { this.dashboardService.copyLdapDiagLog(); }
  toggleLdapAdminPwRevealed() { this.dashboardService.toggleLdapAdminPwRevealed(); }
  toggleLdapReadonlyPwRevealed() { this.dashboardService.toggleLdapReadonlyPwRevealed(); }
  regenerateLdapPasswords() { this.dashboardService.regenerateLdapPasswords(); }
  openAddLdapHostModal() { this.dashboardService.openAddLdapHostModal(); }
  closeAddLdapHostModal() { this.dashboardService.closeAddLdapHostModal(); }
  submitAddLdapHost() { this.dashboardService.submitAddLdapHost(); }
  deleteLdapHost(host: string | LdapHost) { const id = typeof host === 'string' ? host : host.id; this.dashboardService.deleteLdapHost(id); }
  toggleLdapHostStatus(host: LdapHost) { this.dashboardService.toggleLdapHostStatus(host); }

}
