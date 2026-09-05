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
  selector: 'app-admin-device-fleet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-device-fleet.html',
  styleUrl: './admin-device-fleet.css'
})
export class AdminDeviceFleet {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly fleetDevices = this.dashboardService.fleetDevices;
  readonly mobilePolicy = this.dashboardService.mobilePolicy;
  readonly showWipeDeviceModal = this.dashboardService.showWipeDeviceModal;
  readonly selectedDeviceForWipe = this.dashboardService.selectedDeviceForWipe;
  readonly wipeDeviceSuccess = this.dashboardService.wipeDeviceSuccess;

  openWipeDeviceModal(dev: EnrolledDevice) { this.dashboardService.openWipeDeviceModal(dev); }
  closeWipeDeviceModal() { this.dashboardService.closeWipeDeviceModal(); }
  executeWipeDevice() { this.dashboardService.executeWipeDevice(); }
  toggleFleetDeviceCompliance(dev: EnrolledDevice) { this.dashboardService.toggleFleetDeviceCompliance(dev); }
  updateMobilePolicy(key: keyof MobilePolicyConfig, val: any) { this.dashboardService.updateMobilePolicy(key, val); }

}
