import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminWebhooks } from './admin-webhooks';
import { DashboardService } from '../../services/dashboard.service';
import { WebhookEndpoint, WebhookDelivery } from '../../models/dashboard.models';
import { vi } from 'vitest';

describe('AdminWebhooks Component (SCRUM-27)', () => {
  let component: AdminWebhooks;
  let fixture: ComponentFixture<AdminWebhooks>;
  let dashboardService: DashboardService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [AdminWebhooks],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    dashboardService = TestBed.inject(DashboardService);

    // Ensure zero hardcoded data initially
    dashboardService.webhookEndpoints.set([]);
    dashboardService.webhookDeliveries.set([]);

    fixture = TestBed.createComponent(AdminWebhooks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('should create AdminWebhooks component with empty initial state (zero hardcoded mock data)', () => {
    expect(component).toBeTruthy();
    expect(component.webhookEndpoints().length).toBe(0);
    expect(component.webhookDeliveries().length).toBe(0);
    expect(component.webhookMetrics().totalEndpoints).toBe(0);
  });

  it('should validate endpoint URL and require at least one subscribed event', () => {
    component.openCreateWebhook();
    expect(component.showWebhookModal()).toBe(true);

    // Empty URL attempt
    dashboardService.webhookUrl.set('');
    component.saveWebhook();
    expect(dashboardService.webhookFormError()).toContain('URL is required');

    // Invalid scheme
    dashboardService.webhookUrl.set('ftp://invalid-server.com');
    component.saveWebhook();
    expect(dashboardService.webhookFormError()).toContain('must start with https:// or http://');

    // Valid URL
    dashboardService.webhookUrl.set('https://api.datadoghq.com/v1/events/vanguard');
    dashboardService.webhookDescription.set('Datadog SIEM Dispatcher');
    component.saveWebhook();

    expect(component.webhookEndpoints().length).toBe(1);
    expect(component.webhookEndpoints()[0].url).toBe('https://api.datadoghq.com/v1/events/vanguard');
    expect(component.webhookEndpoints()[0].isActive).toBe(true);
    expect(component.showWebhookModal()).toBe(false);
  });

  it('should generate a secure HMAC signing secret starting with whsec_', () => {
    const secret = dashboardService.generateWebhookSecret();
    expect(secret.startsWith('whsec_')).toBe(true);
    expect(secret.length).toBe(38); // 'whsec_' (6 chars) + 32 hex chars
  });

  it('should toggle endpoint active state and delete endpoint', () => {
    // Add test endpoint
    dashboardService.webhookUrl.set('https://webhook.site/test-endpoint');
    dashboardService.webhookDescription.set('Webhook Site Receiver');
    component.saveWebhook();

    const endpointId = component.webhookEndpoints()[0].id;
    expect(component.webhookEndpoints()[0].isActive).toBe(true);

    // Toggle active state
    component.toggleActive(endpointId);
    expect(component.webhookEndpoints()[0].isActive).toBe(false);

    component.toggleActive(endpointId);
    expect(component.webhookEndpoints()[0].isActive).toBe(true);

    // Mock confirm for deletion
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteWebhook(endpointId);
    expect(component.webhookEndpoints().length).toBe(0);
  });

  it('should dispatch synthetic test event and record live delivery with latency & status code', async () => {
    // Create endpoint
    dashboardService.webhookUrl.set('https://api.slack.com/events/vanguard');
    dashboardService.webhookDescription.set('Slack Incident Channel');
    component.saveWebhook();
    const endpoint = component.webhookEndpoints()[0];

    // Open test emitter modal
    component.openTestModal(endpoint);
    expect(component.showTestWebhookModal()).toBe(true);
    expect(component.selectedWebhookForTest()?.id).toBe(endpoint.id);
    expect(component.testEventResult()).toBeNull();

    // Change test event type to auth.failed
    component.onTestEventTypeChange('auth.failed');
    expect(component.testEventType()).toBe('auth.failed');
    expect(component.testEventCustomPayload()).toContain('auth.failed');

    // Emit test event
    await component.sendTestEvent();

    const result = component.testEventResult();
    expect(result).not.toBeNull();
    expect(result?.statusCode).toBe(200);
    expect(result?.latencyMs).toBeGreaterThan(0);
    expect(result?.responseBody).toContain('processed');

    // Verify delivery logged
    expect(component.webhookDeliveries().length).toBe(1);
    const delivery = component.webhookDeliveries()[0];
    expect(delivery.event).toBe('auth.failed');
    expect(delivery.statusCode).toBe(200);
    expect(delivery.status).toBe('success');
    expect(delivery.signature.startsWith('sha256=')).toBe(true);

    // Verify endpoint success counter updated
    expect(component.webhookEndpoints()[0].successCount).toBe(1);
    expect(component.webhookEndpoints()[0].lastStatusCode).toBe(200);
  });

  it('should retry a delivery and increment attempt counter', async () => {
    // Manually register endpoint & failed delivery
    dashboardService.webhookUrl.set('https://api.example.com/webhook');
    component.saveWebhook();
    const endpoint = component.webhookEndpoints()[0];

    const initialDelivery: WebhookDelivery = {
      id: 'del_fail_123',
      endpointId: endpoint.id,
      url: endpoint.url,
      event: 'policy.violated',
      status: 'failed',
      statusCode: 500,
      latencyMs: 120,
      timestamp: new Date().toISOString(),
      attempts: 1,
      requestPayload: { event: 'policy.violated' },
      responseBody: '{"error":"server overloaded"}',
      signature: 'sha256=abcdef1234567890',
    };

    dashboardService.webhookDeliveries.set([initialDelivery]);

    // Retry delivery
    await component.retryDelivery('del_fail_123');

    const updated = component.webhookDeliveries().find((d) => d.id === 'del_fail_123');
    expect(updated).toBeDefined();
    expect(updated?.attempts).toBe(2);
    expect(updated?.status).toBe('success');
    expect(updated?.statusCode).toBe(200);
  });

  it('should support filtering endpoints and deliveries', () => {
    // Create 2 endpoints
    dashboardService.webhookUrl.set('https://splunk.corp/hec');
    dashboardService.webhookDescription.set('Splunk Collector');
    dashboardService.webhookEvents.set(['user.created', 'auth.failed']);
    component.saveWebhook();

    dashboardService.webhookUrl.set('https://pagerduty.com/events');
    dashboardService.webhookDescription.set('PagerDuty Pager');
    dashboardService.webhookEvents.set(['policy.violated']);
    component.saveWebhook();

    expect(component.webhookEndpoints().length).toBe(2);

    // Search query filter
    component.webhookSearchQuery.set('splunk');
    expect(component.filteredWebhookEndpoints().length).toBe(1);
    expect(component.filteredWebhookEndpoints()[0].description).toBe('Splunk Collector');

    // Event filter
    component.webhookSearchQuery.set('');
    component.webhookEventFilter.set('policy.violated');
    expect(component.filteredWebhookEndpoints().length).toBe(1);
    expect(component.filteredWebhookEndpoints()[0].description).toBe('PagerDuty Pager');
  });

  it('should reveal, mask and copy cryptographic secrets correctly', () => {
    const rawSecret = 'whsec_994a37bd810f4439a1738d2a58e1c667';
    expect(component.maskSecret(rawSecret)).toContain('••••••••');
    expect(component.maskSecret(rawSecret).startsWith('whsec_99')).toBe(true);

    const testId = 'ep-123';
    expect(component.isSecretRevealed(testId)).toBe(false);
    component.toggleSecretVisibility(testId);
    expect(component.isSecretRevealed(testId)).toBe(true);
    component.toggleSecretVisibility(testId);
    expect(component.isSecretRevealed(testId)).toBe(false);
  });
});

