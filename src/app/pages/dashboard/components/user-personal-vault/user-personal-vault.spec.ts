import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UserPersonalVault } from './user-personal-vault';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';

describe('UserPersonalVault Component (SCRUM-50 Personal Credential Manager)', () => {
  let component: UserPersonalVault;
  let fixture: ComponentFixture<UserPersonalVault>;
  let dashboardService: DashboardService;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [UserPersonalVault],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-indiv-1',
      email: 'alex@personal.me',
      firstName: 'Alex',
      lastName: 'Mercer',
      role: 'user',
      accountType: 'individual',
      companyName: "Alex's Personal Vault",
    });

    dashboardService = TestBed.inject(DashboardService);
    fixture = TestBed.createComponent(UserPersonalVault);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the UserPersonalVault component', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial seed credentials in personal vault', () => {
    expect(component.vaultItems().length).toBeGreaterThanOrEqual(3);
    expect(component.filteredVaultItems().length).toBe(component.vaultItems().length);
  });

  it('should filter items by category and search query', () => {
    component.setCategory('Login');
    fixture.detectChanges();
    for (const item of component.filteredVaultItems()) {
      expect(item.category).toBe('Login');
    }

    component.setCategory('all');
    component.setSearch('GitHub');
    fixture.detectChanges();
    expect(component.filteredVaultItems().some((i) => i.title.includes('GitHub'))).toBe(true);
  });

  it('should toggle password visibility for a specific credential', () => {
    const item = component.vaultItems()[0];
    expect(component.isPasswordRevealed(item.id)).toBe(false);

    component.togglePasswordVisibility(item.id);
    expect(component.isPasswordRevealed(item.id)).toBe(true);

    component.togglePasswordVisibility(item.id);
    expect(component.isPasswordRevealed(item.id)).toBe(false);
  });

  it('should toggle favorite status of a credential', () => {
    const item = component.vaultItems()[0];
    const initialFavorite = !!item.favorite;

    component.toggleFavorite(item.id);
    const updated = component.vaultItems().find((i) => i.id === item.id);
    expect(updated?.favorite).toBe(!initialFavorite);
  });

  it('should add a new credential via modal', () => {
    component.openAddModal();
    expect(component.showAddModal()).toBe(true);

    component.formTitle = 'Cloudflare Zero-Trust API';
    component.formCategory = 'Login';
    component.formUsername = 'ops@cloudflare.com';
    component.formPassword = 'CF_Secret_Key_99182#';
    component.formFavorite = true;

    component.saveCredential();
    expect(component.showAddModal()).toBe(false);

    const added = component.vaultItems().find((i) => i.title === 'Cloudflare Zero-Trust API');
    expect(added).toBeDefined();
    expect(added?.username).toBe('ops@cloudflare.com');
    expect(added?.favorite).toBe(true);
  });

  it('should edit an existing credential', () => {
    const target = component.vaultItems()[0];
    component.openEditModal(target);
    expect(component.showAddModal()).toBe(true);
    expect(component.formTitle).toBe(target.title);

    component.formTitle = 'Updated Credential Title';
    component.saveCredential();

    const updated = component.vaultItems().find((i) => i.id === target.id);
    expect(updated?.title).toBe('Updated Credential Title');
  });

  it('should generate a strong password with custom length and entropy', () => {
    component.openGeneratorModal();
    expect(component.showGeneratorModal()).toBe(true);

    component.genLength = 24;
    component.regeneratePassword();
    const pw = component.generatedPassword();

    expect(pw.length).toBe(24);
    const strength = component.generatedPasswordStrength();
    expect(strength.score).toBeGreaterThanOrEqual(70);
  });
});
