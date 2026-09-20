import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { EnrolledDevice, MobilePolicyConfig } from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-device-fleet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-device-fleet.html',
  styleUrl: './admin-device-fleet.css',
})
export class AdminDeviceFleet {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly fleetDevices = this.dashboardService.fleetDevices;
  readonly mobilePolicy = this.dashboardService.mobilePolicy;

  // Remote Wipe Modal State
  readonly showWipeDeviceModal = this.dashboardService.showWipeDeviceModal;
  readonly selectedDeviceForWipe = this.dashboardService.selectedDeviceForWipe;
  readonly wipeDeviceSuccess = this.dashboardService.wipeDeviceSuccess;

  // SCRUM-29: Security Action Modals
  readonly showRevokeSsoModal = this.dashboardService.showRevokeSsoModal;
  readonly selectedDeviceForRevokeSso = this.dashboardService.selectedDeviceForRevokeSso;
  readonly revokeSsoSuccess = this.dashboardService.revokeSsoSuccess;

  readonly showCompromisedModal = this.dashboardService.showCompromisedModal;
  readonly selectedDeviceForCompromised = this.dashboardService.selectedDeviceForCompromised;
  readonly compromisedSuccess = this.dashboardService.compromisedSuccess;

  readonly showRemoveDeviceModal = this.dashboardService.showRemoveDeviceModal;
  readonly selectedDeviceForRemove = this.dashboardService.selectedDeviceForRemove;
  readonly removeDeviceSuccess = this.dashboardService.removeDeviceSuccess;

  // Search & Filter State
  readonly searchTerm = signal<string>('');
  readonly osFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');
  readonly openActionDropdownId = signal<string | null>(null);

  // Computed Filtered List
  readonly filteredFleetDevices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const os = this.osFilter();
    const status = this.statusFilter();
    const list = this.fleetDevices();

    return list.filter((dev) => {
      // Search term
      if (term) {
        const matchesName = dev.name.toLowerCase().includes(term);
        const matchesModel = dev.model.toLowerCase().includes(term);
        const matchesOwner = dev.ownerName.toLowerCase().includes(term);
        const matchesEmail = dev.ownerEmail.toLowerCase().includes(term);
        const matchesDept = dev.department.toLowerCase().includes(term);
        const matchesOs = dev.osVersion.toLowerCase().includes(term);
        if (!matchesName && !matchesModel && !matchesOwner && !matchesEmail && !matchesDept && !matchesOs) {
          return false;
        }
      }

      // OS Filter
      if (os !== 'all') {
        const typeStr = dev.type.toLowerCase();
        const verStr = dev.osVersion.toLowerCase();
        if (os === 'macos' && !typeStr.includes('macos') && !verStr.includes('macos')) return false;
        if (os === 'windows' && !typeStr.includes('windows') && !verStr.includes('windows')) return false;
        if (os === 'ios' && !typeStr.includes('ios') && !verStr.includes('ios')) return false;
        if (os === 'android' && !typeStr.includes('android') && !verStr.includes('android')) return false;
      }

      // Status Filter
      if (status !== 'all') {
        if (status === 'Compliant' && dev.complianceStatus !== 'Compliant') return false;
        if (status === 'Warning' && dev.complianceStatus !== 'Warning') return false;
        if (status === 'Revoked' && dev.complianceStatus !== 'Revoked') return false;
      }

      return true;
    });
  });

  // Computed Telemetry & Compliance Metrics
  readonly fleetMetrics = computed(() => {
    const devices = this.fleetDevices();
    const total = devices.length;
    const compliant = devices.filter((d) => d.complianceStatus === 'Compliant').length;
    const warning = devices.filter((d) => d.complianceStatus === 'Warning').length;
    const revoked = devices.filter((d) => d.complianceStatus === 'Revoked').length;
    const biometrics = devices.filter((d) => d.biometricType && d.biometricType !== 'None').length;
    const encrypted = devices.filter((d) => d.diskEncrypted).length;

    const compliantPercent = total > 0 ? Math.round((compliant / total) * 100) : 100;
    const biometricsPercent = total > 0 ? Math.round((biometrics / total) * 100) : 100;
    const encryptedPercent = total > 0 ? Math.round((encrypted / total) * 100) : 100;

    return {
      total,
      compliant,
      warning,
      revoked,
      compliantPercent,
      biometricsPercent,
      encryptedPercent,
    };
  });

  // Action Dropdown Helpers
  toggleActionDropdown(deviceId: string, event: Event): void {
    event.stopPropagation();
    if (this.openActionDropdownId() === deviceId) {
      this.openActionDropdownId.set(null);
    } else {
      this.openActionDropdownId.set(deviceId);
    }
  }

  closeActionDropdown(): void {
    this.openActionDropdownId.set(null);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeActionDropdown();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeActionDropdown();
    this.closeRevokeSsoModal();
    this.closeCompromisedModal();
    this.closeRemoveDeviceModal();
    this.closeWipeDeviceModal();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.osFilter.set('all');
    this.statusFilter.set('all');
  }

  // Modal Handlers
  openRevokeSsoModal(dev: EnrolledDevice): void {
    this.closeActionDropdown();
    this.dashboardService.openRevokeSsoModal(dev);
  }

  closeRevokeSsoModal(): void {
    this.dashboardService.closeRevokeSsoModal();
  }

  executeRevokeSso(): void {
    this.dashboardService.executeRevokeSso();
  }

  openCompromisedModal(dev: EnrolledDevice): void {
    this.closeActionDropdown();
    this.dashboardService.openCompromisedModal(dev);
  }

  closeCompromisedModal(): void {
    this.dashboardService.closeCompromisedModal();
  }

  executeMarkCompromised(): void {
    this.dashboardService.executeMarkCompromised();
  }

  openRemoveDeviceModal(dev: EnrolledDevice): void {
    this.closeActionDropdown();
    this.dashboardService.openRemoveDeviceModal(dev);
  }

  closeRemoveDeviceModal(): void {
    this.dashboardService.closeRemoveDeviceModal();
  }

  executeRemoveDevice(): void {
    this.dashboardService.executeRemoveDevice();
  }

  openWipeDeviceModal(dev: EnrolledDevice): void {
    this.closeActionDropdown();
    this.dashboardService.openWipeDeviceModal(dev);
  }

  closeWipeDeviceModal(): void {
    this.dashboardService.closeWipeDeviceModal();
  }

  executeWipeDevice(): void {
    this.dashboardService.executeWipeDevice();
  }

  toggleFleetDeviceCompliance(dev: EnrolledDevice): void {
    this.closeActionDropdown();
    this.dashboardService.toggleFleetDeviceCompliance(dev);
  }

  updateMobilePolicy(key: keyof MobilePolicyConfig, val: any): void {
    this.dashboardService.updateMobilePolicy(key, val);
  }
}
