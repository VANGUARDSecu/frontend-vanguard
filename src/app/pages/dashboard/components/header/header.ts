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
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class DashboardHeader {
  readonly dashboardService = inject(DashboardService);

  readonly user = this.dashboardService.user;
  readonly userRole = this.dashboardService.userRole;
  readonly isAdmin = this.dashboardService.isAdmin;
  readonly viewMode = this.dashboardService.viewMode;
  readonly displayName = this.dashboardService.displayName;
  readonly userInitials = this.dashboardService.userInitials;
  readonly userRoleLabel = this.dashboardService.userRoleLabel;

  get searchQuery() { return this.dashboardService.searchQuery; }
  set searchQuery(v: string) { this.dashboardService.searchQuery = v; }

  toggleViewMode(mode?: 'admin' | 'user') { const target = mode ?? (this.viewMode() === 'admin' ? 'user' : 'admin'); this.dashboardService.toggleViewMode(target); }
  onLogout() { this.dashboardService.onLogout(); }

}
