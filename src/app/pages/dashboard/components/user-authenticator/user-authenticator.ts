import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { TotpAccount } from '../../models/dashboard.models';

@Component({
  selector: 'app-user-authenticator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-authenticator.html',
  styleUrl: './user-authenticator.css'
})
export class UserAuthenticator {
  readonly dashboardService = inject(DashboardService);

  readonly totpAccounts = this.dashboardService.totpAccounts;
  readonly activeTotpAccounts = this.dashboardService.activeTotpAccounts;
  readonly totpSecondsRemaining = this.dashboardService.totpSecondsRemaining;

  // Percentage for timer bar
  readonly timePercent = computed(() => {
    return Math.round((this.totpSecondsRemaining() / 30) * 100);
  });

  // Copied code feedback
  readonly copiedAccountId = signal<string | null>(null);

  // Add Account Modal
  readonly showAddModal = signal<boolean>(false);
  formIssuer = '';
  formAccountName = '';
  formSecret = '';
  readonly formErrorMessage = signal<string | null>(null);

  openAddModal(): void {
    this.formIssuer = '';
    this.formAccountName = '';
    this.formSecret = '';
    this.formErrorMessage.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.formErrorMessage.set(null);
  }

  formatCode(code?: string): string {
    if (!code) return '------';
    const trimmed = code.trim();
    if (trimmed.length === 6) {
      return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
    }
    return trimmed;
  }

  copyCode(code?: string, id?: string): void {
    if (!code || !id) return;
    navigator.clipboard?.writeText(code).then(() => {
      this.copiedAccountId.set(id);
      setTimeout(() => {
        if (this.copiedAccountId() === id) {
          this.copiedAccountId.set(null);
        }
      }, 2500);
    });
  }

  deleteAccount(id: string, issuer: string): void {
    if (confirm(`Are you sure you want to remove the 2FA authenticator code for ${issuer}? You will no longer be able to generate one-time codes for this account.`)) {
      this.dashboardService.deleteTotpAccount(id);
    }
  }

  saveAccount(): void {
    const issuer = this.formIssuer.trim();
    const accountName = this.formAccountName.trim();
    const secret = this.formSecret.trim().replace(/\s+/g, '').toUpperCase();

    if (!issuer) {
      this.formErrorMessage.set('Service/Issuer name is required.');
      return;
    }
    if (!secret) {
      this.formErrorMessage.set('Secret key is required.');
      return;
    }

    this.dashboardService.addTotpAccount({
      issuer,
      accountName: accountName || 'Primary Account',
      secret
    });

    this.closeAddModal();
  }
}
