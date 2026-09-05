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
  selector: 'app-user-devices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-devices.html',
  styleUrl: './user-devices.css'
})
export class UserDevices {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly userDevices = this.dashboardService.userDevices;
  readonly clientInfo = this.dashboardService.clientInfo;
  readonly showPairDeviceModal = this.dashboardService.showPairDeviceModal;
  readonly newPairingToken = this.dashboardService.newPairingToken;
  readonly newPairingKey = this.dashboardService.newPairingKey;
  readonly pairDeviceSuccess = this.dashboardService.pairDeviceSuccess;
  readonly showPushSimulatorModal = this.dashboardService.showPushSimulatorModal;
  readonly simulatedPushStep = this.dashboardService.simulatedPushStep;
  readonly simulatedChallengeNumber = this.dashboardService.simulatedChallengeNumber;
  readonly simulatedCandidateNumbers = this.dashboardService.simulatedCandidateNumbers;
  readonly simulatedSelectedNumber = this.dashboardService.simulatedSelectedNumber;
  readonly simulatedBiometricScanning = this.dashboardService.simulatedBiometricScanning;

  startPushSimulation() { this.dashboardService.startPushSimulation(); }
  closePushSimulator() { this.dashboardService.closePushSimulator(); }
  openNotificationChallenge() { this.dashboardService.openNotificationChallenge(); }
  selectSimulatedNumberMatch(num: number) { this.dashboardService.selectSimulatedNumberMatch(num); }
  denySimulatedPush() { this.dashboardService.denySimulatedPush(); }
  retryPushSimulation() { this.dashboardService.retryPushSimulation(); }
  openPairDeviceModal() { this.dashboardService.openPairDeviceModal(); }
  closePairDeviceModal() { this.dashboardService.closePairDeviceModal(); }
  confirmPairDevice() { this.dashboardService.confirmPairDevice(); }
  openWipeDeviceModal(dev: EnrolledDevice) { this.dashboardService.openWipeDeviceModal(dev); }
  revokeAllSessions() { this.dashboardService.revokeAllSessions(); }

}
