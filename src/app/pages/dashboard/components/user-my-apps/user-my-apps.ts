import { Component, inject, signal, computed } from '@angular/core';
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
  PersonalVaultItem,
  AppAccessRequest,
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
  readonly personalApps = this.dashboardService.personalApps;
  readonly isPersonalWorkspace = this.dashboardService.isPersonalWorkspace;
  readonly activeAppsList = this.dashboardService.activeAppsList;
  readonly filteredApps = this.dashboardService.filteredApps;
  readonly showRequestAppModal = this.dashboardService.showRequestAppModal;
  readonly requestAppSuccess = this.dashboardService.requestAppSuccess;
  readonly myAccessRequests = this.dashboardService.myAccessRequests;
  readonly pendingRequestsCount = computed(() =>
    this.myAccessRequests().filter((r) => r.status === 'Pending Approval').length
  );

  // Personal Application Modal State
  readonly showAddPersonalAppModal = signal<boolean>(false);
  readonly addAppError = signal<string | null>(null);
  newAppName = '';
  newAppUrl = '';
  newAppCategory: 'cloud' | 'developer' | 'collaboration' = 'collaboration';
  newAppDescription = '';
  newAppIcon = '🌐';

  get requestedAppName() { return this.dashboardService.requestedAppName; }
  set requestedAppName(v: string) { this.dashboardService.requestedAppName = v; }
  get requestAppJustification() { return this.dashboardService.requestAppJustification; }
  set requestAppJustification(v: string) { this.dashboardService.requestAppJustification = v; }

  setCategory(category: 'all' | 'cloud' | 'developer' | 'collaboration') { this.dashboardService.setCategory(category); }
  launchApp(app: SaaSApp) { this.dashboardService.launchApp(app); }
  openRequestAppModal() { this.dashboardService.openRequestAppModal(); }
  closeRequestAppModal() { this.dashboardService.closeRequestAppModal(); }
  submitAppRequest() { this.dashboardService.submitAppRequest(); }

  launchApprovedRequest(req: AppAccessRequest): void {
    const existing = this.apps().find((a) => a.name.toLowerCase() === req.appName.toLowerCase());
    if (existing) {
      this.launchApp(existing);
    } else {
      const app: SaaSApp = {
        id: req.id,
        name: req.appName,
        category: req.category,
        description: req.justification,
        icon: req.icon || '🚀',
        protocol: req.protocol,
        launchUrl: req.launchUrl || 'https://vanguard.security',
        assigned: true,
        status: 'Approved',
      };
      this.launchApp(app);
    }
  }

  // Personal App Launcher Actions
  openAddPersonalAppModal(): void {
    this.newAppName = '';
    this.newAppUrl = '';
    this.newAppCategory = 'collaboration';
    this.newAppDescription = '';
    this.newAppIcon = '🌐';
    this.addAppError.set(null);
    this.showAddPersonalAppModal.set(true);
  }

  closeAddPersonalAppModal(): void {
    this.showAddPersonalAppModal.set(false);
    this.addAppError.set(null);
  }

  applyPreset(preset: 'figma' | 'facebook' | 'github' | 'notion' | 'google' | 'custom'): void {
    this.addAppError.set(null);
    switch (preset) {
      case 'figma':
        this.newAppName = 'Figma';
        this.newAppUrl = 'https://www.figma.com/login';
        this.newAppCategory = 'collaboration';
        this.newAppIcon = '🎨';
        this.newAppDescription = 'Collaborative interface design & prototyping suite';
        break;
      case 'facebook':
        this.newAppName = 'Facebook';
        this.newAppUrl = 'https://www.facebook.com/login';
        this.newAppCategory = 'collaboration';
        this.newAppIcon = '📘';
        this.newAppDescription = 'Social network & Meta business suite';
        break;
      case 'github':
        this.newAppName = 'GitHub';
        this.newAppUrl = 'https://github.com/login';
        this.newAppCategory = 'developer';
        this.newAppIcon = '🐙';
        this.newAppDescription = 'Git repository hosting & developer platform';
        break;
      case 'notion':
        this.newAppName = 'Notion';
        this.newAppUrl = 'https://www.notion.so/login';
        this.newAppCategory = 'collaboration';
        this.newAppIcon = '📝';
        this.newAppDescription = 'Connected workspace for wiki, docs & project notes';
        break;
      case 'google':
        this.newAppName = 'Google Account';
        this.newAppUrl = 'https://accounts.google.com';
        this.newAppCategory = 'cloud';
        this.newAppIcon = '🔍';
        this.newAppDescription = 'Google workspace, Drive, and identity authentication';
        break;
      case 'custom':
        this.newAppName = '';
        this.newAppUrl = 'https://';
        this.newAppCategory = 'cloud';
        this.newAppIcon = '🌐';
        this.newAppDescription = '';
        break;
    }
  }

  submitAddPersonalApp(): void {
    if (!this.newAppName.trim()) {
      this.addAppError.set('Please provide an application name.');
      return;
    }
    if (!this.newAppUrl.trim() || !this.newAppUrl.includes('.')) {
      this.addAppError.set('Please provide a valid website or login URL.');
      return;
    }

    let formattedUrl = this.newAppUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    this.dashboardService.addPersonalApp({
      name: this.newAppName.trim(),
      launchUrl: formattedUrl,
      category: this.newAppCategory,
      description: this.newAppDescription.trim() || `${this.newAppName.trim()} web application`,
      icon: this.newAppIcon || '🌐',
    });

    this.closeAddPersonalAppModal();
  }

  deletePersonalApp(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.dashboardService.deletePersonalApp(id);
  }

  getMatchingVaultCredentials(app: SaaSApp): PersonalVaultItem[] {
    return this.dashboardService.findCredentialsForDomain(app.launchUrl || app.name);
  }
}

