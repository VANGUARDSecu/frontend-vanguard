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
  selector: 'app-user-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-security.html',
  styleUrl: './user-security.css'
})
export class UserSecurity {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly user = this.dashboardService.user;
  readonly hasTotpEnrolled = this.dashboardService.hasTotpEnrolled;
  readonly showEnrollTotpModal = this.dashboardService.showEnrollTotpModal;
  readonly totpQrUrl = this.dashboardService.totpQrUrl;
  readonly totpSecret = this.dashboardService.totpSecret;
  readonly totpEnrollError = this.dashboardService.totpEnrollError;
  readonly totpEnrollSuccess = this.dashboardService.totpEnrollSuccess;
  readonly recoveryCodes = this.dashboardService.recoveryCodes;
  readonly copiedCodes = this.dashboardService.copiedCodes;

  get totpVerifyCode() { return this.dashboardService.totpVerifyCode; }
  set totpVerifyCode(v: string) { this.dashboardService.totpVerifyCode = v; }

  startEnrollTotp() { this.dashboardService.startEnrollTotp(); }
  closeEnrollTotpModal() { this.dashboardService.closeEnrollTotpModal(); }
  confirmEnrollTotp() { this.dashboardService.confirmEnrollTotp(); }
  copyRecoveryCodes() { this.dashboardService.copyRecoveryCodes(); }
  downloadRecoveryCodes() { this.dashboardService.downloadRecoveryCodes(); }
  generateRecoveryCodes() { this.dashboardService.generateRecoveryCodes(); }

}
