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
  RadiusAuthActivityEvent,
  VlanMapping,
  EnrolledDevice,
  MobilePolicyConfig,
} from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-cloud-radius',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cloud-radius.html',
  styleUrl: './admin-cloud-radius.css'
})
export class AdminCloudRadius {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly directoryUsers = this.dashboardService.directoryUsers;

  get radiusDiagUserId() { return this.dashboardService.radiusDiagUserId; }
  set radiusDiagUserId(v: string) { this.dashboardService.radiusDiagUserId = v; }
  get radiusDiagApId() { return this.dashboardService.radiusDiagApId; }
  set radiusDiagApId(v: string) { this.dashboardService.radiusDiagApId = v; }
  get radiusDiagEapMethod() { return this.dashboardService.radiusDiagEapMethod; }
  set radiusDiagEapMethod(v: any) { this.dashboardService.radiusDiagEapMethod = v; }
  readonly radiusSharedSecret = this.dashboardService.radiusSharedSecret;
  readonly radiusSecretRevealed = this.dashboardService.radiusSecretRevealed;
  readonly radiusSecretDaysRemaining = this.dashboardService.radiusSecretDaysRemaining;
  readonly radiusAccessPoints = this.dashboardService.radiusAccessPoints;
  readonly vlanMappings = this.dashboardService.vlanMappings;
  readonly showAddRadiusApModal = this.dashboardService.showAddRadiusApModal;
  readonly addRadiusApSuccess = this.dashboardService.addRadiusApSuccess;
  readonly addRadiusApError = this.dashboardService.addRadiusApError;
  readonly showRotateRadiusSecretModal = this.dashboardService.showRotateRadiusSecretModal;
  readonly rotateRadiusSecretSuccess = this.dashboardService.rotateRadiusSecretSuccess;
  readonly radiusDiagRunning = this.dashboardService.radiusDiagRunning;
  readonly radiusDiagExecuted = this.dashboardService.radiusDiagExecuted;
  readonly copiedRadiusLog = this.dashboardService.copiedRadiusLog;
  readonly radiusDiagLog = this.dashboardService.radiusDiagLog;

  // SCRUM-23 State & Signals
  readonly newRadiusApSecret = this.dashboardService.newRadiusApSecret;
  readonly newRadiusApSecretRevealed = this.dashboardService.newRadiusApSecretRevealed;
  readonly copiedRadiusSecretNotice = this.dashboardService.copiedRadiusSecretNotice;
  readonly radiusAuthActivity = this.dashboardService.radiusAuthActivity;
  readonly radiusActivityFilter = this.dashboardService.radiusActivityFilter;
  readonly filteredRadiusActivity = this.dashboardService.filteredRadiusActivity;

  get editingRadiusApId() { return this.dashboardService.editingRadiusApId; }
  get newRadiusApName() { return this.dashboardService.newRadiusApName; }
  set newRadiusApName(v: string) { this.dashboardService.newRadiusApName = v; }
  get newRadiusApType() { return this.dashboardService.newRadiusApType; }
  set newRadiusApType(v: any) { this.dashboardService.newRadiusApType = v; }
  get newRadiusApIp() { return this.dashboardService.newRadiusApIp; }
  set newRadiusApIp(v: string) { this.dashboardService.newRadiusApIp = v; }
  get newRadiusApDesc() { return this.dashboardService.newRadiusApDesc; }
  set newRadiusApDesc(v: string) { this.dashboardService.newRadiusApDesc = v; }
  get newRadiusApProtocol() { return this.dashboardService.newRadiusApProtocol; }
  set newRadiusApProtocol(v: any) { this.dashboardService.newRadiusApProtocol = v; }

  runRadiusAuthTest() { this.dashboardService.runRadiusAuthTest(); }
  copyRadiusDiagLog() { this.dashboardService.copyRadiusDiagLog(); }
  toggleRadiusSecretRevealed() { this.dashboardService.toggleRadiusSecretRevealed(); }
  openRotateRadiusSecretModal() { this.dashboardService.openRotateRadiusSecretModal(); }
  closeRotateRadiusSecretModal() { this.dashboardService.closeRotateRadiusSecretModal(); }
  executeRotateRadiusSecret() { this.dashboardService.executeRotateRadiusSecret(); }
  openAddRadiusApModal() { this.dashboardService.openAddRadiusApModal(); }
  openEditRadiusApModal(ap: RadiusAccessPoint) { this.dashboardService.openEditRadiusApModal(ap); }
  closeAddRadiusApModal() { this.dashboardService.closeAddRadiusApModal(); }
  submitAddRadiusAp() { this.dashboardService.submitAddRadiusAp(); }
  deleteRadiusAp(ap: string | RadiusAccessPoint) { const id = typeof ap === 'string' ? ap : ap.id; this.dashboardService.deleteRadiusAp(id); }
  toggleRadiusApStatus(ap: RadiusAccessPoint) { this.dashboardService.toggleRadiusApStatus(ap); }
  regenerateNewRadiusClientSecret() { this.dashboardService.regenerateNewRadiusClientSecret(); }
  toggleNewRadiusSecretRevealed() { this.dashboardService.toggleNewRadiusSecretRevealed(); }
  copyNewRadiusSecret() { this.dashboardService.copyNewRadiusSecret(); }
  rotateRadiusClientSecret(id: string) { this.dashboardService.rotateRadiusClientSecret(id); }
  toggleRadiusClientSecretRevealed(id: string) { this.dashboardService.toggleRadiusClientSecretRevealed(id); }
  copyRadiusClientSecret(secret: string) { this.dashboardService.copyRadiusClientSecret(secret); }
  setRadiusActivityFilter(filter: 'all' | 'Access-Accept' | 'Access-Reject') { this.dashboardService.setRadiusActivityFilter(filter); }
  simulateRadiusAuth(success?: boolean) { this.dashboardService.simulateRadiusAuth(success); }
}
