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
  selector: 'app-user-ssh',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-ssh.html',
  styleUrl: './user-ssh.css'
})
export class UserSsh {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly ldapBindDn = this.dashboardService.ldapBindDn;
  readonly sshKeys = this.dashboardService.sshKeys;
  readonly sshKeyError = this.dashboardService.sshKeyError;
  readonly sshKeySuccess = this.dashboardService.sshKeySuccess;

  get newKeyLabel() { return this.dashboardService.newKeyLabel; }
  set newKeyLabel(v: string) { this.dashboardService.newKeyLabel = v; }
  get newKeyContent() { return this.dashboardService.newKeyContent; }
  set newKeyContent(v: string) { this.dashboardService.newKeyContent = v; }

  addSshKey() { this.dashboardService.addSshKey(); }
  removeSshKey(id: string) { this.dashboardService.removeSshKey(id); }

}
