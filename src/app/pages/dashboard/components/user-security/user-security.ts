import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-user-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-security.html',
  styleUrl: './user-security.css'
})
export class UserSecurity {
  readonly dashboardService = inject(DashboardService);

  readonly activeTab = this.dashboardService.activeTab;
  readonly user = this.dashboardService.user;
  readonly hasTotpEnrolled = this.dashboardService.hasTotpEnrolled;
  readonly showEnrollTotpModal = this.dashboardService.showEnrollTotpModal;
  readonly totpQrUrl = this.dashboardService.totpQrUrl;
  readonly totpSecret = this.dashboardService.totpSecret;
  readonly totpEnrollError = this.dashboardService.totpEnrollError;
  readonly totpEnrollSuccess = this.dashboardService.totpEnrollSuccess;
  readonly recoveryCodes = this.dashboardService.recoveryCodes;
  readonly copiedCodes = this.dashboardService.copiedCodes;

  // SCRUM-57: Connected & Integrated Applications
  readonly connectedApps = this.dashboardService.connectedApps;
  readonly activeConnectedApps = this.dashboardService.activeConnectedApps;

  launchConnectedApp(app: any): void {
    this.dashboardService.launchConnectedApp(app);
  }

  disconnectApp(clientId: string): void {
    this.dashboardService.disconnectApp(clientId);
  }

  // SCRUM-32: Self-Service Password Modal & Status
  readonly showPasswordModal = this.dashboardService.showPasswordModal;
  readonly passwordUpdateError = this.dashboardService.passwordUpdateError;
  readonly passwordUpdateSuccess = this.dashboardService.passwordUpdateSuccess;
  readonly isSubmittingPassword = this.dashboardService.isSubmittingPassword;

  private readonly _currentPassword = signal<string>('');
  private readonly _newPassword = signal<string>('');
  private readonly _confirmPassword = signal<string>('');

  get currentPassword(): string { return this._currentPassword(); }
  set currentPassword(v: string) { this._currentPassword.set(v || ''); }

  get newPassword(): string { return this._newPassword(); }
  set newPassword(v: string) { this._newPassword.set(v || ''); }

  get confirmPassword(): string { return this._confirmPassword(); }
  set confirmPassword(v: string) { this._confirmPassword.set(v || ''); }

  readonly showCurrentPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  // Single-use code test redemption in UI
  testRecoveryCodeInput = '';
  readonly recoveryCodeRedeemResult = signal<string | null>(null);

  // Password Complexity Criteria
  readonly hasMinLength = computed(() => this._newPassword().length >= 8);
  readonly hasUppercase = computed(() => /[A-Z]/.test(this._newPassword()));
  readonly hasNumber = computed(() => /[0-9]/.test(this._newPassword()));
  readonly hasSpecialChar = computed(() => /[^A-Za-z0-9]/.test(this._newPassword()));
  readonly isPasswordMatch = computed(() => {
    const np = this._newPassword();
    const cp = this._confirmPassword();
    return !!np && np === cp;
  });
  readonly isPasswordValid = computed(() =>
    this.hasMinLength() &&
    this.hasUppercase() &&
    this.hasNumber() &&
    this.hasSpecialChar() &&
    this.isPasswordMatch() &&
    !!this._currentPassword().trim()
  );

  readonly passwordStrength = computed(() =>
    this.dashboardService.calculatePasswordStrength(this._newPassword())
  );

  // TOTP Actions
  get totpVerifyCode() { return this.dashboardService.totpVerifyCode; }
  set totpVerifyCode(v: string) { this.dashboardService.totpVerifyCode = v; }

  startEnrollTotp(): void { this.dashboardService.startEnrollTotp(); }
  closeEnrollTotpModal(): void { this.dashboardService.closeEnrollTotpModal(); }
  confirmEnrollTotp(): void { this.dashboardService.confirmEnrollTotp(); }
  disableTotp(): void { this.dashboardService.disableTotp(); }

  // Recovery Codes Actions
  copyRecoveryCodes(): void { this.dashboardService.copyRecoveryCodes(); }
  downloadRecoveryCodes(): void { this.dashboardService.downloadRecoveryCodes(); }
  generateRecoveryCodes(): void { this.dashboardService.generateRecoveryCodes(); }
  useRecoveryCode(code: string): boolean { return this.dashboardService.useRecoveryCode(code); }

  redeemRecoveryCode(): void {
    const code = this.testRecoveryCodeInput.trim();
    if (!code) return;
    const ok = this.useRecoveryCode(code);
    if (ok) {
      this.recoveryCodeRedeemResult.set(`✓ Code ${code} successfully redeemed. Single-use token invalidated.`);
      this.testRecoveryCodeInput = '';
    } else {
      this.recoveryCodeRedeemResult.set(`✕ Invalid or already consumed recovery code.`);
    }
    setTimeout(() => this.recoveryCodeRedeemResult.set(null), 4500);
  }

  // Password Update Modal Actions
  openChangePasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.dashboardService.openChangePasswordModal();
  }

  closeChangePasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.dashboardService.closeChangePasswordModal();
  }

  toggleShowCurrentPassword(): void {
    this.showCurrentPassword.update((v) => !v);
  }

  toggleShowNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  submitPasswordUpdate(): void {
    if (!this.currentPassword.trim()) {
      this.dashboardService.passwordUpdateError.set('Current password is required.');
      return;
    }
    if (!this.hasMinLength() || !this.hasUppercase() || !this.hasNumber() || !this.hasSpecialChar()) {
      this.dashboardService.passwordUpdateError.set('Password does not satisfy all complexity requirements.');
      return;
    }
    if (!this.isPasswordMatch()) {
      this.dashboardService.passwordUpdateError.set('Passwords do not match.');
      return;
    }
    if (this.currentPassword === this.newPassword) {
      this.dashboardService.passwordUpdateError.set('New password must be different from current password.');
      return;
    }

    this.dashboardService.submitPasswordChange(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        setTimeout(() => {
          this.closeChangePasswordModal();
        }, 1600);
      },
      error: () => {}
    });
  }
}
