import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the register component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid empty form', () => {
    expect(component.registerForm.valid).toBeFalsy();
  });

  it('should validate password matching', () => {
    component.registerForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Security',
      email: 'john@acme.com',
      phone: '+15550192834',
      password: 'Password123',
      confirmPassword: 'MismatchPassword',
      agreeTerms: true,
    });

    expect(component.registerForm.errors?.['passwordMismatch']).toBeTruthy();

    component.registerForm.patchValue({
      confirmPassword: 'Password123',
    });

    expect(component.registerForm.errors?.['passwordMismatch']).toBeFalsy();
    expect(component.registerForm.valid).toBeTruthy();
  });

  it('should switch account type between individual and company and adjust validators', () => {
    expect(component.accountType()).toBe('individual');
    expect(component.registerForm.get('companyName')?.hasError('required')).toBeFalsy();

    component.setAccountType('company');
    expect(component.accountType()).toBe('company');
    expect(component.registerForm.get('companyName')?.hasError('required')).toBeTruthy();

    component.setAccountType('individual');
    expect(component.accountType()).toBe('individual');
    expect(component.registerForm.get('companyName')?.hasError('required')).toBeFalsy();
  });
});
