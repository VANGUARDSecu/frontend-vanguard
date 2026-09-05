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
  selector: 'app-user-my-apps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-my-apps.html',
  styleUrl: './user-my-apps.css'
})
export class UserMyApps {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly selectedCategory = this.dashboardService.selectedCategory;
  readonly apps = this.dashboardService.apps;
  readonly filteredApps = this.dashboardService.filteredApps;
  readonly showRequestAppModal = this.dashboardService.showRequestAppModal;
  readonly requestAppSuccess = this.dashboardService.requestAppSuccess;

  get requestedAppName() { return this.dashboardService.requestedAppName; }
  set requestedAppName(v: string) { this.dashboardService.requestedAppName = v; }
  get requestAppJustification() { return this.dashboardService.requestAppJustification; }
  set requestAppJustification(v: string) { this.dashboardService.requestAppJustification = v; }

  setCategory(category: 'all' | 'cloud' | 'developer' | 'collaboration') { this.dashboardService.setCategory(category); }
  launchApp(app: SaaSApp) { this.dashboardService.launchApp(app); }
  openRequestAppModal() { this.dashboardService.openRequestAppModal(); }
  closeRequestAppModal() { this.dashboardService.closeRequestAppModal(); }
  submitAppRequest() { this.dashboardService.submitAppRequest(); }

}
