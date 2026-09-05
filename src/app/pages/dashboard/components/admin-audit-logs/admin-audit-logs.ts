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
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-audit-logs.html',
  styleUrl: './admin-audit-logs.css'
})
export class AdminAuditLogs {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly auditStatusFilter = this.dashboardService.auditStatusFilter;
  readonly auditProtocolFilter = this.dashboardService.auditProtocolFilter;
  readonly filteredAuditEvents = this.dashboardService.filteredAuditEvents;

  readonly auditSearchQuery = this.dashboardService.auditSearchQuery;

  setAuditStatus(status: string) { this.dashboardService.setAuditStatus(status); }
  setAuditProtocol(protocol: string) { this.dashboardService.setAuditProtocol(protocol); }
  exportAuditLogs() { this.dashboardService.exportAuditLogs(); }

}
