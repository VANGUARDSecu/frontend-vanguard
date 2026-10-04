import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VerifyOtpComponent } from './verify-otp.component';
import { AuthService } from '../../services/auth.service';

describe('VerifyOtpComponent', () => {
  let component: VerifyOtpComponent;
  let fixture: ComponentFixture<VerifyOtpComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyOtpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(VerifyOtpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the verify OTP component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle between email OTP and TOTP methods', () => {
    expect(component.method()).toBe('email_otp');
    component.setMethod('totp');
    expect(component.method()).toBe('totp');
    component.setMethod('email_otp');
    expect(component.method()).toBe('email_otp');
  });

  it('should parse SSO parameters and resolve client display name', () => {
    component.ssoParams.set({
      client_id: 'vanguard-dummy-portal',
      redirect_uri: 'http://localhost:4201/auth/callback',
      state: 'state_123',
    });
    expect(component.clientDisplayName()).toBe('Acme Enterprise Portal');
  });

  it('should redirect back to client when user cancels SSO on verify OTP page', () => {
    component.ssoParams.set({
      client_id: 'vanguard-dummy-portal',
      redirect_uri: 'http://localhost:4201/auth/callback',
      state: 'state_456',
    });

    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    component.onCancelSso();
    expect(window.location.href).toContain('http://localhost:4201/auth/callback');
    expect(window.location.href).toContain('error=access_denied');
    expect(window.location.href).toContain('state=state_456');

    (window as any).location = originalLocation;
  });

  // ==========================================================================
  // SCRUM-61: SSO Multi-Factor Authentication Enforcement
  // ==========================================================================
  describe('SSO MFA Enforcement (SCRUM-61)', () => {
    it('should activate SSO verification mode and enforce 6-digit code length when challengeId is set', () => {
      component.challengeId.set('sso_mfa_test_123');
      expect(component.isSsoVerification()).toBe(true);
      expect(component.codeLength()).toBe(6);
      expect(component.separatorIndex()).toBe(2);
    });

    it('should submit SSO MFA verification to authService.verifySsoMfa and handle redirect', () => {
      const verifySpy = vi.spyOn(authService, 'verifySsoMfa').mockReturnValue(
        of({
          success: true,
          message: 'SSO MFA verified.',
          code: 'vg_code_sso_test',
          redirectUrl: 'http://localhost:4201/auth/callback?code=vg_code_sso_test',
        })
      );

      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { href: '' };

      component.challengeId.set('sso_mfa_test_123');
      component.digits.set(['6', '5', '4', '3', '2', '1']);

      component.onSubmit();

      expect(verifySpy).toHaveBeenCalledWith({
        challengeId: 'sso_mfa_test_123',
        code: '654321',
        method: 'email_otp',
      });
      expect(window.location.href).toBe('http://localhost:4201/auth/callback?code=vg_code_sso_test');

      (window as any).location = originalLocation;
    });

    it('should dispatch SSO MFA resend and trigger 60-second cooldown timer', () => {
      const resendSpy = vi.spyOn(authService, 'resendSsoOtp').mockReturnValue(
        of({
          success: true,
          message: 'New code sent',
          expiresInSeconds: 300,
          resendCooldownSeconds: 60,
        })
      );

      component.challengeId.set('sso_mfa_test_123');
      component.resendCountdown.set(0);
      component.onResendOtp();

      expect(resendSpy).toHaveBeenCalledWith({ challengeId: 'sso_mfa_test_123' });
      expect(component.resendCountdown()).toBe(60);
    });
  });
});
