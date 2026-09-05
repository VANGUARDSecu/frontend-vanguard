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
  selector: 'app-user-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-activity.html',
  styleUrl: './user-activity.css'
})
export class UserActivity {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly signInHistory = this.dashboardService.signInHistory;

}
