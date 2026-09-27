import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserSecurity } from './user-security';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';

describe('UserSecurity Component (SCRUM-32 Self-Service Security & MFA Vault)', () => {
  let component: UserSecurity;
  let fixture: ComponentFixture<UserSecurity>;
  let dashboardService: DashboardService;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [UserSecurity],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-sec-1',
      email: 'employee.mfa@vanguard.security',
      firstName: 'Employee',
      lastName: 'Security',
      role: 'user',
      accountType: 'individual',
      companyName: 'Vanguard Security Corp',
    });

    dashboardService = TestBed.inject(DashboardService);
    fixture = TestBed.createComponent(UserSecurity);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the UserSecurity component', () => {
    expect(component).toBeTruthy();
  });

  // ==========================================
  // 1. TOTP Authenticator Enrollment (RFC 6238)
  // ==========================================
  describe('TOTP Authenticator Enrollment', () => {
    it('should open TOTP enrollment modal and load QR & secret', () => {
      vi.spyOn(authService, 'enrollTotp').mockReturnValue(
        of({
          success: true,
          secret: 'JBSWY3DPEHPK3PXP',
          qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=test',
          message: 'Scan QR code',
        })
      );

      component.startEnrollTotp();
      expect(component.showEnrollTotpModal()).toBe(true);
      expect(component.totpSecret()).toBe('JBSWY3DPEHPK3PXP');
      expect(component.totpQrUrl()).toContain('https://api.qrserver.com');

      component.closeEnrollTotpModal();
      expect(component.showEnrollTotpModal()).toBe(false);
    });

    it('should reject invalid 6-digit confirmation code on TOTP enrollment', () => {
      component.totpVerifyCode = '123';
      component.confirmEnrollTotp();
      expect(component.totpEnrollError()).toBe('Please enter a valid 6-digit confirmation code.');
      expect(component.hasTotpEnrolled()).toBe(false);
    });

    it('should confirm TOTP enrollment, activate status badge, and update state', () => {
      vi.spyOn(authService, 'confirmEnrollTotp').mockReturnValue(
        of({ success: true, message: 'Paired successfully' })
      );

      component.totpVerifyCode = '654321';
      component.confirmEnrollTotp();

      expect(component.totpEnrollSuccess()).toBe(true);
      expect(component.hasTotpEnrolled()).toBe(true);
      expect(localStorage.getItem('vanguard_user_has_totp')).toBe('true');
    });

    it('should allow de-enrolling TOTP authenticator', () => {
      component.dashboardService.hasTotpEnrolled.set(true);
      expect(component.hasTotpEnrolled()).toBe(true);

      component.disableTotp();
      expect(component.hasTotpEnrolled()).toBe(false);
      expect(localStorage.getItem('vanguard_user_has_totp')).toBe('false');
    });
  });

  // ==========================================
  // 2. Emergency Single-Use Recovery Backup Codes
  // ==========================================
  describe('Emergency Single-Use Recovery Codes', () => {
    it('should generate 10 cryptographically secure recovery codes', () => {
      component.generateRecoveryCodes();
      const codes = component.recoveryCodes();

      expect(codes.length).toBe(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^VANG-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
      expect(JSON.parse(localStorage.getItem('vanguard_recovery_codes') || '[]').length).toBe(10);
    });

    it('should copy recovery codes to clipboard', () => {
      component.generateRecoveryCodes();
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextSpy },
      });

      component.copyRecoveryCodes();
      expect(writeTextSpy).toHaveBeenCalledWith(component.recoveryCodes().join('\n'));
    });

    it('should track remaining unused recovery codes and support single-use consumption', () => {
      component.generateRecoveryCodes();
      const initialCodes = [...component.recoveryCodes()];
      expect(initialCodes.length).toBe(10);

      const codeToRedeem = initialCodes[0];
      const success = component.useRecoveryCode(codeToRedeem);
      expect(success).toBe(true);
      expect(component.recoveryCodes().length).toBe(9);
      expect(component.recoveryCodes().includes(codeToRedeem)).toBe(false);

      // Attempting to reuse the same code should fail
      const repeatSuccess = component.useRecoveryCode(codeToRedeem);
      expect(repeatSuccess).toBe(false);
      expect(component.recoveryCodes().length).toBe(9);
    });

    it('should support interactive single-use code redemption tester in UI', () => {
      component.generateRecoveryCodes();
      const targetCode = component.recoveryCodes()[0];

      component.testRecoveryCodeInput = targetCode;
      component.redeemRecoveryCode();
      expect(component.recoveryCodeRedeemResult()).toContain('successfully redeemed');
      expect(component.testRecoveryCodeInput).toBe('');
      expect(component.recoveryCodes().length).toBe(9);

      // Invalid code test
      component.testRecoveryCodeInput = 'VANG-INVALID-CODE';
      component.redeemRecoveryCode();
      expect(component.recoveryCodeRedeemResult()).toContain('Invalid or already consumed');
    });
  });

  // ==========================================
  // 3. Self-Service Password Update
  // ==========================================
  describe('Self-Service Password Update', () => {
    it('should open and close self-service password update modal', () => {
      component.openChangePasswordModal();
      expect(component.showPasswordModal()).toBe(true);

      component.closeChangePasswordModal();
      expect(component.showPasswordModal()).toBe(false);
      expect(component.currentPassword).toBe('');
      expect(component.newPassword).toBe('');
      expect(component.confirmPassword).toBe('');
    });

    it('should toggle password visibility flags', () => {
      expect(component.showCurrentPassword()).toBe(false);
      component.toggleShowCurrentPassword();
      expect(component.showCurrentPassword()).toBe(true);

      expect(component.showNewPassword()).toBe(false);
      component.toggleShowNewPassword();
      expect(component.showNewPassword()).toBe(true);

      expect(component.showConfirmPassword()).toBe(false);
      component.toggleShowConfirmPassword();
      expect(component.showConfirmPassword()).toBe(true);
    });

    it('should evaluate real-time complexity criteria and strength calculation', () => {
      component.currentPassword = 'OldPassword#2025!';
      component.newPassword = 'pass';
      component.confirmPassword = 'pass';

      expect(component.hasMinLength()).toBe(false);
      expect(component.hasUppercase()).toBe(false);
      expect(component.hasNumber()).toBe(false);
      expect(component.hasSpecialChar()).toBe(false);
      expect(component.isPasswordValid()).toBe(false);
      expect(component.passwordStrength().label).toBe('Weak');

      // Satisfy all criteria: >=8 chars, uppercase, number, special char
      component.newPassword = 'SecureVanguardPassword#2026!';
      component.confirmPassword = 'SecureVanguardPassword#2026!';

      expect(component.hasMinLength()).toBe(true);
      expect(component.hasUppercase()).toBe(true);
      expect(component.hasNumber()).toBe(true);
      expect(component.hasSpecialChar()).toBe(true);
      expect(component.isPasswordMatch()).toBe(true);
      expect(component.isPasswordValid()).toBe(true);
      expect(component.passwordStrength().score).toBeGreaterThanOrEqual(70);
    });

    it('should reject password update if current password is empty', () => {
      component.currentPassword = '';
      component.newPassword = 'SecureVanguardPassword#2026!';
      component.confirmPassword = 'SecureVanguardPassword#2026!';

      component.submitPasswordUpdate();
      expect(component.passwordUpdateError()).toBe('Current password is required.');
    });

    it('should reject password update if password complexity fails', () => {
      component.currentPassword = 'OldPassword#2025!';
      component.newPassword = 'simple';
      component.confirmPassword = 'simple';

      component.submitPasswordUpdate();
      expect(component.passwordUpdateError()).toBe('Password does not satisfy all complexity requirements.');
    });

    it('should reject password update if passwords do not match', () => {
      component.currentPassword = 'OldPassword#2025!';
      component.newPassword = 'SecureVanguardPassword#2026!';
      component.confirmPassword = 'MismatchPassword#2026!';

      component.submitPasswordUpdate();
      expect(component.passwordUpdateError()).toBe('Passwords do not match.');
    });

    it('should reject password update if new password is identical to current password', () => {
      component.currentPassword = 'SecureVanguardPassword#2026!';
      component.newPassword = 'SecureVanguardPassword#2026!';
      component.confirmPassword = 'SecureVanguardPassword#2026!';

      component.submitPasswordUpdate();
      expect(component.passwordUpdateError()).toBe('New password must be different from current password.');
    });

    it('should dispatch valid password update to service and indicate success', () => {
      const updateSpy = vi.spyOn(authService, 'updateSelfServicePassword').mockReturnValue(
        of({ success: true, message: 'Password updated successfully!' })
      );

      component.currentPassword = 'CurrentValidPassword#2025!';
      component.newPassword = 'BrandNewSecurePassword#2026!';
      component.confirmPassword = 'BrandNewSecurePassword#2026!';

      component.submitPasswordUpdate();

      expect(updateSpy).toHaveBeenCalledWith(
        'BrandNewSecurePassword#2026!',
        'CurrentValidPassword#2025!'
      );
      expect(component.passwordUpdateSuccess()).toBe(true);
    });
  });
});
