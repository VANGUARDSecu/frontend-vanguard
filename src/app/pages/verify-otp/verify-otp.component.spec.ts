import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VerifyOtpComponent } from './verify-otp.component';

describe('VerifyOtpComponent', () => {
  let component: VerifyOtpComponent;
  let fixture: ComponentFixture<VerifyOtpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyOtpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

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
});
