import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminDeviceFleet } from './admin-device-fleet';
import { DashboardService } from '../../services/dashboard.service';
import { EnrolledDevice } from '../../models/dashboard.models';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AdminDeviceFleet Component (SCRUM-29 Device Trust & Compliance)', () => {
  let component: AdminDeviceFleet;
  let fixture: ComponentFixture<AdminDeviceFleet>;
  let dashboardService: DashboardService;

  const mockDevices: EnrolledDevice[] = [
    {
      id: 'test-mac-1',
      name: "Security Lead's MacBook Pro",
      model: 'Apple MacBook Pro M3 Max',
      type: 'macOS Workstation',
      osVersion: 'macOS Sequoia 15.1',
      ownerName: 'Alice Johnson',
      ownerEmail: 'alice@vanguard.security',
      department: 'Security Ops',
      biometricType: 'Touch ID',
      diskEncrypted: true,
      jailbroken: false,
      edrActive: true,
      complianceStatus: 'Compliant',
      enrolledAt: '2026-09-01T09:00:00Z',
      lastSync: '2 minutes ago',
    },
    {
      id: 'test-win-1',
      name: "DevOps Lead's ThinkPad",
      model: 'Lenovo ThinkPad X1 Gen 12',
      type: 'Windows Workstation',
      osVersion: 'Windows 11 Pro 24H2',
      ownerName: 'Bob Smith',
      ownerEmail: 'bob@vanguard.security',
      department: 'Engineering',
      biometricType: 'Windows Hello',
      diskEncrypted: true,
      jailbroken: false,
      edrActive: true,
      complianceStatus: 'Compliant',
      enrolledAt: '2026-09-02T10:00:00Z',
      lastSync: '5 minutes ago',
    },
    {
      id: 'test-phone-1',
      name: "Mobile Authenticator iPhone",
      model: 'Apple iPhone 16 Pro',
      type: 'Mobile iOS',
      osVersion: 'iOS 18.2',
      ownerName: 'Alice Johnson',
      ownerEmail: 'alice@vanguard.security',
      department: 'Security Ops',
      biometricType: 'Face ID',
      diskEncrypted: true,
      jailbroken: false,
      edrActive: false,
      complianceStatus: 'Warning',
      enrolledAt: '2026-09-03T11:00:00Z',
      lastSync: '1 hour ago',
    },
    {
      id: 'test-android-1',
      name: "Field Analyst Pixel",
      model: 'Google Pixel 9 Pro',
      type: 'Mobile Android',
      osVersion: 'Android 15',
      ownerName: 'Charlie Root',
      ownerEmail: 'charlie@vanguard.security',
      department: 'Field Ops',
      biometricType: 'Fingerprint',
      diskEncrypted: false,
      jailbroken: true,
      edrActive: false,
      complianceStatus: 'Revoked',
      enrolledAt: '2026-09-04T12:00:00Z',
      lastSync: '3 days ago',
    },
  ];

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [AdminDeviceFleet],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    dashboardService = TestBed.inject(DashboardService);
    dashboardService.activeTab.set('device-fleet');
    dashboardService.fleetDevices.set([...mockDevices]);

    fixture = TestBed.createComponent(AdminDeviceFleet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('should create AdminDeviceFleet component and initialize devices', () => {
    expect(component).toBeTruthy();
    expect(component.fleetDevices().length).toBe(4);
    expect(component.filteredFleetDevices().length).toBe(4);
  });

  it('should compute fleet metrics and compliance percentages accurately', () => {
    const metrics = component.fleetMetrics();
    expect(metrics.total).toBe(4);
    expect(metrics.compliant).toBe(2);
    expect(metrics.warning).toBe(1);
    expect(metrics.revoked).toBe(1);
    expect(metrics.compliantPercent).toBe(50);
    expect(metrics.biometricsPercent).toBe(100);
    expect(metrics.encryptedPercent).toBe(75);
  });

  it('should filter devices by search query matching name, owner, or OS', () => {
    component.searchTerm.set('ThinkPad');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(1);
    expect(component.filteredFleetDevices()[0].name).toContain('ThinkPad');

    component.searchTerm.set('Alice');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(2);

    component.searchTerm.set('NonExistentHardware');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(0);
  });

  it('should filter devices by operating system platform', () => {
    component.osFilter.set('macos');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(1);
    expect(component.filteredFleetDevices()[0].osVersion).toContain('macOS');

    component.osFilter.set('ios');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(1);
    expect(component.filteredFleetDevices()[0].type).toBe('Mobile iOS');

    component.osFilter.set('all');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(4);
  });

  it('should filter devices by compliance status posture', () => {
    component.statusFilter.set('Compliant');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(2);

    component.statusFilter.set('Warning');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(1);

    component.statusFilter.set('Revoked');
    fixture.detectChanges();
    expect(component.filteredFleetDevices().length).toBe(1);
  });

  it('should reset all filters when resetFilters() is invoked', () => {
    component.searchTerm.set('Test');
    component.osFilter.set('windows');
    component.statusFilter.set('Compliant');

    component.resetFilters();
    expect(component.searchTerm()).toBe('');
    expect(component.osFilter()).toBe('all');
    expect(component.statusFilter()).toBe('all');
    expect(component.filteredFleetDevices().length).toBe(4);
  });

  it('should toggle action dropdown menu and close on document click or escape key', () => {
    const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
    component.toggleActionDropdown('test-mac-1', mockEvent);
    expect(component.openActionDropdownId()).toBe('test-mac-1');

    component.onDocumentClick();
    expect(component.openActionDropdownId()).toBeNull();

    component.toggleActionDropdown('test-mac-1', mockEvent);
    expect(component.openActionDropdownId()).toBe('test-mac-1');
    component.onEscapeKey();
    expect(component.openActionDropdownId()).toBeNull();
  });

  it('should open Revoke SSO modal, execute revocation, and log audit event', async () => {
    vi.useFakeTimers();
    const targetDev = mockDevices[0];

    component.openRevokeSsoModal(targetDev);
    expect(component.showRevokeSsoModal()).toBe(true);
    expect(component.selectedDeviceForRevokeSso()?.id).toBe(targetDev.id);

    component.executeRevokeSso();
    expect(component.revokeSsoSuccess()).toBe(true);

    vi.advanceTimersByTime(1000);

    const updated = component.fleetDevices().find((d) => d.id === targetDev.id);
    expect(updated?.ssoRevokedAt).toBeDefined();
    expect(component.showRevokeSsoModal()).toBe(false);

    const logs = dashboardService.tenantAuditEvents();
    const revokeLog = logs.find((l: any) => (l.action || l.rawPayload?.action || '')?.includes('Revoked active SSO sessions'));
    expect(revokeLog).toBeDefined();

    vi.useRealTimers();
  });

  it('should open Mark Compromised modal, quarantine device, and update status', async () => {
    vi.useFakeTimers();
    const targetDev = mockDevices[1];

    component.openCompromisedModal(targetDev);
    expect(component.showCompromisedModal()).toBe(true);
    expect(component.selectedDeviceForCompromised()?.id).toBe(targetDev.id);

    component.executeMarkCompromised();
    expect(component.compromisedSuccess()).toBe(true);

    vi.advanceTimersByTime(1000);

    const updated = component.fleetDevices().find((d) => d.id === targetDev.id);
    expect(updated?.complianceStatus).toBe('Revoked');
    expect(updated?.isCompromised).toBe(true);
    expect(component.showCompromisedModal()).toBe(false);

    const logs = dashboardService.tenantAuditEvents();
    const compLog = logs.find((l: any) => (l.action || l.rawPayload?.action || '')?.includes('COMPROMISED'));
    expect(compLog).toBeDefined();

    vi.useRealTimers();
  });

  it('should open Remove Device modal and unregister device from directory', async () => {
    vi.useFakeTimers();
    const targetDev = mockDevices[2];

    component.openRemoveDeviceModal(targetDev);
    expect(component.showRemoveDeviceModal()).toBe(true);
    expect(component.selectedDeviceForRemove()?.id).toBe(targetDev.id);

    component.executeRemoveDevice();
    expect(component.removeDeviceSuccess()).toBe(true);

    vi.advanceTimersByTime(1000);

    expect(component.fleetDevices().find((d) => d.id === targetDev.id)).toBeUndefined();
    expect(component.showRemoveDeviceModal()).toBe(false);

    const logs = dashboardService.tenantAuditEvents();
    const removeLog = logs.find((l: any) => (l.action || l.rawPayload?.action || '')?.includes('Removed device'));
    expect(removeLog).toBeDefined();

    vi.useRealTimers();
  });

  it('should toggle device compliance status between Compliant and Warning', () => {
    const targetDev = mockDevices[0]; // currently Compliant
    component.toggleFleetDeviceCompliance(targetDev);

    let updated = component.fleetDevices().find((d) => d.id === targetDev.id);
    expect(updated?.complianceStatus).toBe('Warning');

    component.toggleFleetDeviceCompliance(updated!);
    updated = component.fleetDevices().find((d) => d.id === targetDev.id);
    expect(updated?.complianceStatus).toBe('Compliant');
  });

  it('should update endpoint compliance policy toggles reactively', () => {
    component.updateMobilePolicy('requireDiskEncryption', false);
    expect(component.mobilePolicy().requireDiskEncryption).toBe(false);

    component.updateMobilePolicy('enforceMinimumOs', false);
    expect(component.mobilePolicy().enforceMinimumOs).toBe(false);

    component.updateMobilePolicy('enforceBiometrics', false);
    expect(component.mobilePolicy().enforceBiometrics).toBe(false);

    component.updateMobilePolicy('blockJailbroken', false);
    expect(component.mobilePolicy().blockJailbroken).toBe(false);

    component.updateMobilePolicy('enforceNumberMatching', false);
    expect(component.mobilePolicy().enforceNumberMatching).toBe(false);
  });
});
