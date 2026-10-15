import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FirstTimerGuide } from './first-timer-guide';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../../../services/auth.service';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('FirstTimerGuide Component (SCRUM-86 Standard User Guide)', () => {
  let component: FirstTimerGuide;
  let fixture: ComponentFixture<FirstTimerGuide>;
  let dashboardService: DashboardService;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [FirstTimerGuide],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.currentUser.set({
      id: 'usr-employee-1',
      email: 'employee@vanguard.security',
      firstName: 'Alex',
      lastName: 'Chen',
      role: 'user',
      companyName: 'Vanguard Security Inc.',
    });

    dashboardService = TestBed.inject(DashboardService);
    fixture = TestBed.createComponent(FirstTimerGuide);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the FirstTimerGuide component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with 5 standard user onboarding checklist items and 0% progress', () => {
    expect(component.checklist().length).toBe(5);
    expect(component.progressPercent()).toBe(0);
    expect(component.activeTab()).toBe('checklist');
  });

  it('should toggle checklist items and recalculate progress percentage', () => {
    const firstItem = component.checklist()[0];
    expect(firstItem.completed).toBe(false);

    component.toggleItem(firstItem.id);
    expect(component.checklist()[0].completed).toBe(true);
    expect(component.progressPercent()).toBe(20);

    // Toggle again to uncheck
    component.toggleItem(firstItem.id);
    expect(component.checklist()[0].completed).toBe(false);
    expect(component.progressPercent()).toBe(0);
  });

  it('should reset all checklist items when resetChecklist is called', () => {
    component.toggleItem(component.checklist()[0].id);
    component.toggleItem(component.checklist()[1].id);
    expect(component.completedCount()).toBe(2);

    component.resetChecklist();
    expect(component.completedCount()).toBe(0);
    expect(component.progressPercent()).toBe(0);
  });

  it('should switch between checklist and walkthrough guide tabs', () => {
    expect(component.activeTab()).toBe('checklist');
    component.setActiveTab('guide');
    expect(component.activeTab()).toBe('guide');

    component.setActiveTab('checklist');
    expect(component.activeTab()).toBe('checklist');
  });

  it('should navigate walkthrough slides forwards and backwards within bounds', () => {
    component.setActiveTab('guide');
    expect(component.currentSlideIndex()).toBe(0);

    component.nextSlide();
    expect(component.currentSlideIndex()).toBe(1);

    component.previousSlide();
    expect(component.currentSlideIndex()).toBe(0);

    // Previous on 0 should stay at 0
    component.previousSlide();
    expect(component.currentSlideIndex()).toBe(0);

    // Go to last slide
    for (let i = 0; i < 10; i++) {
      component.nextSlide();
    }
    expect(component.currentSlideIndex()).toBe(component.slides.length - 1);
  });

  it('should navigate to target user portal tab and close modal on navigateAndClose', () => {
    const navSpy = vi.spyOn(dashboardService, 'navigateFromUserGuide');
    component.navigateAndClose('user-security');
    expect(navSpy).toHaveBeenCalledWith('user-security');
    expect(dashboardService.showFirstTimerGuide()).toBe(false);
  });

  it('should update dismissed state when toggleDismissForever is called', () => {
    const dismissSpy = vi.spyOn(dashboardService, 'setFirstTimerDismissed');
    component.toggleDismissForever(true);
    expect(dismissSpy).toHaveBeenCalledWith(true);
  });

  it('should strictly contain only standard user onboarding tasks and no admin console tasks', () => {
    const taskIds = component.checklist().map((t) => t.id);
    expect(taskIds).toContain('task-password');
    expect(taskIds).toContain('task-mfa');
    expect(taskIds).toContain('task-recovery');
    expect(taskIds).toContain('task-apps');
    expect(taskIds).toContain('task-network');

    // Verify no admin console concepts in titles or descriptions
    const allText = component.checklist().map((t) => `${t.title} ${t.description} ${t.targetTab}`).join(' ').toLowerCase();
    expect(allText).not.toContain('admin-directory');
    expect(allText).not.toContain('saml-oidc');
    expect(allText).not.toContain('cloud-ldap');
    expect(allText).not.toContain('cloud-radius');
    expect(allText).not.toContain('killswitch');
    expect(allText).not.toContain('provision employee');
  });
});
