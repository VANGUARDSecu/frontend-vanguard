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
  LdapServiceAccount,
  LdapTestResult,
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

  // Connection Configuration (SCRUM-24)
  readonly ldapServerHost = this.dashboardService.ldapServerHost;
  readonly ldapPortLdaps = this.dashboardService.ldapPortLdaps;
  readonly ldapPortStartTls = this.dashboardService.ldapPortStartTls;
  readonly ldapBaseDn = this.dashboardService.ldapBaseDn;
  readonly ldapOrgDn = this.dashboardService.ldapOrgDn;
  readonly ldapUsersOu = this.dashboardService.ldapUsersOu;
  readonly ldapGroupsOu = this.dashboardService.ldapGroupsOu;
  readonly ldapServicesOu = this.dashboardService.ldapServicesOu;
  readonly copiedLdapParamNotice = this.dashboardService.copiedLdapParamNotice;
  readonly ldapCaCertPem = this.dashboardService.ldapCaCertPem;

  // Service Account Bind Credentials Manager (SCRUM-24)
  readonly ldapServiceAccounts = this.dashboardService.ldapServiceAccounts;
  readonly showAddServiceAccountModal = this.dashboardService.showAddServiceAccountModal;
  readonly newSvcAcctPassword = this.dashboardService.newSvcAcctPassword;
  readonly newSvcAcctPwRevealed = this.dashboardService.newSvcAcctPwRevealed;
  readonly addServiceAccountSuccess = this.dashboardService.addServiceAccountSuccess;
  readonly addServiceAccountError = this.dashboardService.addServiceAccountError;

  get newSvcAcctName() { return this.dashboardService.newSvcAcctName; }
  set newSvcAcctName(v: string) { this.dashboardService.newSvcAcctName = v; }
  get newSvcAcctUid() { return this.dashboardService.newSvcAcctUid; }
  set newSvcAcctUid(v: string) { this.dashboardService.newSvcAcctUid = v; }
  get newSvcAcctType() { return this.dashboardService.newSvcAcctType; }
  set newSvcAcctType(v: any) { this.dashboardService.newSvcAcctType = v; }
  get newSvcAcctIpRestriction() { return this.dashboardService.newSvcAcctIpRestriction; }
  set newSvcAcctIpRestriction(v: string) { this.dashboardService.newSvcAcctIpRestriction = v; }

  // Interactive Bind Connectivity Sandbox (SCRUM-24)
  get ldapDiagEndpoint() { return this.dashboardService.ldapDiagEndpoint; }
  set ldapDiagEndpoint(v: string) { this.dashboardService.ldapDiagEndpoint = v; }
  get ldapDiagBindDn() { return this.dashboardService.ldapDiagBindDn; }
  set ldapDiagBindDn(v: string) { this.dashboardService.ldapDiagBindDn = v; }
  get ldapDiagBindPassword() { return this.dashboardService.ldapDiagBindPassword; }
  set ldapDiagBindPassword(v: string) { this.dashboardService.ldapDiagBindPassword = v; }
  get ldapDiagSearchBase() { return this.dashboardService.ldapDiagSearchBase; }
  set ldapDiagSearchBase(v: string) { this.dashboardService.ldapDiagSearchBase = v; }
  get ldapDiagFilter() { return this.dashboardService.ldapDiagFilter; }
  set ldapDiagFilter(v: string) { this.dashboardService.ldapDiagFilter = v; }
  readonly ldapTestResult = this.dashboardService.ldapTestResult;

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

  downloadLdapCaCert() { this.dashboardService.downloadLdapCaCert(); }
  copyLdapParam(value: string, label: string) { this.dashboardService.copyLdapParam(value, label); }
  openAddServiceAccountModal() { this.dashboardService.openAddServiceAccountModal(); }
  closeAddServiceAccountModal() { this.dashboardService.closeAddServiceAccountModal(); }
  generateSvcAcctPassword() { this.dashboardService.generateSvcAcctPassword(); }
  toggleNewSvcAcctPwRevealed() { this.dashboardService.toggleNewSvcAcctPwRevealed(); }
  submitAddServiceAccount() { this.dashboardService.submitAddServiceAccount(); }
  toggleSvcAcctPwRevealed(id: string) { this.dashboardService.toggleSvcAcctPwRevealed(id); }
  toggleServiceAccountStatus(account: LdapServiceAccount) { this.dashboardService.toggleServiceAccountStatus(account); }
  deleteServiceAccount(id: string) { this.dashboardService.deleteServiceAccount(id); }
  copySvcAcctPassword(password: string) { this.dashboardService.copySvcAcctPassword(password); }
  copySvcAcctDn(dn: string) { this.dashboardService.copySvcAcctDn(dn); }
  loadLdapDiagPreset(type: 'service-account' | 'user' | 'admin' | 'invalid') { this.dashboardService.loadLdapDiagPreset(type); }

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
