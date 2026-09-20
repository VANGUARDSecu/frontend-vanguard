import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { TenantOrganization, TenantBranding } from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css',
})
export class AdminSettings implements OnInit {
  readonly dashboardService = inject(DashboardService);

  // Settings subtab navigation
  readonly settingsSubTab = signal<'governance' | 'branding' | 'tenants'>('governance');

  // Current authenticated user
  readonly user = this.dashboardService.user;

  // Multi-Tenant State
  readonly organizations = this.dashboardService.organizations;
  readonly activeOrganization = this.dashboardService.activeOrganization;
  readonly activeOrganizationId = this.dashboardService.activeOrganizationId;
  readonly showCreateOrgModal = this.dashboardService.showCreateOrgModal;
  readonly newOrgName = this.dashboardService.newOrgName;
  readonly newOrgTier = this.dashboardService.newOrgTier;
  readonly newOrgDomain = this.dashboardService.newOrgDomain;
  readonly newOrgError = this.dashboardService.newOrgError;

  // Branding State
  readonly tenantBranding = this.dashboardService.tenantBranding;
  readonly domainVerificationStatus = this.dashboardService.domainVerificationStatus;
  readonly brandingSavedNotice = this.dashboardService.brandingSavedNotice;

  // Zero-Trust Governance State
  readonly activeTab = this.dashboardService.activeTab;
  readonly organizationName = this.dashboardService.organizationName;
  readonly enforceMfaAll = this.dashboardService.enforceMfaAll;
  readonly blockHighRiskIps = this.dashboardService.blockHighRiskIps;
  readonly showGlobalKillswitchModal = this.dashboardService.showGlobalKillswitchModal;

  // Local Branding Form Signals
  readonly brandCompanyName = signal<string>('');
  readonly brandAccentColor = signal<string>('#3b82f6');
  readonly brandLogoUrl = signal<string>('');
  readonly brandCustomDomain = signal<string>('');
  readonly brandSupportEmail = signal<string>('');
  readonly brandGreeting = signal<string>('');
  readonly brandButtonText = signal<string>('');
  readonly logoUploadError = signal<string | null>(null);

  // Preset Palettes
  readonly colorPresets = [
    { name: 'Vanguard Blue', hex: '#3b82f6' },
    { name: 'Cyber Cyan', hex: '#06b6d4' },
    { name: 'Matrix Emerald', hex: '#10b981' },
    { name: 'Neon Purple', hex: '#a855f7' },
    { name: 'Amber Gold', hex: '#f59e0b' },
    { name: 'Crimson Red', hex: '#ef4444' },
  ];

  ngOnInit(): void {
    this.syncBrandingForm();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showCreateOrgModal()) {
      this.closeCreateOrg();
    }
  }

  syncBrandingForm(): void {
    const b = this.tenantBranding();
    this.brandCompanyName.set(b.companyName);
    this.brandAccentColor.set(b.primaryAccentColor);
    this.brandLogoUrl.set(b.logoUrl || '');
    this.brandCustomDomain.set(b.ssoCustomDomain);
    this.brandSupportEmail.set(b.supportEmail || '');
    this.brandGreeting.set(b.emailCustomGreeting || 'Welcome to your enterprise Zero-Trust Identity workspace.');
    this.brandButtonText.set(b.emailButtonText || 'Activate Account & Set Password');
  }

  setSubTab(tab: 'governance' | 'branding' | 'tenants'): void {
    this.settingsSubTab.set(tab);
    if (tab === 'branding') {
      this.syncBrandingForm();
    }
  }

  selectPresetColor(hex: string): void {
    this.brandAccentColor.set(hex);
    this.dashboardService.applyBrandAccent(hex);
  }

  onCustomColorChange(hex: string): void {
    this.brandAccentColor.set(hex);
    this.dashboardService.applyBrandAccent(hex);
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.logoUploadError.set(null);

    if (!['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.logoUploadError.set('Only PNG, SVG, WEBP, or JPEG images are supported.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.logoUploadError.set('Image size must be less than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.brandLogoUrl.set(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.brandLogoUrl.set('');
  }

  saveBranding(): void {
    const customDomain = this.brandCustomDomain().trim();
    this.dashboardService.saveBrandingSettings({
      companyName: this.brandCompanyName().trim() || this.activeOrganization().name,
      primaryAccentColor: this.brandAccentColor(),
      logoUrl: this.brandLogoUrl().trim(),
      ssoCustomDomain: customDomain,
      supportEmail: this.brandSupportEmail().trim(),
      emailCustomGreeting: this.brandGreeting().trim(),
      emailButtonText: this.brandButtonText().trim(),
    });
  }

  resetBranding(): void {
    if (confirm('Reset white-label branding to default Vanguard cyber theme?')) {
      this.dashboardService.resetBrandingToDefaults();
      this.syncBrandingForm();
    }
  }

  verifyDns(): void {
    this.dashboardService.verifyCustomDomainDns();
  }

  switchOrg(id: string): void {
    this.dashboardService.switchOrganization(id);
    this.syncBrandingForm();
  }

  deleteOrg(id: string): void {
    if (confirm('Are you sure you want to delete this tenant organization?')) {
      this.dashboardService.deleteOrganization(id);
    }
  }

  openCreateOrg(): void {
    this.dashboardService.openCreateOrgModal();
  }

  closeCreateOrg(): void {
    this.dashboardService.closeCreateOrgModal();
  }

  createOrg(): void {
    this.dashboardService.createOrganization();
  }

  // Governance toggles
  toggleEnforceMfa(): void {
    this.dashboardService.toggleEnforceMfa();
  }

  toggleBlockHighRiskIps(): void {
    this.dashboardService.toggleBlockHighRiskIps();
  }

  openGlobalKillswitchModal(): void {
    this.dashboardService.openGlobalKillswitchModal();
  }
}
