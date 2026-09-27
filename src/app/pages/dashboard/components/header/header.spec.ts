import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardHeader } from './header';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';
import { vi } from 'vitest';

describe('DashboardHeader Component (SCRUM-28 Header Org Switcher)', () => {
  let component: DashboardHeader;
  let fixture: ComponentFixture<DashboardHeader>;
  let dashboardService: DashboardService;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [DashboardHeader],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-corp-lead',
      email: 'lead@sentinel-defense.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'admin',
      companyName: 'Sentinel Defense Group',
    });

    dashboardService = TestBed.inject(DashboardService);
    fixture = TestBed.createComponent(DashboardHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the dashboard header component', () => {
    expect(component).toBeTruthy();
  });

  it('should display active organization from user profile dynamically', () => {
    const active = component.activeOrganization();
    expect(active.name).toBe('Sentinel Defense Group');
    expect(component.showOrgDropdown()).toBe(false);
  });

  it('should toggle organization switcher dropdown and close on escape key', () => {
    component.toggleOrgDropdown();
    expect(component.showOrgDropdown()).toBe(true);

    component.onEscape();
    expect(component.showOrgDropdown()).toBe(false);
  });

  it('should close dropdown when clicking outside', () => {
    component.toggleOrgDropdown();
    expect(component.showOrgDropdown()).toBe(true);

    // Click outside
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    const clickEvt = new MouseEvent('click', { bubbles: true });
    outsideEl.dispatchEvent(clickEvt);

    component.onDocumentClick(clickEvt);
    expect(component.showOrgDropdown()).toBe(false);
    outsideEl.remove();
  });

  it('should switch organization via dropdown and close dropdown', () => {
    const switchSpy = vi.spyOn(dashboardService, 'switchOrganization');
    component.toggleOrgDropdown();

    component.switchOrg('org_root');
    expect(switchSpy).toHaveBeenCalledWith('org_root');
    expect(component.showOrgDropdown()).toBe(false);
  });

  it('should trigger create organization modal from dropdown', () => {
    const openSpy = vi.spyOn(dashboardService, 'openCreateOrgModal');
    component.toggleOrgDropdown();

    component.openCreateOrgModal();
    expect(openSpy).toHaveBeenCalled();
    expect(component.showOrgDropdown()).toBe(false);
  });

  it('should route to branding studio in settings from dropdown', () => {
    const tabSpy = vi.spyOn(dashboardService, 'setActiveTab');
    component.toggleOrgDropdown();

    component.goToBrandingStudio();
    expect(tabSpy).toHaveBeenCalledWith('settings');
    expect(component.showOrgDropdown()).toBe(false);
  });

  it('should display Individual role tag and hide organization switcher for individual accounts', () => {
    authService.currentUser.set({
      id: 'usr-individual-1',
      email: 'alex@personal.vault',
      firstName: 'Alex',
      lastName: 'Mercer',
      role: 'user',
      accountType: 'individual',
    });
    fixture.detectChanges();

    expect(component.isIndividual()).toBe(true);
    expect(component.userRoleLabel()).toBe('Individual');

    // Workspace switcher and upgrade button should not be rendered
    const orgSwitcher = fixture.nativeElement.querySelector('.org-switcher-container');
    expect(orgSwitcher).toBeNull();

    const upgradeBtn = fixture.nativeElement.querySelector('.individual-upgrade-wrapper');
    expect(upgradeBtn).toBeNull();
  });
});
