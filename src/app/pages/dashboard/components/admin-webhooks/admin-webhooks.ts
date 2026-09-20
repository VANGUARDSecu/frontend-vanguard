import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import {
  WebhookEventType,
  WebhookEndpoint,
  WebhookDelivery,
} from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-webhooks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-webhooks.html',
  styleUrl: './admin-webhooks.css',
})
export class AdminWebhooks {
  readonly dashboardService = inject(DashboardService);

  // Subtab switching
  readonly activeSubTab = signal<'endpoints' | 'deliveries'>('endpoints');

  // Service Signals
  readonly webhookEndpoints = this.dashboardService.webhookEndpoints;
  readonly webhookDeliveries = this.dashboardService.webhookDeliveries;
  readonly filteredWebhookEndpoints = this.dashboardService.filteredWebhookEndpoints;
  readonly filteredWebhookDeliveries = this.dashboardService.filteredWebhookDeliveries;
  readonly webhookMetrics = this.dashboardService.webhookMetrics;

  // Filter & Search bindings
  readonly webhookSearchQuery = this.dashboardService.webhookSearchQuery;
  readonly webhookEventFilter = this.dashboardService.webhookEventFilter;
  readonly webhookDeliveryStatusFilter = this.dashboardService.webhookDeliveryStatusFilter;

  // Modal Signals
  readonly showWebhookModal = this.dashboardService.showWebhookModal;
  readonly editingWebhook = this.dashboardService.editingWebhook;
  readonly showTestWebhookModal = this.dashboardService.showTestWebhookModal;
  readonly selectedWebhookForTest = this.dashboardService.selectedWebhookForTest;
  readonly selectedDeliveryDetails = this.dashboardService.selectedDeliveryDetails;
  readonly testEventSending = this.dashboardService.testEventSending;
  readonly testEventResult = this.dashboardService.testEventResult;

  // Form Signals
  readonly webhookUrl = this.dashboardService.webhookUrl;
  readonly webhookDescription = this.dashboardService.webhookDescription;
  readonly webhookSecret = this.dashboardService.webhookSecret;
  readonly webhookEvents = this.dashboardService.webhookEvents;
  readonly webhookFormError = this.dashboardService.webhookFormError;
  readonly testEventType = this.dashboardService.testEventType;
  readonly testEventCustomPayload = this.dashboardService.testEventCustomPayload;

  // UI state for secret revelation
  readonly revealedSecrets = signal<Record<string, boolean>>({});
  readonly copiedSecretId = signal<string | null>(null);
  readonly copiedPayload = signal<boolean>(false);

  readonly availableEvents: { type: WebhookEventType; label: string; desc: string; badgeColor: string }[] = [
    {
      type: 'user.created',
      label: 'user.created',
      desc: 'Dispatched whenever a new identity is provisioned or accepted.',
      badgeColor: 'badge-emerald',
    },
    {
      type: 'user.deleted',
      label: 'user.deleted',
      desc: 'Dispatched when an identity is terminated or removed from directory.',
      badgeColor: 'badge-rose',
    },
    {
      type: 'auth.success',
      label: 'auth.success',
      desc: 'Successful authentication via SAML, OIDC, or Portal SSO.',
      badgeColor: 'badge-cyan',
    },
    {
      type: 'auth.failed',
      label: 'auth.failed',
      desc: 'Authentication failures, bad credentials, or brute-force blocks.',
      badgeColor: 'badge-amber',
    },
    {
      type: 'mfa.denied',
      label: 'mfa.denied',
      desc: 'MFA challenge rejected, timeout, or anomalous step-up failure.',
      badgeColor: 'badge-orange',
    },
    {
      type: 'policy.violated',
      label: 'policy.violated',
      desc: 'Zero-trust conditional access policy check or MDM compliance failure.',
      badgeColor: 'badge-purple',
    },
  ];

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showWebhookModal()) {
      this.closeWebhookModal();
    } else if (this.showTestWebhookModal()) {
      this.closeTestWebhookModal();
    } else if (this.selectedDeliveryDetails()) {
      this.closeDeliveryDetails();
    }
  }

  setSubTab(tab: 'endpoints' | 'deliveries'): void {
    this.activeSubTab.set(tab);
  }

  toggleSecretVisibility(id: string): void {
    this.revealedSecrets.update((map) => ({
      ...map,
      [id]: !map[id],
    }));
  }

  isSecretRevealed(id: string): boolean {
    return !!this.revealedSecrets()[id];
  }

  maskSecret(secret: string): string {
    if (!secret) return '••••••••••••••••••••••••••••••••';
    return secret.substring(0, 8) + '••••••••••••••••••••••••';
  }

  copySecret(secret: string, id: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(secret).then(() => {
        this.copiedSecretId.set(id);
        setTimeout(() => this.copiedSecretId.set(null), 2000);
      });
    }
  }

  copyPayload(text: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedPayload.set(true);
        setTimeout(() => this.copiedPayload.set(false), 2000);
      });
    }
  }

  openCreateWebhook(): void {
    this.dashboardService.openCreateWebhookModal();
  }

  openEditWebhook(ep: WebhookEndpoint): void {
    this.dashboardService.openEditWebhookModal(ep);
  }

  closeWebhookModal(): void {
    this.dashboardService.closeWebhookModal();
  }

  regenerateSecret(): void {
    this.webhookSecret.set(this.dashboardService.generateWebhookSecret());
  }

  toggleEvent(evt: WebhookEventType): void {
    this.dashboardService.toggleWebhookFormEvent(evt);
  }

  isEventSelected(evt: WebhookEventType): boolean {
    return this.webhookEvents().includes(evt);
  }

  saveWebhook(): void {
    this.dashboardService.saveWebhookEndpoint();
  }

  deleteWebhook(id: string): void {
    if (confirm('Are you sure you want to delete this webhook endpoint? Delivery history will be preserved.')) {
      this.dashboardService.deleteWebhookEndpoint(id);
    }
  }

  toggleActive(id: string): void {
    this.dashboardService.toggleWebhookActive(id);
  }

  openTestModal(ep: WebhookEndpoint): void {
    this.dashboardService.openTestWebhookModal(ep);
  }

  closeTestWebhookModal(): void {
    this.dashboardService.closeTestWebhookModal();
  }

  onTestEventTypeChange(evt: WebhookEventType): void {
    this.dashboardService.setTestEventType(evt);
  }

  async sendTestEvent(): Promise<void> {
    await this.dashboardService.sendTestWebhookEvent();
  }

  async retryDelivery(deliveryId: string): Promise<void> {
    await this.dashboardService.retryWebhookDelivery(deliveryId);
  }

  openDeliveryDetails(delivery: WebhookDelivery): void {
    this.dashboardService.openDeliveryDetails(delivery);
  }

  closeDeliveryDetails(): void {
    this.dashboardService.closeDeliveryDetails();
  }

  clearHistory(): void {
    if (confirm('Clear all webhook delivery records?')) {
      this.dashboardService.clearDeliveryHistory();
    }
  }

  getEventBadgeClass(event: WebhookEventType): string {
    switch (event) {
      case 'user.created':
        return 'badge-emerald';
      case 'user.deleted':
        return 'badge-rose';
      case 'auth.success':
        return 'badge-cyan';
      case 'auth.failed':
        return 'badge-amber';
      case 'mfa.denied':
        return 'badge-orange';
      case 'policy.violated':
        return 'badge-purple';
      default:
        return 'badge-gray';
    }
  }

  formatJson(val: any): string {
    try {
      if (typeof val === 'string') {
        return JSON.stringify(JSON.parse(val), null, 2);
      }
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
}
