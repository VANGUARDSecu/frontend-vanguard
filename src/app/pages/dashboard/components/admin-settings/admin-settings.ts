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
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css'
})
export class AdminSettings {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly organizationName = this.dashboardService.organizationName;
  readonly enforceMfaAll = this.dashboardService.enforceMfaAll;
  readonly blockHighRiskIps = this.dashboardService.blockHighRiskIps;

  toggleEnforceMfa() { this.dashboardService.toggleEnforceMfa(); }
  toggleBlockHighRiskIps() { this.dashboardService.toggleBlockHighRiskIps(); }
  openGlobalKillswitchModal() { this.dashboardService.openGlobalKillswitchModal(); }

}
