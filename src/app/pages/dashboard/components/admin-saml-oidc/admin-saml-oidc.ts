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
  selector: 'app-admin-saml-oidc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-saml-oidc.html',
  styleUrl: './admin-saml-oidc.css'
})
export class AdminSamlOidc {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly directoryUsers = this.dashboardService.directoryUsers;

  get sandboxSelectedAppId() { return this.dashboardService.sandboxSelectedAppId; }
  set sandboxSelectedAppId(v: string) { this.dashboardService.sandboxSelectedAppId = v; }
  get sandboxSelectedUserId() { return this.dashboardService.sandboxSelectedUserId; }
  set sandboxSelectedUserId(v: string) { this.dashboardService.sandboxSelectedUserId = v; }
  get sandboxInspectorMode() { return this.dashboardService.sandboxInspectorMode; }
  set sandboxInspectorMode(v: 'saml' | 'oidc') { this.dashboardService.sandboxInspectorMode = v; }
  readonly samlSubTab = this.dashboardService.samlSubTab;
  readonly idpCert = this.dashboardService.idpCert;
  readonly federatedSamlConnectors = this.dashboardService.federatedSamlConnectors;
  readonly oidcClients = this.dashboardService.oidcClients;
  readonly showAddAppModal = this.dashboardService.showAddAppModal;
  readonly addAppSuccess = this.dashboardService.addAppSuccess;
  readonly addAppError = this.dashboardService.addAppError;
  readonly showRotateCertModal = this.dashboardService.showRotateCertModal;
  readonly rotateCertSuccess = this.dashboardService.rotateCertSuccess;
  readonly sandboxAssertionGenerated = this.dashboardService.sandboxAssertionGenerated;
  readonly copiedAssertion = this.dashboardService.copiedAssertion;
  readonly simulatedSamlXml = this.dashboardService.simulatedSamlXml;
  readonly simulatedOidcJwtHeader = this.dashboardService.simulatedOidcJwtHeader;
  readonly simulatedOidcJwtPayload = this.dashboardService.simulatedOidcJwtPayload;

  get newAppName() { return this.dashboardService.newAppName; }
  set newAppName(v: string) { this.dashboardService.newAppName = v; }
  get newAppProtocol() { return this.dashboardService.newAppProtocol; }
  set newAppProtocol(v: 'SAML 2.0' | 'OIDC') { this.dashboardService.newAppProtocol = v; }
  get newAppEntityId() { return this.dashboardService.newAppEntityId; }
  set newAppEntityId(v: string) { this.dashboardService.newAppEntityId = v; }
  get newAppAcsUrl() { return this.dashboardService.newAppAcsUrl; }
  set newAppAcsUrl(v: string) { this.dashboardService.newAppAcsUrl = v; }
  get newAppDepartment() { return this.dashboardService.newAppDepartment; }
  set newAppDepartment(v: string) { this.dashboardService.newAppDepartment = v; }

  setSamlSubTab(tab: 'apps' | 'idp-metadata' | 'oidc-clients' | 'sso-sandbox') { this.dashboardService.setSamlSubTab(tab); }
  downloadIdpMetadataXml() { this.dashboardService.downloadIdpMetadataXml(); }
  downloadX509Cert() { this.dashboardService.downloadX509Cert(); }
  copyCertFingerprint() { this.dashboardService.copyCertFingerprint(); }
  openRotateCertModal() { this.dashboardService.openRotateCertModal(); }
  closeRotateCertModal() { this.dashboardService.closeRotateCertModal(); }
  executeRotateCert() { this.dashboardService.executeRotateCert(); }
  openAddAppModal() { this.dashboardService.openAddAppModal(); }
  closeAddAppModal() { this.dashboardService.closeAddAppModal(); }
  submitAddAppConnector() { this.dashboardService.submitAddAppConnector(); }
  deleteAppConnector(conn: string | SamlConnector) { const id = typeof conn === 'string' ? conn : conn.id; this.dashboardService.deleteAppConnector(id); }
  toggleAppConnectorStatus(conn: SamlConnector) { this.dashboardService.toggleAppConnectorStatus(conn); }
  toggleRevealClientSecret(client: OidcClient) { this.dashboardService.toggleRevealClientSecret(client); }
  regenerateClientSecret(client: OidcClient) { this.dashboardService.regenerateClientSecret(client); }
  copySimulatedAssertion() { this.dashboardService.copySimulatedAssertion(); }

}
