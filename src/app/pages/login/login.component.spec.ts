import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize login form with empty fields and invalid status', () => {
    expect(component.loginForm.valid).toBeFalsy();
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
    expect(component.loginForm.get('rememberMe')?.value).toBe(false);
  });

  it('should validate email format and password length', () => {
    const emailControl = component.loginForm.get('email');
    const passwordControl = component.loginForm.get('password');

    emailControl?.setValue('invalid-email');
    passwordControl?.setValue('123');
    expect(emailControl?.valid).toBeFalsy();
    expect(passwordControl?.valid).toBeFalsy();

    emailControl?.setValue('user@example.com');
    passwordControl?.setValue('securePassword123');
    expect(emailControl?.valid).toBeTruthy();
    expect(passwordControl?.valid).toBeTruthy();
    expect(component.loginForm.valid).toBeTruthy();
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBeFalsy();
    component.togglePassword();
    expect(component.showPassword()).toBeTruthy();
    component.togglePassword();
    expect(component.showPassword()).toBeFalsy();
  });

  it('should toggle remember me value', () => {
    expect(component.loginForm.get('rememberMe')?.value).toBe(false);
    component.toggleRememberMe();
    expect(component.loginForm.get('rememberMe')?.value).toBe(true);
  });

  it('should manage timed notifications and dismiss properly', () => {
    expect(component.notification()).toBeNull();

    component.showNotification('error', 'Test error message', 5000);
    expect(component.notification()).toEqual({ type: 'error', message: 'Test error message' });

    component.dismissNotification();
    expect(component.notification()).toBeNull();
  });
});
