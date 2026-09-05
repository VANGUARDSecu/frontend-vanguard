import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';

@Component({ standalone: true, template: '' })
class DummyLoginComponent {}

describe('DashboardComponent (Phase 1 & Phase 2)', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: DummyLoginComponent }]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should create the dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with protocol gateway status items', () => {
    expect(component.protocols.length).toBe(4);
    const names = component.protocols.map((p) => p.name);
    expect(names).toContain('SAML 2.0 Web SSO');
    expect(names).toContain('OpenID Connect (OIDC)');
    expect(names).toContain('Cloud LDAP Directory');
    expect(names).toContain('Cloud RADIUS Gateway');
  });

  it('should toggle view mode between admin and user', () => {
    component.toggleViewMode('user');
    expect(component.viewMode()).toBe('user');
    expect(component.activeTab()).toBe('my-apps');

    component.toggleViewMode('admin');
    expect(component.viewMode()).toBe('admin');
    expect(component.activeTab()).toBe('overview');
  });

  it('should trigger session revocation feedback', () => {
    expect(component.sessionRevoked()).toBe(false);
    component.revokeAllSessions();
    expect(component.sessionRevoked()).toBe(true);
  });

  it('should compute displayName, initials, and role label correctly', () => {
    expect(component.displayName()).toBeDefined();
    expect(component.userInitials()).toBeDefined();
    expect(component.userRoleLabel()).toBeDefined();
    expect(component.clientInfo()).toBeDefined();
  });

  it('should clear session on logout', () => {
    component.onLogout();
    expect(authService.currentUser()).toBeNull();
  });

  // ==========================================
  // PHASE 2 TESTS
  // ==========================================
  it('should initialize with empty applications and handle app requests dynamically', () => {
    expect(component.apps().length).toBe(0);
    expect(component.filteredApps().length).toBe(0);

    component.requestedAppName = 'AWS IAM Identity Center';
    component.requestAppJustification = 'Cloud infrastructure access';
    component.submitAppRequest();

    expect(component.apps().length).toBe(1);
    expect(component.apps()[0].name).toBe('AWS IAM Identity Center');
  });

  it('should filter applications by category', () => {
    component.requestedAppName = 'AWS IAM';
    component.submitAppRequest();

    component.setCategory('cloud');
    expect(component.selectedCategory()).toBe('cloud');
    expect(component.filteredApps().every((a) => a.category === 'cloud')).toBe(true);

    component.setCategory('all');
    expect(component.filteredApps().length).toBeGreaterThanOrEqual(1);
  });

  it('should trigger SSO launch simulation notification', () => {
    component.requestedAppName = 'AWS Cloud';
    component.submitAppRequest();
    const app = component.apps()[0];
    component.launchApp(app);
    expect(component.ssoLaunchingNotice()).toContain(app.name);
    expect(component.ssoLaunchingNotice()).toContain(app.protocol);
  });

  it('should manage application request modal state', () => {
    expect(component.showRequestAppModal()).toBe(false);
    component.openRequestAppModal();
    expect(component.showRequestAppModal()).toBe(true);

    component.requestedAppName = 'Figma Enterprise';
    component.requestAppJustification = 'Design sprint collaboration';
    component.submitAppRequest();
    expect(component.requestAppSuccess()).toBe(true);

    component.closeRequestAppModal();
    expect(component.showRequestAppModal()).toBe(false);
  });

  it('should manage emergency recovery codes generation dynamically', () => {
    expect(component.recoveryCodes().length).toBe(0);
    component.generateRecoveryCodes();
    expect(component.recoveryCodes().length).toBe(10);
    expect(component.recoveryCodes()[0]).toContain('VANG-');
  });

  it('should allow adding and removing public SSH keys', () => {
    const initialCount = component.sshKeys().length;
    component.newKeyLabel = 'Test Laptop';
    component.newKeyContent = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI12345 user@host';
    component.addSshKey();

    expect(component.sshKeys().length).toBe(initialCount + 1);
    const addedKey = component.sshKeys()[0];
    expect(addedKey.label).toBe('Test Laptop');

    component.removeSshKey(addedKey.id);
    expect(component.sshKeys().length).toBe(initialCount);
  });

  it('should reject invalid SSH key content format', () => {
    component.newKeyLabel = 'Invalid Key';
    component.newKeyContent = 'not-a-valid-ssh-key';
    component.addSshKey();

    expect(component.sshKeyError()).toContain('Invalid public key format');
  });

  it('should manage TOTP modal state', () => {
    expect(component.showEnrollTotpModal()).toBe(false);
    component.closeEnrollTotpModal();
    expect(component.showEnrollTotpModal()).toBe(false);
  });

  // ==========================================
  // PHASE 3 TESTS: DIRECTORY, AUDIT, VAULT
  // ==========================================
  it('should manage directory users and allow filtering by department and status', () => {
    component.inviteFirstName = 'Marcus';
    component.inviteLastName = 'Vance';
    component.inviteEmail = 'm.vance@vanguard.security';
    component.inviteDepartment = 'Engineering';
    component.submitInviteUser();

    expect(component.directoryUsers().length).toBeGreaterThanOrEqual(1);

    component.setDirectoryDepartment('Engineering');
    expect(component.directoryDepartmentFilter()).toBe('Engineering');
    expect(component.filteredDirectoryUsers().every((u) => u.department === 'Engineering')).toBe(true);

    component.setDirectoryDepartment('all');
    component.directorySearch.set('marcus');
    expect(component.filteredDirectoryUsers().some((u) => u.name.toLowerCase().includes('marcus'))).toBe(true);
    component.directorySearch.set('');
  });

  it('should filter directory users by search query', () => {
    component.inviteFirstName = 'Marcus';
    component.inviteLastName = 'Vance';
    component.inviteEmail = 'm.vance@vanguard.security';
    component.submitInviteUser();

    component.directorySearch.set('marcus');
    expect(component.filteredDirectoryUsers().some((u) => u.name.toLowerCase().includes('marcus'))).toBe(true);
    component.directorySearch.set('');
  });

  it('should suspend and reactivate directory user', () => {
    component.inviteFirstName = 'Marcus';
    component.inviteLastName = 'Vance';
    component.inviteEmail = 'm.vance@vanguard.security';
    component.submitInviteUser();

    const user = component.directoryUsers()[0];
    component.suspendUser(user);
    const updated = component.directoryUsers().find((u) => u.id === user.id);
    expect(updated?.accountStatus).toBe('Suspended');
    expect(component.adminActionNotice()).toContain('suspended');

    component.reactivateUser(user);
    const reactivated = component.directoryUsers().find((u) => u.id === user.id);
    expect(reactivated?.accountStatus).toBe('Active');
    expect(component.adminActionNotice()).toContain('reactivated');
  });

  it('should change user role, force password reset, and revoke user sessions', () => {
    component.inviteFirstName = 'Marcus';
    component.inviteLastName = 'Vance';
    component.inviteEmail = 'm.vance@vanguard.security';
    component.submitInviteUser();

    const user = component.directoryUsers()[0];
    component.changeUserRole(user, 'Security Officer');
    const updated = component.directoryUsers().find((u) => u.id === user.id);
    expect(updated?.role).toBe('Security Officer');

    component.forceUserPasswordReset(user);
    expect(component.adminActionNotice()).toContain('recovery email dispatched');

    component.adminRevokeUserSessions(user);
    expect(component.adminActionNotice()).toContain('tokens revoked');
  });

  it('should handle invite user validation and creation', () => {
    component.openInviteModal();
    expect(component.showInviteModal()).toBe(true);

    component.submitInviteUser();
    expect(component.inviteError()).toContain('fill out all required fields');

    component.inviteFirstName = 'Jane';
    component.inviteLastName = 'Doe';
    component.inviteEmail = 'not-an-email';
    component.submitInviteUser();
    expect(component.inviteError()).toContain('valid email address');

    const initialCount = component.directoryUsers().length;
    component.inviteEmail = 'jane.doe@vanguard.security';
    component.submitInviteUser();
    expect(component.inviteSuccess()).toBe(true);
    expect(component.directoryUsers().length).toBe(initialCount + 1);
    expect(component.directoryUsers()[0].email).toBe('jane.doe@vanguard.security');

    component.closeInviteModal();
    expect(component.showInviteModal()).toBe(false);
  });

  it('should manage audit events and support status and protocol filtering', () => {
    component.dashboardService.logAuditEvent('Test Auth', 'Corporate-WiFi', 'RADIUS (1812)', 'challenge', 'Medium');
    component.dashboardService.logAuditEvent('Web Login', 'Portal', 'Web Portal', 'success', 'Low');

    expect(component.tenantAuditEvents().length).toBeGreaterThanOrEqual(2);

    component.setAuditStatus('challenge');
    expect(component.auditStatusFilter()).toBe('challenge');
    expect(component.filteredAuditEvents().every((e) => e.status === 'challenge')).toBe(true);

    component.setAuditStatus('all');
    component.setAuditProtocol('RADIUS (1812)');
    expect(component.filteredAuditEvents().every((e) => e.protocol === 'RADIUS (1812)')).toBe(true);
  });

  it('should filter audit events by search query', () => {
    component.dashboardService.logAuditEvent('Test Auth', '194.26.29.112 Gateway', 'Web Portal', 'blocked', 'High');
    component.auditSearchQuery.set('194.26.29.112');
    expect(component.filteredAuditEvents().some((e) => e.target.includes('194.26.29.112') || e.clientIp.includes('127.0.0.1'))).toBe(true);
    component.auditSearchQuery.set('');
  });

  it('should trigger audit log CSV export without error', () => {
    expect(() => component.exportAuditLogs()).not.toThrow();
    expect(component.adminActionNotice()).toContain('exported successfully');
  });

  it('should toggle tenant-wide security policies', () => {
    const initialMfa = component.enforceMfaAll();
    component.toggleEnforceMfa();
    expect(component.enforceMfaAll()).toBe(!initialMfa);

    const initialTor = component.blockHighRiskIps();
    component.toggleBlockHighRiskIps();
    expect(component.blockHighRiskIps()).toBe(!initialTor);
  });

  it('should handle global emergency killswitch modal and execution', () => {
    expect(component.showGlobalKillswitchModal()).toBe(false);
    component.openGlobalKillswitchModal();
    expect(component.showGlobalKillswitchModal()).toBe(true);

    component.executeGlobalKillswitch();
    expect(component.globalKillswitchSuccess()).toBe(true);

    component.closeGlobalKillswitchModal();
    expect(component.showGlobalKillswitchModal()).toBe(false);
  });

  // ==========================================
  // PHASE 4 TESTS: SAML 2.0 & OIDC FEDERATION
  // ==========================================
  it('should manage SAML/OIDC sub-tab navigation', () => {
    expect(component.samlSubTab()).toBe('apps');

    component.setSamlSubTab('idp-metadata');
    expect(component.samlSubTab()).toBe('idp-metadata');

    component.setSamlSubTab('oidc-clients');
    expect(component.samlSubTab()).toBe('oidc-clients');

    component.setSamlSubTab('sso-sandbox');
    expect(component.samlSubTab()).toBe('sso-sandbox');
  });

  it('should initialize certificate metadata and handle federated connectors and OIDC clients', () => {
    expect(component.idpCert().daysRemaining).toBe(284);
    expect(component.idpCert().sha256Fingerprint).toBeDefined();

    component.newAppName = 'AWS IAM';
    component.newAppEntityId = 'urn:amazon:webservices';
    component.newAppAcsUrl = 'https://signin.aws.amazon.com/saml';
    component.submitAddAppConnector();
    expect(component.federatedSamlConnectors().length).toBe(1);
  });

  it('should trigger IdP metadata XML and certificate downloads without error', () => {
    expect(() => component.downloadIdpMetadataXml()).not.toThrow();
    expect(component.adminActionNotice()).toContain('Metadata XML exported');

    expect(() => component.downloadX509Cert()).not.toThrow();
    expect(component.adminActionNotice()).toContain('Certificate downloaded');

    expect(() => component.copyCertFingerprint()).not.toThrow();
  });

  it('should handle X.509 certificate rotation modal and execution', () => {
    expect(component.showRotateCertModal()).toBe(false);
    component.openRotateCertModal();
    expect(component.showRotateCertModal()).toBe(true);

    component.executeRotateCert();
    expect(component.rotateCertSuccess()).toBe(true);

    component.closeRotateCertModal();
    expect(component.showRotateCertModal()).toBe(false);
  });

  it('should validate and create new federated application connector', () => {
    component.openAddAppModal();
    expect(component.showAddAppModal()).toBe(true);

    component.submitAddAppConnector();
    expect(component.addAppError()).toContain('fill out all required fields');

    component.newAppName = 'Snowflake Cloud';
    component.newAppEntityId = 'https://snowflake.vanguard';
    component.newAppAcsUrl = 'ftp://bad-url';
    component.submitAddAppConnector();
    expect(component.addAppError()).toContain('valid HTTP or HTTPS');

    const initialCount = component.federatedSamlConnectors().length;
    component.newAppAcsUrl = 'https://app.snowflake.com/sso/saml';
    component.submitAddAppConnector();
    expect(component.addAppSuccess()).toBe(true);
    expect(component.federatedSamlConnectors().length).toBe(initialCount + 1);
    expect(component.federatedSamlConnectors()[0].name).toBe('Snowflake Cloud');

    component.closeAddAppModal();
    expect(component.showAddAppModal()).toBe(false);
  });

  it('should toggle connector status and delete connector from catalog', () => {
    component.newAppName = 'Snowflake Cloud';
    component.newAppEntityId = 'https://snowflake.vanguard';
    component.newAppAcsUrl = 'https://app.snowflake.com/sso/saml';
    component.submitAddAppConnector();

    const conn = component.federatedSamlConnectors()[0];
    const initialStatus = conn.status;
    component.toggleAppConnectorStatus(conn);
    const updated = component.federatedSamlConnectors().find((c) => c.id === conn.id);
    expect(updated?.status).not.toBe(initialStatus);

    const countBeforeDelete = component.federatedSamlConnectors().length;
    component.deleteAppConnector(conn.id);
    expect(component.federatedSamlConnectors().length).toBe(countBeforeDelete - 1);
  });

  it('should reveal and regenerate OIDC client secret', () => {
    component.dashboardService.oidcClients.set([{
      id: 'oidc-test',
      name: 'Test OIDC Client',
      clientId: 'client_123',
      clientSecret: 'secret_abc',
      revealed: false,
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      allowedScopes: ['openid', 'profile'],
      createdAt: 'Today'
    }]);

    const client = component.oidcClients()[0];
    expect(client.revealed).toBe(false);

    component.toggleRevealClientSecret(client);
    const updatedClient = component.oidcClients().find((c) => c.id === client.id);
    expect(updatedClient?.revealed).toBe(true);

    const prevSecret = updatedClient!.clientSecret;
    component.regenerateClientSecret(updatedClient!);
    const regenClient = component.oidcClients().find((c) => c.id === client.id);
    expect(regenClient?.clientSecret).not.toBe(prevSecret);
    expect(regenClient?.clientSecret).toContain('vg_sec_');
  });

  it('should compute simulated SAML 2.0 XML assertion and OIDC JWT in sandbox', () => {
    expect(component.simulatedSamlXml()).toContain('Notice');

    component.dashboardService.directoryUsers.set([{
      id: 'usr-sim',
      name: 'Sim User',
      email: 'sim@vanguard.security',
      department: 'Engineering',
      role: 'Directory Member',
      mfaStatus: 'Enrolled (TOTP)',
      accountStatus: 'Active',
      lastLogin: 'Just now',
      initials: 'SU',
    }]);
    component.dashboardService.federatedSamlConnectors.set([{
      id: 'conn-sim',
      name: 'Sim App',
      icon: '🌐',
      protocol: 'SAML 2.0',
      entityId: 'urn:sim:app',
      acsUrl: 'https://sim.app/acs',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      signResponse: true,
      signAssertion: true,
      status: 'Active',
      assignedGroups: ['Engineering'],
      lastSsoEvent: 'Just now',
    }]);
    component.sandboxSelectedUserId = 'usr-sim';
    component.sandboxSelectedAppId = 'conn-sim';

    const samlXml = component.simulatedSamlXml();
    expect(samlXml).toContain('<samlp:Response');
    expect(samlXml).toContain('urn:vanguard:security:idp');
    expect(samlXml).toContain('<ds:Signature');
    expect(samlXml).toContain('<saml:AttributeStatement');

    const jwtHeader = component.simulatedOidcJwtHeader();
    expect(jwtHeader).toContain('RS256');

    const jwtPayload = component.simulatedOidcJwtPayload();
    expect(jwtPayload).toContain('https://auth.vanguard.security');
    expect(jwtPayload).toContain('mfa_verified');

    expect(() => component.copySimulatedAssertion()).not.toThrow();
  });

  // ==========================================
  // PHASE 5: Cloud LDAP & RADIUS Network Tests
  // ==========================================
  it('should manage LDAP hosts and service credentials', () => {
    expect(component.ldapHosts().length).toBe(0);

    expect(component.ldapAdminPwRevealed()).toBe(false);
    expect(component.ldapReadonlyPwRevealed()).toBe(false);

    component.toggleLdapAdminPwRevealed();
    expect(component.ldapAdminPwRevealed()).toBe(true);

    component.toggleLdapReadonlyPwRevealed();
    expect(component.ldapReadonlyPwRevealed()).toBe(true);

    const prevAdmin = component.ldapAdminPassword();
    const prevRo = component.ldapReadonlyPassword();
    component.regenerateLdapPasswords();
    expect(component.ldapAdminPassword()).not.toBe(prevAdmin);
    expect(component.ldapReadonlyPassword()).not.toBe(prevRo);
  });

  it('should manage LDAP host creation, status toggle, and deletion', () => {
    component.openAddLdapHostModal();
    expect(component.showAddLdapHostModal()).toBe(true);

    component.newLdapHostName = '';
    component.newLdapHostIp = '';
    component.submitAddLdapHost();
    expect(component.addLdapHostError()).toContain('Please provide host name');

    const initialCount = component.ldapHosts().length;
    component.newLdapHostName = 'TrueNAS Core Storage Cluster';
    component.newLdapHostType = 'NAS Storage';
    component.newLdapHostIp = '10.100.2.50';
    component.newLdapHostProtocol = 'LDAPS (636)';
    component.submitAddLdapHost();
    expect(component.addLdapHostSuccess()).toBe(true);
    expect(component.ldapHosts().length).toBe(initialCount + 1);

    const host = component.ldapHosts()[0];
    const prevStatus = host.status;
    component.toggleLdapHostStatus(host);
    const updatedHost = component.ldapHosts().find((h) => h.id === host.id);
    expect(updatedHost?.status).not.toBe(prevStatus);

    const countBeforeDelete = component.ldapHosts().length;
    component.deleteLdapHost(host.id);
    expect(component.ldapHosts().length).toBe(countBeforeDelete - 1);

    component.closeAddLdapHostModal();
    expect(component.showAddLdapHostModal()).toBe(false);
  });

  it('should compute simulated LDAP bind trace log and execute test', () => {
    expect(component.ldapDiagLog()).toContain('Diagnostic Idle');

    component.dashboardService.directoryUsers.set([{
      id: 'usr-1',
      name: 'Admin',
      email: 'admin@vanguard.security',
      department: 'Security Ops',
      role: 'Super Administrator',
      mfaStatus: 'Enrolled (TOTP)',
      accountStatus: 'Active',
      lastLogin: 'Just now',
      initials: 'AD'
    }]);
    component.dashboardService.ldapHosts.set([{
      id: 'host-1',
      name: 'Synology NAS',
      type: 'NAS Storage',
      ipAddress: '10.100.1.15',
      protocol: 'LDAPS (636)',
      status: 'Connected',
      dailyBinds: 10,
      bindUser: 'cn=admin',
      lastActive: 'Just now'
    }]);

    const log = component.ldapDiagLog();
    expect(log).toContain('ldaps://ldap.vanguard.security:636');
    expect(log).toContain('TLS 1.3 Handshake completed');
    expect(log).toContain('Result Code: 0 (LDAP_SUCCESS)');
    expect(log).toContain('memberOf: cn=');

    component.runLdapBindTest();
    expect(component.ldapDiagRunning()).toBe(true);
    expect(() => component.copyLdapDiagLog()).not.toThrow();
  });

  it('should initialize with RADIUS shared secret and allow registration', () => {
    expect(component.radiusAccessPoints().length).toBe(0);
    expect(component.radiusSecretRevealed()).toBe(false);
    component.toggleRadiusSecretRevealed();
    expect(component.radiusSecretRevealed()).toBe(true);
  });

  it('should manage RADIUS access point registration, status toggle, and deletion', () => {
    component.openAddRadiusApModal();
    expect(component.showAddRadiusApModal()).toBe(true);

    component.newRadiusApName = '';
    component.newRadiusApIp = '';
    component.submitAddRadiusAp();
    expect(component.addRadiusApError()).toContain('Please provide AP/Gateway name');

    const initialCount = component.radiusAccessPoints().length;
    component.newRadiusApName = 'HQ Floor 4 - Cisco Catalyst 9130';
    component.newRadiusApType = 'Cisco Catalyst 9100';
    component.newRadiusApIp = '192.168.10.4';
    component.submitAddRadiusAp();
    expect(component.addRadiusApSuccess()).toBe(true);
    expect(component.radiusAccessPoints().length).toBe(initialCount + 1);

    const ap = component.radiusAccessPoints()[0];
    const prevStatus = ap.status;
    component.toggleRadiusApStatus(ap);
    const updatedAp = component.radiusAccessPoints().find((a) => a.id === ap.id);
    expect(updatedAp?.status).not.toBe(prevStatus);

    const countBeforeDelete = component.radiusAccessPoints().length;
    component.deleteRadiusAp(ap.id);
    expect(component.radiusAccessPoints().length).toBe(countBeforeDelete - 1);

    component.closeAddRadiusApModal();
    expect(component.showAddRadiusApModal()).toBe(false);
  });

  it('should manage RADIUS shared secret rotation', () => {
    component.openRotateRadiusSecretModal();
    expect(component.showRotateRadiusSecretModal()).toBe(true);

    component.closeRotateRadiusSecretModal();
    expect(component.showRotateRadiusSecretModal()).toBe(false);

    expect(() => component.executeRotateRadiusSecret()).not.toThrow();
  });

  it('should compute simulated RADIUS 802.1X packet log and dynamic VLAN assignment', () => {
    expect(component.radiusDiagLog()).toContain('Diagnostic Idle');

    component.dashboardService.directoryUsers.set([{
      id: 'usr-1',
      name: 'Admin',
      email: 'admin@vanguard.security',
      department: 'Security Ops',
      role: 'Super Administrator',
      mfaStatus: 'Enrolled (TOTP)',
      accountStatus: 'Active',
      lastLogin: 'Just now',
      initials: 'AD'
    }]);
    component.dashboardService.radiusAccessPoints.set([{
      id: 'ap-1',
      name: 'Aruba AP',
      type: 'Aruba WPA3 Enterprise',
      ipAddress: '192.168.10.1',
      sharedSecret: 'secret',
      status: 'Active',
      lastAuthEvent: 'Just now'
    }]);

    const log = component.radiusDiagLog();
    expect(log).toContain('radtest -t eap');
    expect(log).toContain('Sending Access-Request to radius.vanguard.security:1812');
    expect(log).toContain('Received Access-Accept from radius.vanguard.security:1812');
    expect(log).toContain('Authentication SUCCESS');

    component.runRadiusAuthTest();
    expect(component.radiusDiagRunning()).toBe(true);
    expect(() => component.copyRadiusDiagLog()).not.toThrow();
  });

  // ==========================================
  // PHASE 6: Mobile Companion App & Biometrics Tests
  // ==========================================
  it('should initialize with personal and fleet devices and mobile security policies', () => {
    expect(component.userDevices().length).toBe(0);
    expect(component.fleetDevices().length).toBe(0);
    expect(component.mobilePolicy().enforceNumberMatching).toBe(true);

    component.confirmPairDevice();
    expect(component.userDevices().length).toBe(1);
    expect(component.fleetDevices().length).toBe(1);
    expect(component.userDevices()[0].biometricType).toBe('Face ID');
  });

  it('should manage device pairing modal state', () => {
    expect(component.showPairDeviceModal()).toBe(false);
    component.openPairDeviceModal();
    expect(component.showPairDeviceModal()).toBe(true);
    expect(component.newPairingToken()).toBeDefined();
    expect(component.newPairingKey()).toBeDefined();

    component.closePairDeviceModal();
    expect(component.showPairDeviceModal()).toBe(false);
  });

  it('should manage push notification challenge simulation', () => {
    expect(component.showPushSimulatorModal()).toBe(false);
    component.startPushSimulation();
    expect(component.showPushSimulatorModal()).toBe(true);
    expect(component.simulatedPushStep()).toBe('notification');

    component.openNotificationChallenge();
    expect(component.simulatedPushStep()).toBe('challenge');

    const wrongNum = 999999;
    component.selectSimulatedNumberMatch(wrongNum);
    expect(component.simulatedPushStep()).toBe('denied');

    component.retryPushSimulation();
    const correctNum = component.simulatedChallengeNumber();
    component.openNotificationChallenge();
    component.selectSimulatedNumberMatch(correctNum);
    expect(component.simulatedPushStep()).toBe('biometric');

    component.denySimulatedPush();
    expect(component.simulatedPushStep()).toBe('denied');

    component.closePushSimulator();
    expect(component.showPushSimulatorModal()).toBe(false);
  });

  it('should manage remote device wipe workflow', () => {
    component.confirmPairDevice();
    const dev = component.fleetDevices()[0];
    expect(dev).toBeDefined();

    component.openWipeDeviceModal(dev);
    expect(component.showWipeDeviceModal()).toBe(true);
    expect(component.selectedDeviceForWipe()?.id).toBe(dev.id);

    component.closeWipeDeviceModal();
    expect(component.showWipeDeviceModal()).toBe(false);
  });

  it('should toggle fleet device compliance status and update mobile policy', () => {
    component.confirmPairDevice();
    const dev = component.fleetDevices()[0];
    const initialStatus = dev.complianceStatus;
    component.toggleFleetDeviceCompliance(dev);
    const updated = component.fleetDevices().find((d) => d.id === dev.id);
    expect(updated?.complianceStatus).not.toBe(initialStatus);

    component.updateMobilePolicy('enforceBiometrics', false);
    expect(component.mobilePolicy().enforceBiometrics).toBe(false);
  });
});
