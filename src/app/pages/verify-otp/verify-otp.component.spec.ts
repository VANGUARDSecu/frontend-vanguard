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
});
