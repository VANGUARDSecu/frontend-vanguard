import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { UserOnboardingChecklistItem, UserGuideWalkthroughSlide } from '../../models/dashboard.models';

@Component({
  selector: 'app-first-timer-guide',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './first-timer-guide.html',
  styleUrl: './first-timer-guide.css'
})
export class FirstTimerGuide {
  readonly dashboardService = inject(DashboardService);

  readonly checklist = this.dashboardService.firstTimerChecklist;
  readonly completedCount = this.dashboardService.firstTimerCompletedCount;
  readonly totalCount = this.dashboardService.firstTimerTotalCount;
  readonly progressPercent = this.dashboardService.firstTimerProgressPercent;
  readonly activeTab = this.dashboardService.firstTimerGuideActiveTab;
  readonly isDismissed = this.dashboardService.firstTimerCompleted;
  readonly slides: UserGuideWalkthroughSlide[] = this.dashboardService.userGuideWalkthroughSlides;

  readonly currentSlideIndex = signal<number>(0);
  readonly currentSlide = computed<UserGuideWalkthroughSlide>(() => {
    const idx = this.currentSlideIndex();
    return this.slides[idx] || this.slides[0];
  });

  setActiveTab(tab: 'checklist' | 'guide'): void {
    this.dashboardService.firstTimerGuideActiveTab.set(tab);
  }

  toggleItem(itemId: string): void {
    this.dashboardService.toggleUserChecklistItem(itemId);
  }

  resetChecklist(): void {
    this.dashboardService.resetUserChecklist();
  }

  nextSlide(): void {
    if (this.currentSlideIndex() < this.slides.length - 1) {
      this.currentSlideIndex.update((i) => i + 1);
    }
  }

  previousSlide(): void {
    if (this.currentSlideIndex() > 0) {
      this.currentSlideIndex.update((i) => i - 1);
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlideIndex.set(index);
    }
  }

  navigateAndClose(targetTab: string): void {
    this.dashboardService.navigateFromUserGuide(targetTab);
  }

  toggleDismissForever(val: boolean): void {
    this.dashboardService.setFirstTimerDismissed(val);
  }

  onDismissChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.toggleDismissForever(checkbox.checked);
  }

  closeGuide(): void {
    this.dashboardService.closeFirstTimerGuide();
  }
}
