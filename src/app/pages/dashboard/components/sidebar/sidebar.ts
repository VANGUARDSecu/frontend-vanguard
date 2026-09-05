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
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class DashboardSidebar {
  readonly dashboardService = inject(DashboardService);

  readonly viewMode = this.dashboardService.viewMode;
  readonly activeTab = this.dashboardService.activeTab;
  readonly directoryUsers = this.dashboardService.directoryUsers;
  readonly fleetDevices = this.dashboardService.fleetDevices;
  readonly userDevices = this.dashboardService.userDevices;

  setActiveTab(tab: string) { this.dashboardService.setActiveTab(tab); }

}
