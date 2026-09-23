import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UserMyApps } from './user-my-apps';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';

describe('UserMyApps Component (SCRUM-52 Multi-Workspace & Personal App Launcher)', () => {
  let component: UserMyApps;
  let fixture: ComponentFixture<UserMyApps>;
  let dashboardService: DashboardService;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [UserMyApps],
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
    dashboardService.switchWorkspace('personal');

    fixture = TestBed.createComponent(UserMyApps);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the UserMyApps component', () => {
    expect(component).toBeTruthy();
  });

  it('should reflect personal workspace mode correctly with zero hardcoded apps', () => {
    expect(component.isPersonalWorkspace()).toBe(true);
    expect(component.personalApps().length).toBe(0);
    expect(component.activeAppsList().length).toBe(0);
  });

  it('should apply quick presets for popular applications like Figma and Facebook', () => {
    component.openAddPersonalAppModal();
    expect(component.showAddPersonalAppModal()).toBe(true);

    component.applyPreset('figma');
    expect(component.newAppName).toBe('Figma');
    expect(component.newAppUrl).toBe('https://www.figma.com/login');
    expect(component.newAppCategory).toBe('collaboration');

    component.applyPreset('facebook');
    expect(component.newAppName).toBe('Facebook');
    expect(component.newAppUrl).toBe('https://www.facebook.com/login');
  });

  it('should validate inputs when adding a personal application', () => {
    component.openAddPersonalAppModal();
    component.newAppName = '';
    component.newAppUrl = '';
    component.submitAddPersonalApp();

    expect(component.addAppError()).toBe('Please provide an application name.');
    expect(component.showAddPersonalAppModal()).toBe(true);

    component.newAppName = 'Custom Service';
    component.newAppUrl = 'not-a-valid-url';
    component.submitAddPersonalApp();
    expect(component.addAppError()).toBe('Please provide a valid website or login URL.');
  });

  it('should successfully add and remove a personal application', () => {
    const initialCount = component.personalApps().length;
    component.openAddPersonalAppModal();
    component.newAppName = 'Custom Cloud Hub';
    component.newAppUrl = 'https://cloudhub.io/login';
    component.newAppCategory = 'cloud';
    component.newAppDescription = 'Cloud storage test app';
    component.submitAddPersonalApp();

    expect(component.showAddPersonalAppModal()).toBe(false);
    expect(component.personalApps().length).toBe(initialCount + 1);
    expect(component.personalApps()[0].name).toBe('Custom Cloud Hub');

    // Remove the newly created app
    const createdId = component.personalApps()[0].id;
    component.deletePersonalApp(createdId);
    expect(component.personalApps().length).toBe(initialCount);
  });

  it('should match domain credentials for web extension autofill integration', () => {
    dashboardService.addVaultItem({
      title: 'Figma Cloud',
      category: 'Login',
      username: 'designer@test.com',
      password: 'FigmaPassword123!',
      url: 'https://www.figma.com/login',
    });
    dashboardService.addPersonalApp({
      name: 'Figma',
      launchUrl: 'https://www.figma.com/login',
      category: 'collaboration',
    });
    fixture.detectChanges();

    const figmaApp = component.personalApps().find((a) => a.name.toLowerCase().includes('figma'));
    expect(figmaApp).toBeDefined();
    if (figmaApp) {
      const matched = component.getMatchingVaultCredentials(figmaApp);
      expect(matched.length).toBeGreaterThanOrEqual(1);
      expect(matched[0].url).toContain('figma.com');
    }
  });

  it('should switch between personal workspace and organization context', () => {
    dashboardService.switchWorkspace('org_root');
    expect(dashboardService.isPersonalWorkspace()).toBe(false);
    expect(dashboardService.activeOrganization().id).toBe('org_root');

    dashboardService.switchWorkspace('personal');
    expect(dashboardService.isPersonalWorkspace()).toBe(true);
    expect(dashboardService.activeOrganization().id).toBe('personal');
  });

  it('should filter personal applications by category', () => {
    dashboardService.addPersonalApp({
      name: 'GitHub',
      launchUrl: 'https://github.com',
      category: 'developer',
    });
    dashboardService.addPersonalApp({
      name: 'Slack',
      launchUrl: 'https://slack.com',
      category: 'collaboration',
    });
    fixture.detectChanges();

    component.setCategory('developer');
    const devApps = component.filteredApps();
    expect(devApps.every((a) => a.category === 'developer')).toBe(true);

    component.setCategory('all');
    expect(component.filteredApps().length).toBe(component.personalApps().length);
  });
});
