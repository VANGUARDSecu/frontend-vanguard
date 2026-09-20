import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import {
  ProtocolStatus,
  SaaSApp,
  SignInEvent,
  SSHKey,
  DirectoryUser,
  TenantAuditEvent,
  SamlConnector,
  OidcClient,
  IdpCertMetadata,
  LdapHost,
  LdapServiceAccount,
  LdapTestResult,
  RadiusAccessPoint,
  RadiusAuthActivityEvent,
  VlanMapping,
  EnrolledDevice,
  MobilePolicyConfig,
  AppCatalogTemplate,
  AttributeStatementMapping,
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Helper methods for dynamic localStorage persistence
  private loadStored<T>(key: string, defaultVal: T): T {
    if (!this.isBrowser) return defaultVal;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private saveStored<T>(key: string, val: T): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  // Current logged in user from AuthService
  readonly user = this.authService.currentUser;
  readonly userRole = this.authService.userRole;
  readonly isAdmin = this.authService.isAdmin;

  // View mode switcher: 'admin' (Admin Console) vs 'user' (User Portal)
  readonly viewMode = signal<'admin' | 'user'>('admin');

  // Search input in top header
  searchQuery = '';

  // Active navigation tab
  readonly activeTab = signal<string>('overview');

  // Interactive feedback signals
  readonly copiedUserId = signal<boolean>(false);
  readonly sessionRevoked = signal<boolean>(false);
  readonly adminActionNotice = signal<string | null>(null);

  // ==========================================
  // PHASE 3: Admin Directory Management State (Dynamic)
  // ==========================================
  readonly directoryDepartmentFilter = signal<string>('all');
  readonly directoryStatusFilter = signal<string>('all');
  readonly directorySearch = signal<string>('');

  private initDirectoryUsers(): DirectoryUser[] {
    const stored = this.loadStored<DirectoryUser[]>('vanguard_directory_users', []);
    if (stored && stored.length > 0) return stored;

    const u = this.authService.currentUser();
    if (u && u.email) {
      const name = u.firstName && u.lastName
        ? `${u.firstName} ${u.lastName}`
        : (u.firstName || u.email.split('@')[0]);
      const initials = (u.firstName && u.lastName)
        ? (u.firstName[0] + u.lastName[0]).toUpperCase()
        : u.email.substring(0, 2).toUpperCase();
      const role = u.role === 'admin'
        ? 'Super Administrator'
        : u.role === 'security_officer'
          ? 'Security Officer'
          : 'Directory Member';

      return [{
        id: u.id || 'usr-root',
        name,
        email: u.email,
        department: 'Security Ops',
        role,
        mfaStatus: u.user_metadata?.['has_totp'] ? 'Enrolled (TOTP)' : 'Email OTP Only',
        accountStatus: 'Active',
        lastLogin: 'Just now',
        initials,
      }];
    }
    return [];
  }

  readonly directoryUsers = signal<DirectoryUser[]>(this.initDirectoryUsers());

  readonly filteredDirectoryUsers = computed(() => {
    const dept = this.directoryDepartmentFilter();
    const stat = this.directoryStatusFilter();
    const query = this.directorySearch().toLowerCase().trim();

    return this.directoryUsers().filter((u) => {
      const matchDept = dept === 'all' || u.department === dept;
      const matchStat = stat === 'all' || u.accountStatus === stat;
      const matchQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query);
      return matchDept && matchStat && matchQuery;
    });
  });

  // Invite User Modal State
  readonly showInviteModal = signal<boolean>(false);
  inviteFirstName = '';
  inviteLastName = '';
  inviteEmail = '';
  invitePassword = '';
  inviteDepartment: DirectoryUser['department'] = 'Engineering';
  inviteRole: DirectoryUser['role'] = 'Directory Member';
  readonly inviteSuccess = signal<boolean>(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteCreatedUser = signal<DirectoryUser | null>(null);
  readonly passwordCopied = signal<boolean>(false);
  readonly inviteEmailStatus = signal<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  readonly inviteEmailMessage = signal<string>('');

  // ==========================================
  // PHASE 3: Tenant-Wide Security Audit Stream (Dynamic)
  // ==========================================
  readonly auditStatusFilter = signal<string>('all');
  readonly auditProtocolFilter = signal<string>('all');
  readonly auditSearchQuery = signal<string>('');

  readonly tenantAuditEvents = signal<TenantAuditEvent[]>(
    this.loadStored<TenantAuditEvent[]>('vanguard_audit_events', [])
  );

  readonly filteredAuditEvents = computed(() => {
    const status = this.auditStatusFilter();
    const proto = this.auditProtocolFilter();
    const query = this.auditSearchQuery().toLowerCase().trim();

    return this.tenantAuditEvents().filter((evt) => {
      const matchStatus = status === 'all' || evt.status === status;
      const matchProto = proto === 'all' || evt.protocol === proto;
      const matchQuery =
        !query ||
        evt.actor.toLowerCase().includes(query) ||
        evt.target.toLowerCase().includes(query) ||
        evt.clientIp.toLowerCase().includes(query) ||
        evt.location.toLowerCase().includes(query);
      return matchStatus && matchProto && matchQuery;
    });
  });

  logAuditEvent(
    action: string,
    target: string,
    protocol: string = 'Management API',
    status: 'success' | 'challenge' | 'blocked' = 'success',
    riskScore: 'Low' | 'Medium' | 'High' = 'Low'
  ): void {
    const actor = this.user()?.email || 'system_admin';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newEvt: TenantAuditEvent = {
      id: 'log-' + Date.now(),
      timestamp: timeStr,
      actor,
      target,
      protocol,
      clientIp: '127.0.0.1 (Local)',
      location: 'Local Workstation',
      device: this.clientInfo().browser,
      status,
      riskScore,
    };

    this.tenantAuditEvents.update((evts) => [newEvt, ...evts]);
    this.saveStored('vanguard_audit_events', this.tenantAuditEvents());
  }

  // ==========================================
  // PHASE 3: Vault Settings & Killswitch State
  // ==========================================
  readonly enforceMfaAll = signal<boolean>(
    this.loadStored<boolean>('vanguard_policy_enforce_mfa', true)
  );
  readonly blockHighRiskIps = signal<boolean>(
    this.loadStored<boolean>('vanguard_policy_block_high_risk', true)
  );
  readonly sessionTimeoutMinutes = signal<number>(60);
  readonly showGlobalKillswitchModal = signal<boolean>(false);
  readonly globalKillswitchSuccess = signal<boolean>(false);

  // ==========================================
  // PHASE 4: SAML 2.0 & OIDC Web Federation State (Dynamic)
  // ==========================================
  readonly samlSubTab = signal<'apps' | 'idp-metadata' | 'oidc-clients' | 'sso-sandbox'>('apps');

  readonly idpCert = signal<IdpCertMetadata>(
    this.loadStored<IdpCertMetadata>('vanguard_idp_cert', {
      subject: 'CN=Vanguard Security Root CA, O=Vanguard Security Systems, C=US',
      issuer: 'CN=Vanguard Security Intermediate Authority, O=Vanguard Security Systems, C=US',
      serialNumber: '5A:2E:8F:90:1D:3C:7B:44',
      algorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
      validFrom: 'Jan 01, 2026',
      validUntil: 'Dec 31, 2026',
      daysRemaining: 284,
      sha256Fingerprint: '4E:7B:A2:91:3C:D5:E8:22:F0:19:68:55:A1:EE:89:C4:02:DF:3B:11:78:E0:4A:9C:2B:10:55:7A:DE:52:19:40',
      keySize: 'RSA 4096-bit',
    })
  );

  readonly federatedSamlConnectors = signal<SamlConnector[]>(
    this.loadStored<SamlConnector[]>('vanguard_saml_connectors', [])
  );

  readonly oidcClients = signal<OidcClient[]>(
    this.loadStored<OidcClient[]>('vanguard_oidc_clients', [])
  );

  // App Catalog Templates for SCRUM-22 Wizard
  readonly appCatalogTemplates: AppCatalogTemplate[] = [
    {
      id: 'aws-iam',
      name: 'AWS IAM Identity Center',
      icon: '☁️',
      protocol: 'SAML 2.0',
      category: 'cloud',
      description: 'Enterprise SSO access into AWS Management Console and CLI accounts via SAML 2.0.',
      defaultEntityId: 'https://signin.aws.amazon.com/saml',
      defaultAcsUrl: 'https://signin.aws.amazon.com/saml',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'https://aws.amazon.com/SAML/Attributes/RoleSessionName' },
        { userAttribute: 'roles', samlClaim: 'https://aws.amazon.com/SAML/Attributes/Role' },
      ],
    },
    {
      id: 'google-workspace',
      name: 'Google Workspace',
      icon: '🌐',
      protocol: 'SAML 2.0',
      category: 'collaboration',
      description: 'Federated SAML Single Sign-On for Gmail, Google Drive, and Google Cloud services.',
      defaultEntityId: 'google.com/a/vanguard.security',
      defaultAcsUrl: 'https://www.google.com/a/vanguard.security/acs',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'email' },
        { userAttribute: 'displayName', samlClaim: 'fullName' },
      ],
    },
    {
      id: 'salesforce',
      name: 'Salesforce CRM',
      icon: '💼',
      protocol: 'SAML 2.0',
      category: 'cloud',
      description: 'Federated CRM Single Sign-On with automatic employee role mapping.',
      defaultEntityId: 'https://saml.salesforce.com',
      defaultAcsUrl: 'https://login.salesforce.com?so=vanguard',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'User.Email' },
        { userAttribute: 'username', samlClaim: 'User.Username' },
      ],
    },
    {
      id: 'github-enterprise',
      name: 'GitHub Enterprise Cloud',
      icon: '🐙',
      protocol: 'SAML 2.0',
      category: 'developer',
      description: 'SAML Single Sign-On and SSH key authorization for GitHub organizations.',
      defaultEntityId: 'https://github.com/orgs/vanguard/saml/metadata',
      defaultAcsUrl: 'https://github.com/orgs/vanguard/saml/consume',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'emails' },
        { userAttribute: 'roles', samlClaim: 'administrator' },
      ],
    },
    {
      id: 'slack',
      name: 'Slack Enterprise Grid',
      icon: '💬',
      protocol: 'SAML 2.0',
      category: 'collaboration',
      description: 'SAML 2.0 federation for team messaging, channels, and enterprise workspaces.',
      defaultEntityId: 'https://slack.com',
      defaultAcsUrl: 'https://vanguard.slack.com/sso/saml',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'User.Email' },
        { userAttribute: 'displayName', samlClaim: 'first_name' },
      ],
    },
    {
      id: 'custom-saml',
      name: 'Custom SAML 2.0 App',
      icon: '🛡️',
      protocol: 'SAML 2.0',
      category: 'custom',
      description: 'Integrate any custom enterprise Service Provider via standard SAML 2.0 XML assertions.',
      defaultEntityId: 'https://custom-app.enterprise.io/saml/sp',
      defaultAcsUrl: 'https://custom-app.enterprise.io/saml/acs',
      defaultNameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      defaultAttributeStatements: [
        { userAttribute: 'email', samlClaim: 'email' },
        { userAttribute: 'displayName', samlClaim: 'name' },
      ],
    },
    {
      id: 'custom-oidc',
      name: 'Custom OIDC / OAuth 2.0 App',
      icon: '⚡',
      protocol: 'OIDC',
      category: 'custom',
      description: 'Modern SPA, mobile, or backend API using OpenID Connect RS256 JWT tokens & PKCE.',
      defaultRedirectUris: ['http://localhost:4200/callback'],
      defaultGrantTypes: ['authorization_code', 'refresh_token'],
      defaultScopes: ['openid', 'profile', 'email', 'groups'],
    },
  ];

  // SCRUM-22: Application Integration Wizard State (Multi-step)
  readonly showAddAppModal = signal<boolean>(false);
  readonly wizardStep = signal<1 | 2 | 3>(1);
  readonly wizardSelectedTemplate = signal<AppCatalogTemplate | null>(null);
  readonly wizardCatalogFilter = signal<'all' | 'SAML 2.0' | 'OIDC'>('all');
  wizardCatalogSearch = '';

  newAppName = '';
  newAppProtocol: 'SAML 2.0' | 'OIDC' = 'SAML 2.0';
  newAppEntityId = '';
  newAppAcsUrl = '';
  newAppDepartment = 'Engineering';

  // SAML 2.0 Wizard Fields
  readonly wizardSloUrl = signal<string>('');
  readonly wizardNameIdFormat = signal<string>('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress');
  readonly wizardSignResponse = signal<boolean>(true);
  readonly wizardSignAssertion = signal<boolean>(true);
  readonly wizardAttributeStatements = signal<AttributeStatementMapping[]>([
    { userAttribute: 'email', samlClaim: 'email' },
    { userAttribute: 'displayName', samlClaim: 'name' },
    { userAttribute: 'roles', samlClaim: 'roles' },
  ]);

  // OIDC Wizard Fields
  readonly wizardClientId = signal<string>('');
  readonly wizardClientSecret = signal<string>('');
  readonly wizardSecretRevealed = signal<boolean>(false);
  readonly wizardRedirectUris = signal<string[]>(['http://localhost:4200/callback']);
  wizardNewRedirectUriInput = '';
  readonly wizardGrantTypes = signal<('authorization_code' | 'client_credentials' | 'refresh_token')[]>([
    'authorization_code',
    'refresh_token',
  ]);
  readonly wizardScopes = signal<string[]>(['openid', 'profile', 'email', 'groups']);

  readonly wizardCopiedSecret = signal<boolean>(false);
  readonly wizardCopiedClientId = signal<boolean>(false);
  readonly wizardCopiedCert = signal<boolean>(false);

  readonly addAppSuccess = signal<boolean>(false);
  readonly addAppError = signal<string | null>(null);

  readonly filteredCatalogTemplates = computed(() => {
    const filter = this.wizardCatalogFilter();
    const search = this.wizardCatalogSearch.toLowerCase().trim();
    return this.appCatalogTemplates.filter((t) => {
      const matchProto = filter === 'all' || t.protocol === filter;
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search);
      return matchProto && matchSearch;
    });
  });

  readonly showRotateCertModal = signal<boolean>(false);
  readonly rotateCertSuccess = signal<boolean>(false);

  // SSO Sandbox State
  sandboxSelectedUserId = '';
  sandboxSelectedAppId = '';
  sandboxInspectorMode: 'saml' | 'oidc' = 'saml';
  readonly sandboxAssertionGenerated = signal<boolean>(true);
  readonly copiedAssertion = signal<boolean>(false);

  // ==========================================
  // PHASE 5: Cloud LDAP & RADIUS Network State (Dynamic)
  // ==========================================
  // Connection Configuration Parameters (SCRUM-24)
  readonly ldapServerHost = signal<string>('ldap.vanguardsecurity.io');
  readonly ldapPortLdaps = signal<number>(636);
  readonly ldapPortStartTls = signal<number>(389);
  readonly ldapBaseDn = signal<string>('dc=vanguard,dc=security');
  readonly ldapOrgDn = signal<string>('o=Vanguard Security Enterprise,dc=vanguard,dc=security');
  readonly ldapUsersOu = signal<string>('ou=Users,dc=vanguard,dc=security');
  readonly ldapGroupsOu = signal<string>('ou=Groups,dc=vanguard,dc=security');
  readonly ldapServicesOu = signal<string>('ou=services,dc=vanguard,dc=security');
  readonly copiedLdapParamNotice = signal<string | null>(null);

  readonly ldapCaCertPem = signal<string>(`-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUQ7mZ1p8nKqXvFwR2s9L3yE0A9o8wDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCVVMxETAPBgNVBAoTCFZhbmd1YXJkMSMwIQYDVQQDExpW
YW5ndWFyZCBDbG91ZCBJZFAgUm9vdCBDQTAeFw0yNjAxMDEwMDAwMDBaFw0zNjAx
MDEwMDAwMDBaMEUxCzAJBgNVBAYTAlVTMREwDwYDVQQKEwhWYW5ndWFyZDEjMCEG
A1UEAxMaVmFuZ3VhcmQgQ2xvdWQgSWRQIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7V9x6zk10N4+F+qS2V/x8+qY5p9z8N+12908k
-----END CERTIFICATE-----`);

  readonly ldapAdminPassword = signal<string>(
    this.loadStored<string>('vanguard_ldap_admin_pw', 'Vang!Ldap#Root_9832')
  );
  readonly ldapAdminPwRevealed = signal<boolean>(false);
  readonly ldapReadonlyPassword = signal<string>(
    this.loadStored<string>('vanguard_ldap_ro_pw', 'Vang!Ldap_RO_4412')
  );
  readonly ldapReadonlyPwRevealed = signal<boolean>(false);

  // Service Account Bind Credentials Manager (SCRUM-24)
  readonly ldapServiceAccounts = signal<LdapServiceAccount[]>(
    this.loadStored<LdapServiceAccount[]>('vanguard_ldap_service_accounts', [
      {
        id: 'sa-synology',
        name: 'Synology NAS Backup Vault',
        bindDn: 'uid=svc_synology,ou=services,dc=vanguard,dc=security',
        bindPassword: 'Vang!Ldap_Synology#8842',
        applianceType: 'Synology NAS',
        ipRestriction: '10.100.1.0/24',
        status: 'Active',
        createdAt: '2026-08-20',
        lastBind: '4 mins ago',
        passwordRevealed: false,
      },
      {
        id: 'sa-qnap',
        name: 'QNAP Engineering Storage',
        bindDn: 'uid=svc_qnap,ou=services,dc=vanguard,dc=security',
        bindPassword: 'Vang!Ldap_QNAP#9124',
        applianceType: 'QNAP Storage',
        ipRestriction: '10.100.2.50',
        status: 'Active',
        createdAt: '2026-08-28',
        lastBind: '18 mins ago',
        passwordRevealed: false,
      },
      {
        id: 'sa-linux-pam',
        name: 'Linux SSSD/PAM Prod Cluster',
        bindDn: 'uid=svc_sssd_pam,ou=services,dc=vanguard,dc=security',
        bindPassword: 'Vang!Ldap_PamSSSD#5512',
        applianceType: 'Linux SSSD/PAM',
        status: 'Active',
        createdAt: '2026-09-01',
        lastBind: '1 min ago',
        passwordRevealed: false,
      },
    ])
  );

  // Modals for Service Account Provisioning (SCRUM-24)
  readonly showAddServiceAccountModal = signal<boolean>(false);
  newSvcAcctName = '';
  newSvcAcctUid = '';
  newSvcAcctType: LdapServiceAccount['applianceType'] = 'Synology NAS';
  newSvcAcctIpRestriction = '';
  readonly newSvcAcctPassword = signal<string>('');
  readonly newSvcAcctPwRevealed = signal<boolean>(false);
  readonly addServiceAccountSuccess = signal<boolean>(false);
  readonly addServiceAccountError = signal<string | null>(null);

  readonly ldapHosts = signal<LdapHost[]>(
    this.loadStored<LdapHost[]>('vanguard_ldap_hosts', [])
  );

  // Modals for LDAP
  readonly showAddLdapHostModal = signal<boolean>(false);
  newLdapHostName = '';
  newLdapHostType: LdapHost['type'] = 'NAS Storage';
  newLdapHostIp = '';
  newLdapHostProtocol: LdapHost['protocol'] = 'LDAPS (636)';
  readonly addLdapHostSuccess = signal<boolean>(false);
  readonly addLdapHostError = signal<string | null>(null);

  // Interactive LDAP Bind Diagnostic State (SCRUM-24)
  ldapDiagUserId = '';
  ldapDiagPassword = '••••••••••••';
  ldapDiagEndpoint = 'ldaps://ldap.vanguardsecurity.io:636';
  ldapDiagBindDn = 'uid=svc_synology,ou=services,dc=vanguard,dc=security';
  ldapDiagBindPassword = 'Vang!Ldap_Synology#8842';
  ldapDiagSearchBase = 'dc=vanguard,dc=security';
  ldapDiagFilter = '(objectClass=inetOrgPerson)';
  readonly ldapDiagRunning = signal<boolean>(false);
  readonly ldapDiagExecuted = signal<boolean>(false);
  readonly copiedLdapLog = signal<boolean>(false);
  readonly ldapTestResult = signal<LdapTestResult | null>(null);

  // Cloud RADIUS State
  readonly radiusSharedSecret = signal<string>(
    this.loadStored<string>('vanguard_radius_secret', 'Vang!Radius#Sec_Wpa3_2026')
  );
  readonly radiusSecretRevealed = signal<boolean>(false);
  readonly radiusSecretDaysRemaining = signal<number>(90);

  readonly radiusAccessPoints = signal<RadiusAccessPoint[]>(
    this.loadStored<RadiusAccessPoint[]>('vanguard_radius_aps', [])
  );

  readonly vlanMappings = signal<VlanMapping[]>(
    this.loadStored<VlanMapping[]>('vanguard_vlan_mappings', [])
  );

  // Modals for RADIUS & Network Client Manager (SCRUM-23)
  readonly showAddRadiusApModal = signal<boolean>(false);
  editingRadiusApId: string | null = null;
  newRadiusApName = '';
  newRadiusApType: RadiusAccessPoint['type'] = 'Ubiquiti UniFi AP';
  newRadiusApIp = '';
  newRadiusApDesc = '';
  newRadiusApProtocol: 'PEAP-MSCHAPv2' | 'EAP-TLS' | 'PAP' | 'MS-CHAPv2' = 'PEAP-MSCHAPv2';
  readonly newRadiusApSecret = signal<string>('');
  readonly newRadiusApSecretRevealed = signal<boolean>(false);
  readonly copiedRadiusSecretNotice = signal<boolean>(false);
  readonly addRadiusApSuccess = signal<boolean>(false);
  readonly addRadiusApError = signal<string | null>(null);

  readonly showRotateRadiusSecretModal = signal<boolean>(false);
  readonly rotateRadiusSecretSuccess = signal<boolean>(false);

  // Recent 802.1X Authentication Activity Stream (SCRUM-23)
  readonly radiusAuthActivity = signal<RadiusAuthActivityEvent[]>([
    {
      id: 'rad-act-1',
      timestamp: '2 mins ago',
      clientMac: 'D4:61:9D:3A:8B:01',
      username: 'alex.vanguard@vanguard.security',
      nasClientName: 'Main HQ Wi-Fi - UniFi AP',
      nasIp: '192.168.1.50',
      protocol: 'PEAP-MSCHAPv2',
      status: 'Access-Accept',
      vlanId: 10,
      reason: 'Credentials verified against Supabase Vault',
    },
    {
      id: 'rad-act-2',
      timestamp: '6 mins ago',
      clientMac: 'BC:D0:74:11:F2:A9',
      username: 'sarah.connor@vanguard.security',
      nasClientName: 'Cisco Meraki MR Branch Gateway',
      nasIp: '10.200.0.1',
      protocol: 'EAP-TLS',
      status: 'Access-Accept',
      vlanId: 20,
      reason: 'Valid X.509 client certificate presented',
    },
    {
      id: 'rad-act-3',
      timestamp: '14 mins ago',
      clientMac: 'F0:18:98:C3:4D:7E',
      username: 'unknown_contractor',
      nasClientName: 'Main HQ Wi-Fi - UniFi AP',
      nasIp: '192.168.1.50',
      protocol: 'MS-CHAPv2',
      status: 'Access-Reject',
      reason: 'Authentication failed: Invalid credentials or expired account',
    },
    {
      id: 'rad-act-4',
      timestamp: '28 mins ago',
      clientMac: '70:EF:00:81:4A:23',
      username: 'dev-ops-service',
      nasClientName: 'Aruba CX R&D Lab AP',
      nasIp: '172.16.50.10',
      protocol: 'PAP',
      status: 'Access-Accept',
      vlanId: 30,
      reason: 'Service token authenticated',
    },
  ]);

  readonly radiusActivityFilter = signal<'all' | 'Access-Accept' | 'Access-Reject'>('all');

  readonly filteredRadiusActivity = computed<RadiusAuthActivityEvent[]>(() => {
    const filter = this.radiusActivityFilter();
    const list = this.radiusAuthActivity();
    if (filter === 'all') return list;
    return list.filter((e) => e.status === filter);
  });

  // Interactive RADIUS Auth Diagnostic State
  radiusDiagUserId = '';
  radiusDiagApId = '';
  radiusDiagEapMethod = 'PEAP-MSCHAPv2';
  readonly radiusDiagRunning = signal<boolean>(false);
  readonly radiusDiagExecuted = signal<boolean>(false);
  readonly copiedRadiusLog = signal<boolean>(false);

  // ==========================================
  // PHASE 6: Mobile Companion App & Biometrics State (Dynamic)
  // ==========================================
  readonly userDevices = signal<EnrolledDevice[]>(
    this.loadStored<EnrolledDevice[]>('vanguard_user_devices', [])
  );

  readonly fleetDevices = signal<EnrolledDevice[]>(
    this.loadStored<EnrolledDevice[]>('vanguard_fleet_devices', [])
  );

  readonly mobilePolicy = signal<MobilePolicyConfig>(
    this.loadStored<MobilePolicyConfig>('vanguard_mobile_policy', {
      enforceNumberMatching: true,
      enforceBiometrics: true,
      blockJailbroken: true,
      inactivityLockoutMinutes: 5,
    })
  );

  // Pairing Modal State
  readonly showPairDeviceModal = signal<boolean>(false);
  readonly newPairingToken = signal<string>('vg_mob_pair_8f92e4a19c');
  readonly newPairingKey = signal<string>('VG-8942-0193');
  readonly pairDeviceSuccess = signal<boolean>(false);

  // Push Simulator Modal State
  readonly showPushSimulatorModal = signal<boolean>(false);
  readonly simulatedPushStep = signal<'notification' | 'challenge' | 'biometric' | 'approved' | 'denied'>('notification');
  readonly simulatedChallengeNumber = signal<number>(48);
  readonly simulatedCandidateNumbers = signal<number[]>([23, 48, 79]);
  readonly simulatedSelectedNumber = signal<number | null>(null);
  readonly simulatedBiometricScanning = signal<boolean>(false);

  // Remote Wipe Modal State
  readonly showWipeDeviceModal = signal<boolean>(false);
  readonly selectedDeviceForWipe = signal<EnrolledDevice | null>(null);
  readonly wipeDeviceSuccess = signal<boolean>(false);

  // ==========================================
  // PHASE 2: User Portal - "My Apps" SSO State (Dynamic)
  // ==========================================
  readonly selectedCategory = signal<string>('all');
  readonly ssoLaunchingNotice = signal<string | null>(null);
  readonly showRequestAppModal = signal<boolean>(false);
  requestedAppName = '';
  requestAppJustification = '';
  readonly requestAppSuccess = signal<boolean>(false);

  readonly apps = signal<SaaSApp[]>(
    this.loadStored<SaaSApp[]>('vanguard_user_apps', [])
  );

  readonly filteredApps = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery.toLowerCase().trim();
    return this.apps().filter((app) => {
      const matchCat = cat === 'all' || app.category === cat;
      const matchQuery =
        !query ||
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  });

  // ==========================================
  // PHASE 2: Security & MFA Hub State
  // ==========================================
  readonly hasTotpEnrolled = signal<boolean>(!!this.user()?.user_metadata?.['has_totp']);
  readonly showEnrollTotpModal = signal<boolean>(false);
  readonly totpQrUrl = signal<string>('');
  readonly totpSecret = signal<string>('');
  totpVerifyCode = '';
  readonly totpEnrollError = signal<string | null>(null);
  readonly totpEnrollSuccess = signal<boolean>(false);

  readonly recoveryCodes = signal<string[]>(
    this.loadStored<string[]>('vanguard_recovery_codes', [])
  );
  readonly copiedCodes = signal<boolean>(false);

  // ==========================================
  // PHASE 2: SSH & LDAP Keys State (Dynamic)
  // ==========================================
  readonly ldapBindDn = computed(() => {
    const username = this.user()?.email?.split('@')[0] || 'user';
    return `uid=${username},ou=Users,dc=vanguard,dc=security`;
  });

  readonly sshKeys = signal<SSHKey[]>(
    this.loadStored<SSHKey[]>('vanguard_ssh_keys', [])
  );
  newKeyLabel = '';
  newKeyContent = '';
  readonly sshKeyError = signal<string | null>(null);
  readonly sshKeySuccess = signal<boolean>(false);

  // ==========================================
  // PHASE 2: Personal Sign-in Activity (Dynamic)
  // ==========================================
  private initSignInHistory(): SignInEvent[] {
    const stored = this.loadStored<SignInEvent[]>('vanguard_signin_history', []);
    if (stored && stored.length > 0) return stored;

    const u = this.authService.currentUser();
    if (u) {
      return [{
        id: 'evt-curr',
        timestamp: 'Just now',
        application: 'Vanguard Directory Vault',
        protocol: 'Supabase JWT',
        device: 'Current Session',
        ip: '127.0.0.1 (Loopback TLS)',
        location: 'Local Workstation',
        status: 'success',
      }];
    }
    return [];
  }

  readonly signInHistory = signal<SignInEvent[]>(this.initSignInHistory());

  // Protocol Gateway status items
  readonly protocols: ProtocolStatus[] = [
    {
      name: 'SAML 2.0 Web SSO',
      type: 'Identity Provider (IdP)',
      port: 'HTTPS (443)',
      status: 'healthy',
      description: 'Signed XML assertions for SaaS web applications (AWS, Slack, GitHub, Jira).',
      badge: 'Active',
      certExpiry: '365 days remaining',
    },
    {
      name: 'OpenID Connect (OIDC)',
      type: 'OAuth 2.0 / JWT Issuer',
      port: 'HTTPS (443)',
      status: 'healthy',
      description: 'Discovery & JWKS token authentication for cloud services and mobile clients.',
      badge: 'Active',
    },
    {
      name: 'Cloud LDAP Directory',
      type: 'Directory Bind Endpoint',
      port: 'LDAPS (636)',
      status: 'online',
      description: 'Secure TLS directory service for legacy NAS storage and Linux server fleets.',
      badge: 'Online (TLS 1.3)',
    },
    {
      name: 'Cloud RADIUS Gateway',
      type: 'Network Access (802.1X)',
      port: 'UDP (1812 / 1813)',
      status: 'online',
      description: 'Network-layer authentication for corporate WPA3 Enterprise Wi-Fi and VPN gateways.',
      badge: 'Active (Port 1812)',
    },
  ];

  // User details computed getters
  readonly displayName = computed<string>(() => {
    const u = this.user();
    if (!u) return 'Security Analyst';
    if (u.firstName && u.lastName) {
      return `${u.firstName} ${u.lastName}`;
    }
    if (u.firstName) return u.firstName;
    return u.email.split('@')[0];
  });

  readonly userInitials = computed<string>(() => {
    const u = this.user();
    if (!u) return 'VS';
    if (u.firstName && u.lastName) {
      return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
    }
    if (u.firstName) {
      return u.firstName.substring(0, 2).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  });

  readonly organizationName = computed<string>(() => {
    return this.user()?.companyName || 'Vanguard Security Systems';
  });

  readonly userRoleLabel = computed<string>(() => {
    const role = this.userRole();
    if (role === 'admin') return 'Super Administrator';
    if (role === 'security_officer') return 'Security Officer';
    return 'Directory Member';
  });

  readonly userPhone = computed<string>(() => {
    return this.user()?.phone || 'Not provided';
  });

  readonly clientInfo = computed(() => {
    let browser = 'Chrome / Edge Chromium';
    let os = 'Windows Enterprise';

    if (this.isBrowser && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (ua.includes('Edg/')) browser = 'Microsoft Edge';
      else if (ua.includes('Chrome/')) browser = 'Google Chrome';
      else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
      else if (ua.includes('Safari/')) browser = 'Apple Safari';

      if (ua.includes('Windows NT 10')) os = 'Windows 11 / 10';
      else if (ua.includes('Mac OS X')) os = 'macOS Workstation';
      else if (ua.includes('Linux')) os = 'Linux OS';
      else if (ua.includes('Android')) os = 'Android Mobile';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile';
    }

    return {
      browser,
      os,
      ip: '127.0.0.1 (Loopback / Secure TLS)',
      location: 'Local Workstation',
      verifiedMethod: 'Supabase JWT + OWASP Throttler Guard',
    };
  });

  constructor() {
    // Default view mode to the user's role
    if (!this.isAdmin()) {
      this.viewMode.set('user');
      this.activeTab.set('my-apps');
    }
  }

  toggleViewMode(mode: 'admin' | 'user'): void {
    this.viewMode.set(mode);
    if (mode === 'admin') {
      this.activeTab.set('overview');
    } else {
      this.activeTab.set('my-apps');
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  // ==========================================
  // PHASE 3: Admin Directory Actions
  // ==========================================
  setDirectoryDepartment(dept: string): void {
    this.directoryDepartmentFilter.set(dept);
  }

  setDirectoryStatus(status: string): void {
    this.directoryStatusFilter.set(status);
  }

  suspendUser(user: DirectoryUser): void {
    this.directoryUsers.update((users) =>
      users.map((u) => (u.id === user.id ? { ...u, accountStatus: 'Suspended' } : u))
    );
    this.saveStored('vanguard_directory_users', this.directoryUsers());
    this.logAuditEvent(`Suspend account: ${user.name}`, 'Directory Vault', 'RBAC Guard', 'success', 'Medium');
    this.showAdminNotice(`Account for ${user.name} has been suspended.`);
  }

  reactivateUser(user: DirectoryUser): void {
    this.directoryUsers.update((users) =>
      users.map((u) => (u.id === user.id ? { ...u, accountStatus: 'Active' } : u))
    );
    this.saveStored('vanguard_directory_users', this.directoryUsers());
    this.logAuditEvent(`Reactivate account: ${user.name}`, 'Directory Vault', 'RBAC Guard', 'success', 'Low');
    this.showAdminNotice(`Account for ${user.name} has been reactivated.`);
  }

  changeUserRole(user: DirectoryUser, newRole: DirectoryUser['role']): void {
    this.directoryUsers.update((users) =>
      users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );
    this.saveStored('vanguard_directory_users', this.directoryUsers());
    this.logAuditEvent(`Role modified for ${user.name} to ${newRole}`, 'Directory RBAC', 'Privilege Escalation Guard', 'success', 'Medium');
    this.showAdminNotice(`Role for ${user.name} updated to ${newRole}.`);
  }

  forceUserPasswordReset(user: DirectoryUser): void {
    this.logAuditEvent(`Dispatched password reset for ${user.email}`, 'Auth Service', 'Password Recovery', 'success', 'Low');
    this.showAdminNotice(`Password reset recovery email dispatched to ${user.email}.`);
  }

  adminRevokeUserSessions(user: DirectoryUser): void {
    this.logAuditEvent(`Revoked all active sessions for ${user.name}`, 'Session Vault', 'JWT Guard', 'success', 'High');
    this.showAdminNotice(`All active sessions and tokens revoked for ${user.name}.`);
  }

  generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pwd = `Vanguard#${rand}!`;
    this.invitePassword = pwd;
    return pwd;
  }

  copyTemporaryPassword(): void {
    const pwd = this.inviteCreatedUser()?.temporaryPassword || this.invitePassword;
    if (pwd && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pwd).catch(() => {});
    }
    this.passwordCopied.set(true);
    setTimeout(() => {
      this.passwordCopied.set(false);
    }, 2500);
  }

  openInviteModal(): void {
    this.showInviteModal.set(true);
    this.inviteFirstName = '';
    this.inviteLastName = '';
    this.inviteEmail = '';
    this.inviteDepartment = 'Engineering';
    this.inviteRole = 'Directory Member';
    this.generateRandomPassword();
    this.inviteCreatedUser.set(null);
    this.passwordCopied.set(false);
    this.inviteEmailStatus.set('idle');
    this.inviteEmailMessage.set('');
    this.inviteSuccess.set(false);
    this.inviteError.set(null);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
    this.inviteCreatedUser.set(null);
    this.inviteSuccess.set(false);
    this.passwordCopied.set(false);
    this.inviteEmailStatus.set('idle');
    this.inviteEmailMessage.set('');
    this.inviteError.set(null);
  }

  submitInviteUser(): void {
    this.inviteError.set(null);
    if (!this.inviteFirstName.trim() || !this.inviteLastName.trim() || !this.inviteEmail.trim()) {
      this.inviteError.set('Please fill out all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.inviteEmail.trim())) {
      this.inviteError.set('Please enter a valid email address.');
      return;
    }

    if (!this.invitePassword.trim()) {
      this.generateRandomPassword();
    }

    const initials = (this.inviteFirstName[0] + this.inviteLastName[0]).toUpperCase();
    const newUser: DirectoryUser = {
      id: 'usr-' + Date.now(),
      name: `${this.inviteFirstName.trim()} ${this.inviteLastName.trim()}`,
      email: this.inviteEmail.trim().toLowerCase(),
      department: this.inviteDepartment,
      role: this.inviteRole,
      mfaStatus: 'Email OTP Only',
      accountStatus: 'Pending',
      lastLogin: 'Never (Invite sent)',
      initials,
      temporaryPassword: this.invitePassword.trim(),
    };

    this.directoryUsers.update((users) => [newUser, ...users]);
    this.saveStored('vanguard_directory_users', this.directoryUsers());
    this.logAuditEvent(`Invited employee ${newUser.email}`, 'Directory Vault', 'Invitation Service', 'success', 'Low');

    this.inviteCreatedUser.set(newUser);
    this.inviteSuccess.set(true);
    this.inviteEmailStatus.set('sending');

    this.showAdminNotice(`Provisioning employee and dispatching email to ${newUser.email}...`);

    this.authService
      .sendInviteEmail({
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        temporaryPassword: newUser.temporaryPassword || this.invitePassword.trim(),
        loginUrl: typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:4200/login',
      })
      .subscribe({
        next: (res) => {
          this.inviteEmailStatus.set('sent');
          this.inviteEmailMessage.set(res.message || `Credentials sent to ${newUser.email}`);
          this.showAdminNotice(`Credentials & invitation successfully emailed to ${newUser.email}`);
        },
        error: (err) => {
          this.inviteEmailStatus.set('failed');
          const msg = err.message || 'Email delivery failed.';
          this.inviteEmailMessage.set(msg);
          this.showAdminNotice(`Account created. Notice: ${msg}`);
        },
      });
  }

  // ==========================================
  // PHASE 3: Audit Log Filtering & Export
  // ==========================================
  setAuditStatus(status: string): void {
    this.auditStatusFilter.set(status);
  }

  setAuditProtocol(protocol: string): void {
    this.auditProtocolFilter.set(protocol);
  }

  exportAuditLogs(): void {
    if (!this.isBrowser) return;

    const headers = 'ID,Timestamp,Actor,Target,Protocol,Client_IP,Location,Device,Status,Risk_Score\n';
    const rows = this.filteredAuditEvents()
      .map(
        (e) =>
          `"${e.id}","${e.timestamp}","${e.actor}","${e.target}","${e.protocol}","${e.clientIp}","${e.location}","${e.device}","${e.status}","${e.riskScore}"`
      )
      .join('\n');

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vanguard-audit-log-${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    this.showAdminNotice('Audit log exported successfully to CSV.');
  }

  // ==========================================
  // PHASE 3: Vault Settings & Killswitch
  // ==========================================
  toggleEnforceMfa(): void {
    this.enforceMfaAll.update((v) => !v);
    this.saveStored('vanguard_policy_enforce_mfa', this.enforceMfaAll());
    const status = this.enforceMfaAll() ? 'Enforced' : 'Optional';
    this.logAuditEvent(`MFA Policy updated to ${status}`, 'Policy Engine', 'Auth Guard', 'success', 'Medium');
    this.showAdminNotice(`Tenant Multi-Factor policy: ${status} for all members.`);
  }

  toggleBlockHighRiskIps(): void {
    this.blockHighRiskIps.update((v) => !v);
    this.saveStored('vanguard_policy_block_high_risk', this.blockHighRiskIps());
    const status = this.blockHighRiskIps() ? 'Active' : 'Disabled';
    this.logAuditEvent(`Tor / High-Risk IP Blocking updated to ${status}`, 'WAF / Rate Limiter', 'Network Guard', 'success', 'Medium');
    this.showAdminNotice(`Automated Tor & proxy IP blocking: ${status}.`);
  }

  openGlobalKillswitchModal(): void {
    this.showGlobalKillswitchModal.set(true);
  }

  closeGlobalKillswitchModal(): void {
    this.showGlobalKillswitchModal.set(false);
  }

  executeGlobalKillswitch(): void {
    this.globalKillswitchSuccess.set(true);
    this.logAuditEvent('GLOBAL EMERGENCY KILLSWITCH EXECUTED', 'Directory Vault', 'Emergency Revocation', 'blocked', 'High');
    setTimeout(() => {
      this.showGlobalKillswitchModal.set(false);
      this.globalKillswitchSuccess.set(false);
      this.showAdminNotice(
        'GLOBAL EMERGENCY KILLSWITCH EXECUTED: All active sessions, Web/LDAP/RADIUS tokens terminated across the entire directory.'
      );
    }, 1800);
  }

  // ==========================================
  // PHASE 4: SAML 2.0 & OIDC Federation Actions
  // ==========================================
  setSamlSubTab(tab: 'apps' | 'idp-metadata' | 'oidc-clients' | 'sso-sandbox'): void {
    this.samlSubTab.set(tab);
  }

  downloadIdpMetadataXml(): void {
    if (!this.isBrowser) return;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="urn:vanguard:security:idp">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>
MIIDXTCCAkWgAwIBAgIUWi6PkB08e0REX491kGsmq0h1kGcwDQYJKoZIhvcNAQELBQAw
RjELMAkGA1UEBhMCVVMxIjAgBgNVBAoMGVbYW5ndWFyZCBTZWN1cml0eSBTeXN0ZW1z
MRMwEQYDVQQDDApWYW5ndWFyZCBDQTAeFw0yNjAxMDEwMDAwMDBaFw0yNjEyMzEyMzU5
NTlaMEYxCzAJBgNVBAYTAlVTMSIwIAYDVQQKDBlWYW5ndWFyZCBTZWN1cml0eSBTeXN0
ZW1zMRMwEQYDVQQDDApWYW5ndWFyZCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
AQoCggEBAL5f4k6gV7aZ98d4Zk...
          </ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://auth.vanguard.security/sso/saml"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://auth.vanguard.security/sso/saml"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://auth.vanguard.security/sso/logout"/>
  </md:IDPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">${this.organizationName()}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">${this.organizationName()} Zero-Trust IdP</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://vanguard.security</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-idp-metadata-${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    this.showAdminNotice('SAML 2.0 IdP Metadata XML exported successfully.');
  }

  downloadX509Cert(): void {
    if (!this.isBrowser) return;

    const certContent = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIUWi6PkB08e0REX491kGsmq0h1kGcwDQYJKoZIhvcNAQEL
BQAwRjELMAkGA1UEBhMCVVMxIjAgBgNVBAoMGVbYW5ndWFyZCBTZWN1cml0eSBTeXN0
ZW1zMRMwEQYDVQQDDApWYW5ndWFyZCBDQTAeFw0yNjAxMDEwMDAwMDBaFw0yNjEy
MzEyMzU5NTlaMEYxCzAJBgNVBAYTAlVTMSIwIAYDVQQKDBlWYW5ndWFyZCBTZWN1
cml0eSBTeXN0ZW1zMRMwEQYDVQQDDApWYW5ndWFyZCBDQTCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAL5f4k6gV7aZ98d4Zk...
-----END CERTIFICATE-----`;

    const blob = new Blob([certContent], { type: 'application/x-x509-ca-cert' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-idp-signing-cert.crt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showAdminNotice('X.509 IdP Signing Certificate downloaded.');
  }

  copyCertFingerprint(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.idpCert().sha256Fingerprint).then(() => {
      this.showAdminNotice('SHA-256 certificate fingerprint copied to clipboard.');
    });
  }

  openRotateCertModal(): void {
    this.showRotateCertModal.set(true);
    this.rotateCertSuccess.set(false);
  }

  closeRotateCertModal(): void {
    this.showRotateCertModal.set(false);
  }

  executeRotateCert(): void {
    this.rotateCertSuccess.set(true);
    const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
    const newFingerprint = `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;

    setTimeout(() => {
      this.idpCert.update((cert) => ({
        ...cert,
        validFrom: 'Today',
        validUntil: 'One Year from Today',
        daysRemaining: 365,
        sha256Fingerprint: `A1:B2:${newFingerprint}:C3:D4:E5`,
      }));
      this.saveStored('vanguard_idp_cert', this.idpCert());
      this.logAuditEvent('Rotated IdP X.509 Signing Certificate', 'IdP Key Vault', 'SAML 2.0 PKI', 'success', 'Medium');
      this.showRotateCertModal.set(false);
      this.rotateCertSuccess.set(false);
      this.showAdminNotice('IdP X.509 Signing Certificate successfully rotated (365 days validity).');
    }, 1200);
  }

  openAddAppModal(): void {
    this.showAddAppModal.set(true);
    this.wizardStep.set(1);
    this.wizardSelectedTemplate.set(null);
    this.wizardCatalogFilter.set('all');
    this.wizardCatalogSearch = '';
    this.newAppName = '';
    this.newAppProtocol = 'SAML 2.0';
    this.newAppEntityId = '';
    this.newAppAcsUrl = '';
    this.newAppDepartment = 'Engineering';
    this.wizardSloUrl.set('');
    this.wizardNameIdFormat.set('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress');
    this.wizardSignResponse.set(true);
    this.wizardSignAssertion.set(true);
    this.wizardAttributeStatements.set([
      { userAttribute: 'email', samlClaim: 'email' },
      { userAttribute: 'displayName', samlClaim: 'name' },
      { userAttribute: 'roles', samlClaim: 'roles' },
    ]);
    this.generateNewOidcCredentials();
    this.wizardRedirectUris.set(['http://localhost:4200/callback']);
    this.wizardNewRedirectUriInput = '';
    this.wizardGrantTypes.set(['authorization_code', 'refresh_token']);
    this.wizardScopes.set(['openid', 'profile', 'email', 'groups']);
    this.addAppSuccess.set(false);
    this.addAppError.set(null);
  }

  closeAddAppModal(): void {
    this.showAddAppModal.set(false);
  }

  setWizardStep(step: 1 | 2 | 3): void {
    this.addAppError.set(null);
    if (step > 1 && !this.newAppName.trim() && this.wizardStep() === 2) {
      this.addAppError.set('Application Name is required.');
      return;
    }
    if (step === 3) {
      // Validate step 2 inputs before proceeding to step 3
      if (!this.newAppName.trim()) {
        this.addAppError.set('Application Name is required.');
        return;
      }
      if (this.newAppProtocol === 'SAML 2.0') {
        if (!this.newAppEntityId.trim()) {
          this.addAppError.set('SP Entity ID / Audience URI is required.');
          return;
        }
        if (!this.newAppAcsUrl.trim() || (!this.newAppAcsUrl.startsWith('http://') && !this.newAppAcsUrl.startsWith('https://'))) {
          this.addAppError.set('Assertion Consumer Service (ACS) URL must be a valid HTTP or HTTPS endpoint.');
          return;
        }
        if (this.wizardSloUrl().trim() && (!this.wizardSloUrl().startsWith('http://') && !this.wizardSloUrl().startsWith('https://'))) {
          this.addAppError.set('Single Logout (SLO) URL must be a valid HTTP or HTTPS endpoint if provided.');
          return;
        }
      } else {
        if (!this.wizardClientId().trim()) {
          this.addAppError.set('Client ID is required.');
          return;
        }
        if (this.wizardRedirectUris().length === 0) {
          this.addAppError.set('At least one Allowed Redirect URI is required.');
          return;
        }
        if (this.wizardGrantTypes().length === 0) {
          this.addAppError.set('Select at least one OAuth 2.0 Grant Type.');
          return;
        }
        if (this.wizardScopes().length === 0) {
          this.addAppError.set('Select at least one allowed OIDC scope.');
          return;
        }
      }
    }
    this.wizardStep.set(step);
  }

  selectCatalogTemplate(tpl: AppCatalogTemplate): void {
    this.wizardSelectedTemplate.set(tpl);
    this.newAppName = tpl.name;
    this.newAppProtocol = tpl.protocol;
    this.addAppError.set(null);

    if (tpl.protocol === 'SAML 2.0') {
      this.newAppEntityId = tpl.defaultEntityId || '';
      this.newAppAcsUrl = tpl.defaultAcsUrl || '';
      this.wizardSloUrl.set(tpl.defaultSloUrl || '');
      this.wizardNameIdFormat.set(tpl.defaultNameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress');
      this.wizardAttributeStatements.set(
        tpl.defaultAttributeStatements ? tpl.defaultAttributeStatements.map((a) => ({ ...a })) : []
      );
    } else {
      this.generateNewOidcCredentials();
      this.wizardRedirectUris.set(tpl.defaultRedirectUris ? [...tpl.defaultRedirectUris] : ['http://localhost:4200/callback']);
      this.wizardGrantTypes.set(tpl.defaultGrantTypes ? [...tpl.defaultGrantTypes] : ['authorization_code']);
      this.wizardScopes.set(tpl.defaultScopes ? [...tpl.defaultScopes] : ['openid', 'profile', 'email', 'groups']);
    }

    this.wizardStep.set(2);
  }

  generateNewOidcCredentials(): void {
    const hex1 = Math.random().toString(36).substring(2, 8);
    const hex2 = Math.random().toString(36).substring(2, 10);
    const hexSecret = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    this.wizardClientId.set(`vg_client_${hex1}_${hex2}`);
    this.wizardClientSecret.set(`vg_sec_${hexSecret}`);
    this.wizardSecretRevealed.set(false);
  }

  toggleWizardSecretRevealed(): void {
    this.wizardSecretRevealed.update((v) => !v);
  }

  copyWizardClientSecret(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.wizardClientSecret()).then(() => {
      this.wizardCopiedSecret.set(true);
      setTimeout(() => this.wizardCopiedSecret.set(false), 2000);
      this.showAdminNotice('OIDC Client Secret copied to clipboard.');
    });
  }

  copyWizardClientId(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.wizardClientId()).then(() => {
      this.wizardCopiedClientId.set(true);
      setTimeout(() => this.wizardCopiedClientId.set(false), 2000);
      this.showAdminNotice('OIDC Client ID copied to clipboard.');
    });
  }

  copyX509CertToClipboard(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    const cert = `-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAP3v2z2h1r1hMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nBAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQKDA1WYW5ndWFyZCBJ\nZFAxDTALBgNVBAMMBElkUDAeFw0yNjA5MjAwMDAwMDBaFw0yNzA5MjAwMDAwMDBa\nMEUxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQKDA1W\nYW5ndWFyZCBJZFAxDTALBgNVBAMMBElkUDCCASIwDQYJKoZIhvcNAQEBBQADggEP\nADCCAQoCggEBAL5f4k6gV7aZ98d4Zk...==\n-----END CERTIFICATE-----`;
    navigator.clipboard.writeText(cert).then(() => {
      this.wizardCopiedCert.set(true);
      setTimeout(() => this.wizardCopiedCert.set(false), 2000);
      this.showAdminNotice('X.509 Public Certificate copied to clipboard.');
    });
  }

  addRedirectUriChip(): void {
    const val = this.wizardNewRedirectUriInput.trim();
    if (!val) return;
    if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('exp://')) {
      this.addAppError.set('Redirect URI must start with http://, https://, or custom scheme.');
      return;
    }
    this.addAppError.set(null);
    if (!this.wizardRedirectUris().includes(val)) {
      this.wizardRedirectUris.update((uris) => [...uris, val]);
    }
    this.wizardNewRedirectUriInput = '';
  }

  removeRedirectUriChip(index: number): void {
    this.wizardRedirectUris.update((uris) => uris.filter((_, i) => i !== index));
  }

  toggleWizardGrantType(grant: 'authorization_code' | 'client_credentials' | 'refresh_token'): void {
    this.wizardGrantTypes.update((grants) => {
      if (grants.includes(grant)) {
        return grants.filter((g) => g !== grant);
      } else {
        return [...grants, grant];
      }
    });
  }

  toggleWizardScope(scope: string): void {
    this.wizardScopes.update((scopes) => {
      if (scopes.includes(scope)) {
        return scopes.filter((s) => s !== scope);
      } else {
        return [...scopes, scope];
      }
    });
  }

  addAttributeStatementRow(userAttr = 'email', samlClaim = ''): void {
    this.wizardAttributeStatements.update((rows) => [
      ...rows,
      { userAttribute: userAttr, samlClaim: samlClaim },
    ]);
  }

  removeAttributeStatementRow(index: number): void {
    this.wizardAttributeStatements.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateAttributeStatement(index: number, field: 'userAttribute' | 'samlClaim', val: string): void {
    this.wizardAttributeStatements.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  }

  // Reactive Actions: addApp, updateApp, deleteApp (AC Requirement)
  addApp(appData: Partial<SamlConnector & OidcClient>): void {
    const isSaml = (appData.protocol || this.newAppProtocol) === 'SAML 2.0';
    const appId = appData.id || ('app-' + Date.now());
    const name = appData.name || this.newAppName.trim();
    const icon = appData.icon || this.wizardSelectedTemplate()?.icon || (isSaml ? '🌐' : '⚡');
    const department = this.newAppDepartment || 'Engineering';

    if (isSaml) {
      const newSaml: SamlConnector = {
        id: appId,
        name,
        icon,
        protocol: 'SAML 2.0',
        entityId: appData.entityId || this.newAppEntityId.trim(),
        acsUrl: appData.acsUrl || this.newAppAcsUrl.trim(),
        sloUrl: appData.sloUrl || this.wizardSloUrl().trim() || undefined,
        nameIdFormat: appData.nameIdFormat || this.wizardNameIdFormat(),
        signResponse: appData.signResponse ?? this.wizardSignResponse(),
        signAssertion: appData.signAssertion ?? this.wizardSignAssertion(),
        attributeStatements: appData.attributeStatements || [...this.wizardAttributeStatements()],
        catalogTemplateId: this.wizardSelectedTemplate()?.id,
        status: 'Active',
        assignedGroups: appData.assignedGroups || [department],
        lastSsoEvent: 'Just configured',
      };
      this.federatedSamlConnectors.update((conns) => [newSaml, ...conns.filter((c) => c.id !== newSaml.id)]);
      this.saveStored('vanguard_saml_connectors', this.federatedSamlConnectors());
    } else {
      const newOidc: OidcClient = {
        id: appId,
        name,
        clientId: appData.clientId || this.wizardClientId(),
        clientSecret: appData.clientSecret || this.wizardClientSecret(),
        redirectUris: appData.redirectUris || [...this.wizardRedirectUris()],
        grantTypes: appData.grantTypes || [...this.wizardGrantTypes()],
        allowedScopes: appData.allowedScopes || [...this.wizardScopes()],
        assignedGroups: appData.assignedGroups || [department],
        status: 'Active',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      this.oidcClients.update((clients) => [newOidc, ...clients.filter((c) => c.id !== newOidc.id)]);
      this.saveStored('vanguard_oidc_clients', this.oidcClients());

      // Also create a representation in federatedSamlConnectors for unified overview
      const oidcConnector: SamlConnector = {
        id: appId,
        name,
        icon,
        protocol: 'OIDC',
        entityId: newOidc.clientId,
        acsUrl: newOidc.redirectUris[0] || 'http://localhost:4200/callback',
        nameIdFormat: 'OIDC Subject (sub)',
        signResponse: false,
        signAssertion: true,
        catalogTemplateId: this.wizardSelectedTemplate()?.id,
        status: 'Active',
        assignedGroups: [department],
        lastSsoEvent: 'Just configured',
      };
      this.federatedSamlConnectors.update((conns) => [oidcConnector, ...conns.filter((c) => c.id !== oidcConnector.id)]);
      this.saveStored('vanguard_saml_connectors', this.federatedSamlConnectors());
    }

    // Mirror to User Portal SaaS apps so assigned employees see it
    const userApp: SaaSApp = {
      id: appId,
      name,
      category: isSaml ? 'cloud' : 'developer',
      description: `Federated ${isSaml ? 'SAML 2.0' : 'OIDC'} integration configured by ${this.organizationName()} admin.`,
      icon,
      protocol: isSaml ? 'SAML 2.0' : 'OIDC',
      launchUrl: isSaml ? (appData.acsUrl || this.newAppAcsUrl.trim()) : (appData.redirectUris?.[0] || this.wizardRedirectUris()[0] || '#'),
      assigned: true,
    };
    this.apps.update((prev) => [userApp, ...prev.filter((a) => a.id !== userApp.id)]);
    this.saveStored('vanguard_user_apps', this.apps());

    this.logAuditEvent(
      `Integrated federated application wizard: ${name} (${isSaml ? 'SAML 2.0' : 'OIDC'})`,
      'Federation Catalog',
      isSaml ? 'SAML 2.0' : 'OIDC',
      'success',
      'Low'
    );
  }

  updateApp(id: string, updates: Partial<SamlConnector | OidcClient>): void {
    this.federatedSamlConnectors.update((conns) =>
      conns.map((c) => (c.id === id ? ({ ...c, ...updates } as SamlConnector) : c))
    );
    this.saveStored('vanguard_saml_connectors', this.federatedSamlConnectors());

    this.oidcClients.update((clients) =>
      clients.map((cl) => (cl.id === id ? ({ ...cl, ...updates } as OidcClient) : cl))
    );
    this.saveStored('vanguard_oidc_clients', this.oidcClients());

    if (updates.name) {
      this.apps.update((apps) =>
        apps.map((a) => (a.id === id ? { ...a, name: updates.name! } : a))
      );
      this.saveStored('vanguard_user_apps', this.apps());
    }

    this.showAdminNotice(`Updated application configuration.`);
  }

  deleteApp(id: string): void {
    this.deleteAppConnector(id);
  }

  submitAddAppConnector(): void {
    this.addAppError.set(null);
    if (!this.newAppName.trim() || (this.newAppProtocol === 'SAML 2.0' && (!this.newAppEntityId.trim() || !this.newAppAcsUrl.trim()))) {
      this.addAppError.set('Please fill out all required fields.');
      return;
    }

    if (this.newAppProtocol === 'SAML 2.0') {
      if (!this.newAppAcsUrl.startsWith('http://') && !this.newAppAcsUrl.startsWith('https://')) {
        this.addAppError.set('ACS / Redirect URL must be a valid HTTP or HTTPS endpoint.');
        return;
      }
      if (this.wizardSloUrl().trim() && !this.wizardSloUrl().startsWith('http://') && !this.wizardSloUrl().startsWith('https://')) {
        this.addAppError.set('Single Logout (SLO) URL must be a valid HTTP or HTTPS endpoint.');
        return;
      }
    } else {
      if (!this.wizardClientId().trim()) {
        this.addAppError.set('Client ID is required.');
        return;
      }
      if (this.wizardRedirectUris().length === 0) {
        this.addAppError.set('At least one Allowed Redirect URI is required.');
        return;
      }
    }

    this.addApp({});
    this.addAppSuccess.set(true);

    setTimeout(() => {
      this.showAddAppModal.set(false);
      this.addAppSuccess.set(false);
      this.showAdminNotice(`Federated application ${this.newAppName} configured successfully.`);
    }, 1200);
  }

  deleteAppConnector(id: string): void {
    const app = this.federatedSamlConnectors().find((c) => c.id === id);
    this.federatedSamlConnectors.update((conns) => conns.filter((c) => c.id !== id));
    this.saveStored('vanguard_saml_connectors', this.federatedSamlConnectors());

    this.oidcClients.update((clients) => clients.filter((c) => c.id !== id));
    this.saveStored('vanguard_oidc_clients', this.oidcClients());

    // Also remove from User Portal apps
    this.apps.update((prev) => prev.filter((a) => a.id !== id));
    this.saveStored('vanguard_user_apps', this.apps());

    if (app) {
      this.logAuditEvent(`Deleted federated connector ${app.name}`, 'Federation Catalog', app.protocol, 'success', 'Medium');
      this.showAdminNotice(`Connector for ${app.name} removed from federation catalog.`);
    }
  }

  toggleAppConnectorStatus(app: SamlConnector): void {
    const newStatus = app.status === 'Active' ? 'Inactive' : 'Active';
    this.federatedSamlConnectors.update((conns) =>
      conns.map((c) => (c.id === app.id ? { ...c, status: newStatus } : c))
    );
    this.saveStored('vanguard_saml_connectors', this.federatedSamlConnectors());
    this.showAdminNotice(`Status for ${app.name} set to ${newStatus}.`);
  }

  toggleRevealClientSecret(client: OidcClient): void {
    this.oidcClients.update((clients) =>
      clients.map((c) => (c.id === client.id ? { ...c, revealed: !c.revealed } : c))
    );
  }

  regenerateClientSecret(client: OidcClient): void {
    const hex = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const newSecret = `vg_sec_${hex}`;
    this.oidcClients.update((clients) =>
      clients.map((c) => (c.id === client.id ? { ...c, clientSecret: newSecret, revealed: true } : c))
    );
    this.saveStored('vanguard_oidc_clients', this.oidcClients());
    this.logAuditEvent(`Regenerated client secret for ${client.name}`, 'OIDC Provider', 'OAuth 2.0 Client Secret', 'success', 'High');
    this.showAdminNotice(`New client secret generated for ${client.name}.`);
  }

  // SSO Sandbox simulation calculations
  readonly simulatedSamlXml = computed<string>(() => {
    const users = this.directoryUsers();
    const apps = this.federatedSamlConnectors();

    if (users.length === 0 || apps.length === 0) {
      return '<!-- Notice: Please configure at least one Directory User and one Federated SAML App to inspect live assertions. -->';
    }

    const user = users.find((u) => u.id === this.sandboxSelectedUserId) || users[0];
    const app = apps.find((c) => c.id === this.sandboxSelectedAppId) || apps[0];

    const now = new Date();
    const issueInstant = now.toISOString();
    const notBefore = new Date(now.getTime() - 60000).toISOString();
    const notOnOrAfter = new Date(now.getTime() + 300000).toISOString();
    const assertionId = `_assert_${Date.now().toString(16)}`;
    const responseId = `_resp_${Date.now().toString(16)}`;

    return `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  ID="${responseId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${app?.acsUrl || 'https://sp.example.com/acs'}"
  InResponseTo="_req_example_9823">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">urn:vanguard:security:idp</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${assertionId}"
    IssueInstant="${issueInstant}"
    Version="2.0">
    <saml:Issuer>urn:vanguard:security:idp</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>8Fk72AqT9L2y39+hPz81...==</ds:DigestValue>
      </ds:SignedInfo>
      <ds:SignatureValue>
        MIIEpAIBAAKCAQEA1W2L... [Cryptographically Signed RSA-4096]
      </ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="${app?.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'}">
        ${user?.email || 'user@example.com'}
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
          NotOnOrAfter="${notOnOrAfter}"
          Recipient="${app?.acsUrl || 'https://sp.example.com/acs'}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${app?.entityId || 'urn:example:sp'}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${issueInstant}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email"><saml:AttributeValue>${user?.email || 'user@example.com'}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="displayName"><saml:AttributeValue>${user?.name || 'User'}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="department"><saml:AttributeValue>${user?.department || 'Engineering'}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="role"><saml:AttributeValue>${user?.role || 'Directory Member'}</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="mfa_authenticated"><saml:AttributeValue>true</saml:AttributeValue></saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
  });

  readonly simulatedOidcJwtHeader = computed<string>(() => {
    return JSON.stringify(
      {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'vanguard_root_2026_key_1',
      },
      null,
      2
    );
  });

  readonly simulatedOidcJwtPayload = computed<string>(() => {
    const users = this.directoryUsers();
    const apps = this.federatedSamlConnectors();

    if (users.length === 0 || apps.length === 0) {
      return JSON.stringify({ message: 'No directory users or apps available to simulate assertion.' }, null, 2);
    }

    const user = users.find((u) => u.id === this.sandboxSelectedUserId) || users[0];
    const app = apps.find((c) => c.id === this.sandboxSelectedAppId) || apps[0];
    const now = Math.floor(Date.now() / 1000);

    return JSON.stringify(
      {
        iss: 'https://auth.vanguard.security',
        sub: user?.id || 'usr-1',
        aud: app?.entityId || 'urn:vanguard:sp',
        exp: now + 3600,
        iat: now,
        auth_time: now - 30,
        email: user?.email || 'user@vanguard.security',
        email_verified: true,
        name: user?.name || 'User',
        department: user?.department || 'Engineering',
        role: user?.role || 'Directory Member',
        mfa_verified: true,
        amr: ['pwd', 'totp'],
        acr: 'urn:vanguard:loa:2',
      },
      null,
      2
    );
  });

  copySimulatedAssertion(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    const text = this.sandboxInspectorMode === 'saml' ? this.simulatedSamlXml() : this.simulatedOidcJwtPayload();
    navigator.clipboard.writeText(text).then(() => {
      this.copiedAssertion.set(true);
      setTimeout(() => this.copiedAssertion.set(false), 2500);
    });
  }

  // ==========================================
  // PHASE 5: Cloud LDAP & RADIUS Actions
  // ==========================================
  // Connection Configuration & CA Certificate Actions (SCRUM-24)
  downloadLdapCaCert(): void {
    this.showAdminNotice('Vanguard Cloud LDAP CA Certificate downloaded (vanguard-ldap-ca.crt).');
    if (!this.isBrowser || typeof document === 'undefined') return;
    try {
      const blob = new Blob([this.ldapCaCertPem()], { type: 'application/x-x509-ca-cert' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vanguard-ldap-ca.crt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // safe fallback in headless/test environments
    }
  }

  copyLdapParam(value: string, label: string): void {
    this.copiedLdapParamNotice.set(`${label} copied to clipboard`);
    this.showAdminNotice(`Copied ${label} to clipboard.`);
    if (this.isBrowser && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setTimeout(() => {
      if (this.copiedLdapParamNotice() === `${label} copied to clipboard`) {
        this.copiedLdapParamNotice.set(null);
      }
    }, 2000);
  }

  // Service Account Bind Credentials Manager Actions (SCRUM-24)
  openAddServiceAccountModal(): void {
    this.newSvcAcctName = '';
    this.newSvcAcctUid = '';
    this.newSvcAcctType = 'Synology NAS';
    this.newSvcAcctIpRestriction = '';
    this.newSvcAcctPassword.set(this.generateHighEntropySecret(32));
    this.newSvcAcctPwRevealed.set(false);
    this.addServiceAccountSuccess.set(false);
    this.addServiceAccountError.set(null);
    this.showAddServiceAccountModal.set(true);
  }

  closeAddServiceAccountModal(): void {
    this.showAddServiceAccountModal.set(false);
  }

  generateSvcAcctPassword(): void {
    this.newSvcAcctPassword.set(this.generateHighEntropySecret(32));
  }

  toggleNewSvcAcctPwRevealed(): void {
    this.newSvcAcctPwRevealed.update((v) => !v);
  }

  submitAddServiceAccount(): void {
    this.addServiceAccountError.set(null);
    if (!this.newSvcAcctName.trim() || !this.newSvcAcctUid.trim()) {
      this.addServiceAccountError.set('Service Account Name and UID are required (e.g. svc_synology).');
      return;
    }

    const cleanUid = this.newSvcAcctUid.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const bindDn = `uid=${cleanUid},ou=services,dc=vanguard,dc=security`;
    const password = this.newSvcAcctPassword() || this.generateHighEntropySecret(32);

    const newAccount: LdapServiceAccount = {
      id: 'sa-' + Date.now(),
      name: this.newSvcAcctName.trim(),
      bindDn,
      bindPassword: password,
      applianceType: this.newSvcAcctType,
      ipRestriction: this.newSvcAcctIpRestriction.trim() || undefined,
      status: 'Active',
      createdAt: 'Just registered',
      lastBind: 'Never',
      passwordRevealed: false,
    };

    this.ldapServiceAccounts.update((accounts) => [newAccount, ...accounts]);
    this.saveStored('vanguard_ldap_service_accounts', this.ldapServiceAccounts());
    this.logAuditEvent(`Created LDAP service account: ${bindDn}`, 'Cloud LDAP Directory', 'LDAPS (636)', 'success', 'Low');

    this.addServiceAccountSuccess.set(true);
    setTimeout(() => {
      this.showAddServiceAccountModal.set(false);
      this.addServiceAccountSuccess.set(false);
      this.showAdminNotice(`Service Account ${bindDn} provisioned successfully.`);
    }, 1200);
  }

  toggleSvcAcctPwRevealed(id: string): void {
    this.ldapServiceAccounts.update((accounts) =>
      accounts.map((a) => (a.id === id ? { ...a, passwordRevealed: !a.passwordRevealed } : a))
    );
  }

  toggleServiceAccountStatus(account: LdapServiceAccount): void {
    const newStatus: 'Active' | 'Revoked' = account.status === 'Active' ? 'Revoked' : 'Active';
    this.ldapServiceAccounts.update((accounts) =>
      accounts.map((a) => (a.id === account.id ? { ...a, status: newStatus } : a))
    );
    this.saveStored('vanguard_ldap_service_accounts', this.ldapServiceAccounts());
    this.logAuditEvent(
      `${newStatus === 'Revoked' ? 'Revoked' : 'Re-activated'} service account ${account.bindDn}`,
      'Cloud LDAP Directory',
      'LDAPS (636)',
      'success',
      newStatus === 'Revoked' ? 'Medium' : 'Low'
    );
    this.showAdminNotice(`Service Account ${account.name} marked as ${newStatus}.`);
  }

  deleteServiceAccount(id: string): void {
    const acct = this.ldapServiceAccounts().find((a) => a.id === id);
    this.ldapServiceAccounts.update((accounts) => accounts.filter((a) => a.id !== id));
    this.saveStored('vanguard_ldap_service_accounts', this.ldapServiceAccounts());
    if (acct) {
      this.logAuditEvent(`Deleted service account ${acct.bindDn}`, 'Cloud LDAP Directory', 'LDAPS (636)', 'success', 'Medium');
      this.showAdminNotice(`Service Account ${acct.bindDn} deleted.`);
    }
  }

  copySvcAcctPassword(password: string): void {
    this.showAdminNotice('Service account password copied to clipboard.');
    if (this.isBrowser && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(password).catch(() => {});
    }
  }

  copySvcAcctDn(dn: string): void {
    this.showAdminNotice('Bind DN copied to clipboard.');
    if (this.isBrowser && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(dn).catch(() => {});
    }
  }

  loadLdapDiagPreset(type: 'service-account' | 'user' | 'admin' | 'invalid'): void {
    if (type === 'service-account') {
      const sa = this.ldapServiceAccounts()[0];
      this.ldapDiagBindDn = sa ? sa.bindDn : 'uid=svc_synology,ou=services,dc=vanguard,dc=security';
      this.ldapDiagBindPassword = sa ? sa.bindPassword : 'Vang!Ldap_Synology#8842';
      this.ldapDiagSearchBase = 'dc=vanguard,dc=security';
      this.ldapDiagFilter = '(objectClass=posixAccount)';
    } else if (type === 'user') {
      const users = this.directoryUsers();
      const u = users[0];
      const username = u ? u.email.split('@')[0] : 'alex';
      this.ldapDiagBindDn = `uid=${username},ou=Users,dc=vanguard,dc=security`;
      this.ldapDiagBindPassword = 'Alex#Vanguard2026!';
      this.ldapDiagSearchBase = 'ou=Users,dc=vanguard,dc=security';
      this.ldapDiagFilter = `(mail=${u?.email || 'alex@vanguard.security'})`;
    } else if (type === 'admin') {
      this.ldapDiagBindDn = 'cn=admin,dc=vanguard,dc=security';
      this.ldapDiagBindPassword = this.ldapAdminPassword();
      this.ldapDiagSearchBase = 'dc=vanguard,dc=security';
      this.ldapDiagFilter = '(cn=*)';
    } else if (type === 'invalid') {
      this.ldapDiagBindDn = 'uid=svc_invalid,ou=services,dc=vanguard,dc=security';
      this.ldapDiagBindPassword = 'WrongPassword123!';
      this.ldapDiagSearchBase = 'dc=vanguard,dc=security';
      this.ldapDiagFilter = '(uid=svc_invalid)';
    }
    this.ldapTestResult.set(null);
    this.ldapDiagExecuted.set(false);
  }

  readonly ldapDiagLog = computed<string>(() => {
    const res = this.ldapTestResult();
    const endpoint = this.ldapDiagEndpoint || 'ldaps://ldap.vanguard.security:636';
    const bindDn = this.ldapDiagBindDn || 'cn=svc-ldap-readonly,ou=ServiceAccounts,dc=vanguard,dc=security';

    const users = this.directoryUsers();
    const user = users.find((u) => u.id === this.ldapDiagUserId) || users[0];
    const host = this.ldapHosts()[0];

    if (!res && (!user || !host)) {
      return '[*] Diagnostic Idle: Select a directory user to simulate an LDAPS 636 simple bind packet exchange.';
    }

    if (res && res.resultCode === 49) {
      return `[+] Initiating secure LDAPS connection to ldaps://ldap.vanguard.security:636...
[*] Target Endpoint: ${endpoint}
[*] TLS 1.3 Handshake completed: Cipher TLS_AES_256_GCM_SHA384, RSA 4096-bit key
[*] Server Certificate: CN=ldap.vanguard.security (Issued by Vanguard Root CA - Valid)
[*] Executing Simple Bind Request:
    Bind DN: ${bindDn}
    Target Directory: Supabase PostgreSQL Vault (Argon2id/Bcrypt validation)
[✗] Result Code: 49 (LDAP_INVALID_CREDENTIALS) - Authentication failed
[!] Diagnostic Warning: Password mismatch or credential revoked.
[!] Connection closed by client (TLS close_notify). Roundtrip duration: ${res.latencyMs}ms.`;
    }

    if (res && res.resultCode === 32) {
      return `[+] Initiating secure LDAPS connection to ldaps://ldap.vanguard.security:636...
[*] Target Endpoint: ${endpoint}
[*] TLS 1.3 Handshake completed: Cipher TLS_AES_256_GCM_SHA384, RSA 4096-bit key
[*] Server Certificate: CN=ldap.vanguard.security (Issued by Vanguard Root CA - Valid)
[*] Executing Simple Bind Request:
    Bind DN: ${bindDn}
[✗] Result Code: 32 (LDAP_NO_SUCH_OBJECT) - Target entry not found in tree
[!] Connection closed by client. Roundtrip duration: ${res.latencyMs}ms.`;
    }

    const username = user ? user.email.split('@')[0] : 'admin';

    return `[+] Initiating secure LDAPS connection to ldaps://ldap.vanguard.security:636...
[*] Target Endpoint: ${endpoint}
[*] TLS 1.3 Handshake completed: Cipher TLS_AES_256_GCM_SHA384, RSA 4096-bit key
[*] Server Certificate: CN=ldap.vanguard.security (Issued by Vanguard Root CA - Valid)
[*] Executing Simple Bind Request:
    Bind DN: ${bindDn.includes('Users') ? bindDn : `uid=${username},ou=Users,dc=vanguard,dc=security`}
    Target Directory: Supabase PostgreSQL Vault (Argon2id/Bcrypt validation)
    Client IP / Gateway: 10.100.1.15
[✓] Result Code: 0 (LDAP_SUCCESS) - Authentication successful
[+] Object attributes retrieved:
    dn: uid=${username},ou=Users,dc=vanguard,dc=security
    cn: ${user?.name || 'User'}
    mail: ${user?.email || 'user@vanguard.security'}
    departmentNumber: ${user?.department || 'Engineering'}
    employeeType: ${user?.role || 'Directory Member'}
    accountStatus: ${user?.accountStatus || 'Active'}
    memberOf: cn=${user?.department || 'Engineering'},ou=Groups,dc=vanguard,dc=security
[✓] Connection terminated gracefully (TLS close_notify). Roundtrip duration: ${res?.latencyMs || 1.8}ms.`;
  });

  runLdapBindTest(): void {
    this.ldapDiagRunning.set(true);
    this.ldapDiagExecuted.set(false);

    const isInvalid =
      this.ldapDiagBindPassword.toLowerCase().includes('wrong') ||
      this.ldapDiagBindPassword.toLowerCase().includes('invalid') ||
      !this.ldapDiagBindPassword.trim();
    const isNotFound =
      this.ldapDiagBindDn.includes('unknown') ||
      this.ldapDiagBindDn.includes('nonexistent');

    if (isInvalid) {
      this.ldapTestResult.set({
        resultCode: 49,
        resultName: 'LDAP_INVALID_CREDENTIALS',
        status: 'error',
        message: 'Authentication failed: Invalid credentials provided for Bind DN.',
        latencyMs: 3.2,
        tlsVersion: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        entriesFound: 0,
      });
      this.logAuditEvent(
        `LDAP Simple Bind FAILED (Code 49) for ${this.ldapDiagBindDn}`,
        'Cloud LDAP Directory',
        'LDAPS (636)',
        'blocked',
        'Medium'
      );
    } else if (isNotFound) {
      this.ldapTestResult.set({
        resultCode: 32,
        resultName: 'LDAP_NO_SUCH_OBJECT',
        status: 'warning',
        message: 'Target Distinguished Name was not found in directory tree.',
        latencyMs: 2.4,
        tlsVersion: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        entriesFound: 0,
      });
      this.logAuditEvent(
        `LDAP Object Not Found (Code 32) for ${this.ldapDiagBindDn}`,
        'Cloud LDAP Directory',
        'LDAPS (636)',
        'blocked',
        'Low'
      );
    } else {
      this.ldapTestResult.set({
        resultCode: 0,
        resultName: 'LDAP_SUCCESS',
        status: 'success',
        message: 'Simple Bind verified against Supabase PostgreSQL Vault over TLS 1.3.',
        latencyMs: 1.8,
        tlsVersion: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        entriesFound: 1,
        matchedDn: this.ldapDiagBindDn,
      });
      this.logAuditEvent(
        `LDAP Simple Bind SUCCESS (Code 0) for ${this.ldapDiagBindDn}`,
        'Cloud LDAP Directory',
        'LDAPS (636)',
        'success',
        'Low'
      );
    }

    setTimeout(() => {
      this.ldapDiagRunning.set(false);
      this.ldapDiagExecuted.set(true);
    }, 600);
  }

  copyLdapDiagLog(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.ldapDiagLog()).then(() => {
      this.copiedLdapLog.set(true);
      setTimeout(() => this.copiedLdapLog.set(false), 2500);
    });
  }

  toggleLdapAdminPwRevealed(): void {
    this.ldapAdminPwRevealed.update((v) => !v);
  }

  toggleLdapReadonlyPwRevealed(): void {
    this.ldapReadonlyPwRevealed.update((v) => !v);
  }

  regenerateLdapPasswords(): void {
    const randStr = (len: number) => Math.random().toString(36).substring(2, 2 + len);
    const newAdmin = `Vang!Ldap#Root_${randStr(6)}`;
    const newRO = `Vang!Ldap_RO_${randStr(6)}`;
    this.ldapAdminPassword.set(newAdmin);
    this.ldapReadonlyPassword.set(newRO);
    this.saveStored('vanguard_ldap_admin_pw', newAdmin);
    this.saveStored('vanguard_ldap_ro_pw', newRO);
    this.logAuditEvent('Regenerated Cloud LDAP service account credentials', 'LDAP Service Accounts', 'LDAPS (636)', 'success', 'Medium');
    this.showAdminNotice('Cloud LDAP Service Account passwords regenerated successfully.');
  }

  openAddLdapHostModal(): void {
    this.showAddLdapHostModal.set(true);
    this.newLdapHostName = '';
    this.newLdapHostType = 'NAS Storage';
    this.newLdapHostIp = '';
    this.newLdapHostProtocol = 'LDAPS (636)';
    this.addLdapHostSuccess.set(false);
    this.addLdapHostError.set(null);
  }

  closeAddLdapHostModal(): void {
    this.showAddLdapHostModal.set(false);
  }

  submitAddLdapHost(): void {
    this.addLdapHostError.set(null);
    if (!this.newLdapHostName.trim() || !this.newLdapHostIp.trim()) {
      this.addLdapHostError.set('Please provide host name and IP address / CIDR.');
      return;
    }

    const newHost: LdapHost = {
      id: 'host-' + Date.now(),
      name: this.newLdapHostName.trim(),
      type: this.newLdapHostType,
      ipAddress: this.newLdapHostIp.trim(),
      protocol: this.newLdapHostProtocol,
      status: 'Connected',
      dailyBinds: 0,
      bindUser: 'cn=svc-ldap-readonly,ou=ServiceAccounts,dc=vanguard,dc=security',
      lastActive: 'Just registered',
    };

    this.ldapHosts.update((hosts) => [newHost, ...hosts]);
    this.saveStored('vanguard_ldap_hosts', this.ldapHosts());
    this.logAuditEvent(`Registered LDAP host appliance: ${newHost.name}`, 'Cloud LDAP Directory', 'LDAPS (636)', 'success', 'Low');

    this.addLdapHostSuccess.set(true);
    setTimeout(() => {
      this.showAddLdapHostModal.set(false);
      this.addLdapHostSuccess.set(false);
      this.showAdminNotice(`Hardware client ${newHost.name} bound to Cloud LDAP.`);
    }, 1200);
  }

  deleteLdapHost(id: string): void {
    const host = this.ldapHosts().find((h) => h.id === id);
    this.ldapHosts.update((hosts) => hosts.filter((h) => h.id !== id));
    this.saveStored('vanguard_ldap_hosts', this.ldapHosts());
    if (host) {
      this.logAuditEvent(`Unlinked LDAP host ${host.name}`, 'Cloud LDAP Directory', 'LDAPS (636)', 'success', 'Low');
      this.showAdminNotice(`LDAP host ${host.name} unlinked from directory.`);
    }
  }

  toggleLdapHostStatus(host: LdapHost): void {
    const newStatus = host.status === 'Connected' ? 'Offline' : 'Connected';
    this.ldapHosts.update((hosts) =>
      hosts.map((h) => (h.id === host.id ? { ...h, status: newStatus } : h))
    );
    this.saveStored('vanguard_ldap_hosts', this.ldapHosts());
    this.showAdminNotice(`Host ${host.name} marked as ${newStatus}.`);
  }

  readonly radiusDiagLog = computed<string>(() => {
    const users = this.directoryUsers();
    const aps = this.radiusAccessPoints();

    if (users.length === 0 || aps.length === 0) {
      return '[!] Diagnostic Idle: Please register at least one RADIUS Access Point to execute 802.1X tests.';
    }

    const user = users.find((u) => u.id === this.radiusDiagUserId) || users[0];
    const ap = aps.find((a) => a.id === this.radiusDiagApId) || aps[0];
    const vlans = this.vlanMappings();
    const vlan = vlans.find((v) => user && (v.department.includes(user.department) || user.department.includes(v.department))) || vlans[0];

    return `radtest -t eap -s ${this.radiusSharedSecret()} ${user?.email || 'user@vanguard.security'} ******** ${ap?.ipAddress || '192.168.10.1'} 1812
[+] Sending Access-Request to radius.vanguard.security:1812:
    User-Name = "${user?.email || 'user@vanguard.security'}"
    NAS-IP-Address = ${ap?.ipAddress || '192.168.10.1'}
    NAS-Identifier = "${ap?.name || 'HQ-AP'}"
    NAS-Port-Type = Wireless-802.11
    EAP-Message = 0x0200001801... [EAP-Response/Identity: ${user?.email || 'user@vanguard.security'}]
    Message-Authenticator = 0x8a92f0... [HMAC-MD5 Shared Secret Verified]
[+] Received Access-Challenge from radius.vanguard.security:1812:
    EAP-Message = 0x0101001619... [EAP-Request/PEAP Start]
[*] Negotiating EAP-TLS / PEAP-MSCHAPv2 secure tunnel over UDP 1812...
[✓] Inner MSCHAPv2 Authentication verified against Vanguard Supabase Vault.
[✓] Received Access-Accept from radius.vanguard.security:1812:
    Tunnel-Type:0 = VLAN (13)
    Tunnel-Medium-Type:0 = IEEE-802 (6)
    Tunnel-Private-Group-Id:0 = "${vlan?.vlanId || 10}" [Dynamic 802.1Q Assignment -> ${vlan?.department || 'Default'}]
    Session-Timeout = 28800 (8 hours)
    Termination-Action = Default
[✓] Authentication SUCCESS: Access granted to 802.1X network. Total roundtrip: 12.4ms.`;
  });

  runRadiusAuthTest(): void {
    this.radiusDiagRunning.set(true);
    this.radiusDiagExecuted.set(false);
    setTimeout(() => {
      this.radiusDiagRunning.set(false);
      this.radiusDiagExecuted.set(true);
    }, 600);
  }

  copyRadiusDiagLog(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.radiusDiagLog()).then(() => {
      this.copiedRadiusLog.set(true);
      setTimeout(() => this.copiedRadiusLog.set(false), 2500);
    });
  }

  toggleRadiusSecretRevealed(): void {
    this.radiusSecretRevealed.update((v) => !v);
  }

  openRotateRadiusSecretModal(): void {
    this.showRotateRadiusSecretModal.set(true);
    this.rotateRadiusSecretSuccess.set(false);
  }

  closeRotateRadiusSecretModal(): void {
    this.showRotateRadiusSecretModal.set(false);
  }

  executeRotateRadiusSecret(): void {
    this.rotateRadiusSecretSuccess.set(true);
    const randChars = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newSecret = `Vang!Radius#Sec_${randChars}_2026`;

    setTimeout(() => {
      this.radiusSharedSecret.set(newSecret);
      this.saveStored('vanguard_radius_secret', newSecret);
      this.radiusSecretDaysRemaining.set(90);
      this.radiusAccessPoints.update((aps) =>
        aps.map((ap) => ({ ...ap, sharedSecret: newSecret }))
      );
      this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
      this.logAuditEvent('Rotated RADIUS Shared Secret across all Access Points', 'Cloud RADIUS Gateway', 'UDP 1812', 'success', 'Medium');
      this.showRotateRadiusSecretModal.set(false);
      this.rotateRadiusSecretSuccess.set(false);
      this.showAdminNotice('RADIUS Shared Secret successfully rotated across all Access Points (90 days validity).');
    }, 1200);
  }

  // ==========================================
  // Cloud RADIUS Helpers & Operations (SCRUM-23)
  // ==========================================
  isValidIpv4OrCidr(input: string): boolean {
    if (!input) return false;
    const trimmed = input.trim();
    const pattern = /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
    return pattern.test(trimmed);
  }

  generateHighEntropySecret(length = 24): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|';
    const all = upper + lower + numbers + symbols;

    let secret = '';
    secret += upper[Math.floor(Math.random() * upper.length)];
    secret += lower[Math.floor(Math.random() * lower.length)];
    secret += numbers[Math.floor(Math.random() * numbers.length)];
    secret += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
      secret += all[Math.floor(Math.random() * all.length)];
    }
    return secret.split('').sort(() => 0.5 - Math.random()).join('');
  }

  regenerateNewRadiusClientSecret(): void {
    this.newRadiusApSecret.set(this.generateHighEntropySecret(24));
  }

  toggleNewRadiusSecretRevealed(): void {
    this.newRadiusApSecretRevealed.update((v) => !v);
  }

  copyNewRadiusSecret(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(this.newRadiusApSecret()).then(() => {
      this.copiedRadiusSecretNotice.set(true);
      setTimeout(() => this.copiedRadiusSecretNotice.set(false), 2000);
    });
  }

  openAddRadiusApModal(): void {
    this.editingRadiusApId = null;
    this.newRadiusApName = '';
    this.newRadiusApType = 'Ubiquiti UniFi AP';
    this.newRadiusApIp = '';
    this.newRadiusApDesc = '';
    this.newRadiusApProtocol = 'PEAP-MSCHAPv2';
    this.newRadiusApSecret.set(this.generateHighEntropySecret(24));
    this.newRadiusApSecretRevealed.set(false);
    this.copiedRadiusSecretNotice.set(false);
    this.addRadiusApSuccess.set(false);
    this.addRadiusApError.set(null);
    this.showAddRadiusApModal.set(true);
  }

  openEditRadiusApModal(ap: RadiusAccessPoint): void {
    this.editingRadiusApId = ap.id;
    this.newRadiusApName = ap.name;
    this.newRadiusApType = ap.type;
    this.newRadiusApIp = ap.ipAddress;
    this.newRadiusApDesc = ap.description || '';
    this.newRadiusApProtocol = ap.authProtocol || 'PEAP-MSCHAPv2';
    this.newRadiusApSecret.set(ap.sharedSecret);
    this.newRadiusApSecretRevealed.set(false);
    this.copiedRadiusSecretNotice.set(false);
    this.addRadiusApSuccess.set(false);
    this.addRadiusApError.set(null);
    this.showAddRadiusApModal.set(true);
  }

  closeAddRadiusApModal(): void {
    this.showAddRadiusApModal.set(false);
    this.editingRadiusApId = null;
  }

  submitAddRadiusAp(): void {
    this.addRadiusApError.set(null);
    if (!this.newRadiusApName.trim() || !this.newRadiusApIp.trim()) {
      this.addRadiusApError.set('Please provide AP/Gateway name and IP address.');
      return;
    }

    if (!this.isValidIpv4OrCidr(this.newRadiusApIp.trim())) {
      this.addRadiusApError.set('Invalid IPv4 address or CIDR subnet (e.g. 192.168.1.0/24 or 10.0.0.1).');
      return;
    }

    const secret = this.newRadiusApSecret() || this.radiusSharedSecret() || this.generateHighEntropySecret(24);

    if (this.editingRadiusApId) {
      const editId = this.editingRadiusApId;
      this.radiusAccessPoints.update((aps) =>
        aps.map((ap) =>
          ap.id === editId
            ? {
                ...ap,
                name: this.newRadiusApName.trim(),
                type: this.newRadiusApType,
                ipAddress: this.newRadiusApIp.trim(),
                description: this.newRadiusApDesc.trim() || undefined,
                authProtocol: this.newRadiusApProtocol,
                sharedSecret: secret,
              }
            : ap
        )
      );
      this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
      this.logAuditEvent(`Updated RADIUS Client ${this.newRadiusApName.trim()}`, 'Cloud RADIUS Gateway', `${this.newRadiusApProtocol} / 802.1X`, 'success', 'Low');
      this.addRadiusApSuccess.set(true);
      setTimeout(() => {
        this.showAddRadiusApModal.set(false);
        this.addRadiusApSuccess.set(false);
        this.editingRadiusApId = null;
        this.showAdminNotice(`RADIUS Client ${this.newRadiusApName.trim()} updated.`);
      }, 1200);
      return;
    }

    const newAp: RadiusAccessPoint = {
      id: 'ap-' + Date.now(),
      name: this.newRadiusApName.trim(),
      type: this.newRadiusApType,
      ipAddress: this.newRadiusApIp.trim(),
      sharedSecret: secret,
      status: 'Active',
      lastAuthEvent: 'Just registered',
      description: this.newRadiusApDesc.trim() || undefined,
      authProtocol: this.newRadiusApProtocol,
      secretRevealed: false,
    };

    this.radiusAccessPoints.update((aps) => [newAp, ...aps]);
    this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
    this.logAuditEvent(`Added RADIUS Access Point ${newAp.name} (${newAp.ipAddress})`, 'Cloud RADIUS Gateway', `${newAp.authProtocol || '802.1X'} / WPA3`, 'success', 'Low');

    this.addRadiusApSuccess.set(true);
    setTimeout(() => {
      this.showAddRadiusApModal.set(false);
      this.addRadiusApSuccess.set(false);
      this.showAdminNotice(`RADIUS Access Point ${newAp.name} registered.`);
    }, 1200);
  }

  rotateRadiusClientSecret(id: string): void {
    const newSecret = this.generateHighEntropySecret(24);
    this.radiusAccessPoints.update((aps) =>
      aps.map((a) => (a.id === id ? { ...a, sharedSecret: newSecret, secretRevealed: true } : a))
    );
    this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
    const ap = this.radiusAccessPoints().find((a) => a.id === id);
    if (ap) {
      this.logAuditEvent(`Rotated shared secret for RADIUS client ${ap.name}`, 'Cloud RADIUS Gateway', '802.1X', 'success', 'Medium');
      this.showAdminNotice(`Cryptographic secret rotated for client ${ap.name}.`);
    }
  }

  toggleRadiusClientSecretRevealed(id: string): void {
    this.radiusAccessPoints.update((aps) =>
      aps.map((a) => (a.id === id ? { ...a, secretRevealed: !a.secretRevealed } : a))
    );
  }

  copyRadiusClientSecret(secret: string): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(secret).then(() => {
      this.showAdminNotice('RADIUS client secret copied to clipboard.');
    });
  }

  deleteRadiusAp(id: string): void {
    const ap = this.radiusAccessPoints().find((a) => a.id === id);
    this.radiusAccessPoints.update((aps) => aps.filter((a) => a.id !== id));
    this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
    if (ap) {
      this.logAuditEvent(`Removed RADIUS AP ${ap.name}`, 'Cloud RADIUS Gateway', '802.1X', 'success', 'Low');
      this.showAdminNotice(`Access point ${ap.name} removed from RADIUS network.`);
    }
  }

  toggleRadiusApStatus(ap: RadiusAccessPoint): void {
    const newStatus = ap.status === 'Active' ? 'Standby' : 'Active';
    this.radiusAccessPoints.update((aps) =>
      aps.map((a) => (a.id === ap.id ? { ...a, status: newStatus } : a))
    );
    this.saveStored('vanguard_radius_aps', this.radiusAccessPoints());
    this.showAdminNotice(`Access point ${ap.name} set to ${newStatus}.`);
  }

  setRadiusActivityFilter(filter: 'all' | 'Access-Accept' | 'Access-Reject'): void {
    this.radiusActivityFilter.set(filter);
  }

  simulateRadiusAuth(success: boolean = true): void {
    const users = this.directoryUsers();
    const aps = this.radiusAccessPoints();
    const user = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null;
    const ap = aps.length > 0 ? aps[Math.floor(Math.random() * aps.length)] : null;
    const protocols: ('PEAP-MSCHAPv2' | 'EAP-TLS' | 'PAP' | 'MS-CHAPv2')[] = ['PEAP-MSCHAPv2', 'EAP-TLS', 'PAP', 'MS-CHAPv2'];
    const proto = ap?.authProtocol || protocols[Math.floor(Math.random() * protocols.length)];

    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    const mac = `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;

    const event: RadiusAuthActivityEvent = {
      id: 'rad-act-' + Date.now(),
      timestamp: 'Just now',
      clientMac: mac,
      username: user ? user.email : 'contractor.device@vanguard.security',
      nasClientName: ap ? ap.name : 'Main HQ Wi-Fi - UniFi AP',
      nasIp: ap ? ap.ipAddress : '192.168.1.50',
      protocol: proto,
      status: success ? 'Access-Accept' : 'Access-Reject',
      vlanId: success ? (Math.floor(Math.random() * 3) + 1) * 10 : undefined,
      reason: success
        ? 'Inner MSCHAPv2 / TLS handshake verified against Supabase Vault'
        : 'Access-Reject: Credential mismatch or unassigned department policy',
    };

    this.radiusAuthActivity.update((events) => [event, ...events.slice(0, 19)]);
    this.logAuditEvent(
      `RADIUS 802.1X ${event.status} for ${event.username} via ${event.nasClientName}`,
      'Cloud RADIUS Gateway',
      event.protocol,
      success ? 'success' : 'blocked',
      success ? 'Low' : 'Medium'
    );
    this.showAdminNotice(`Simulated 802.1X ${event.status} event for ${event.username}`);
  }

  // ==========================================
  // PHASE 6: Mobile & Biometrics Actions
  // ==========================================
  openPairDeviceModal(): void {
    const token = 'vg_mob_pair_' + Math.random().toString(36).substring(2, 12);
    const key = `VG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.newPairingToken.set(token);
    this.newPairingKey.set(key);
    this.pairDeviceSuccess.set(false);
    this.showPairDeviceModal.set(true);
  }

  closePairDeviceModal(): void {
    this.showPairDeviceModal.set(false);
  }

  confirmPairDevice(): void {
    this.pairDeviceSuccess.set(true);
    const newDev: EnrolledDevice = {
      id: 'dev-' + Date.now(),
      name: `${this.displayName()}'s Mobile Authenticator`,
      model: 'Personal Authenticator Device',
      type: 'Mobile iOS',
      osVersion: 'iOS 18.x',
      ownerName: this.displayName(),
      ownerEmail: this.user()?.email || 'user@vanguard.security',
      department: 'Engineering',
      biometricType: 'Face ID',
      diskEncrypted: true,
      jailbroken: false,
      edrActive: true,
      complianceStatus: 'Compliant',
      enrolledAt: 'Just now',
      lastSync: 'Just now',
    };

    this.userDevices.update((devs) => [newDev, ...devs]);
    this.fleetDevices.update((devs) => [newDev, ...devs]);
    this.saveStored('vanguard_user_devices', this.userDevices());
    this.saveStored('vanguard_fleet_devices', this.fleetDevices());
    this.logAuditEvent(`Paired mobile companion device with biometric attestation`, 'Mobile MDM Hub', 'FIDO2 / Biometrics', 'success', 'Low');

    setTimeout(() => {
      this.showPairDeviceModal.set(false);
      this.pairDeviceSuccess.set(false);
      this.showAdminNotice(`Mobile device successfully paired with biometric Face ID attestation.`);
    }, 1200);
  }

  startPushSimulation(): void {
    const targetNum = Math.floor(10 + Math.random() * 89);
    const opt1 = Math.floor(10 + Math.random() * 89);
    const opt2 = Math.floor(10 + Math.random() * 89);
    const shuffled = [targetNum, opt1 === targetNum ? opt1 + 3 : opt1, opt2 === targetNum ? opt2 + 7 : opt2].sort(
      () => Math.random() - 0.5
    );

    this.simulatedChallengeNumber.set(targetNum);
    this.simulatedCandidateNumbers.set(shuffled);
    this.simulatedSelectedNumber.set(null);
    this.simulatedPushStep.set('notification');
    this.simulatedBiometricScanning.set(false);
    this.showPushSimulatorModal.set(true);
  }

  closePushSimulator(): void {
    this.showPushSimulatorModal.set(false);
  }

  openNotificationChallenge(): void {
    this.simulatedPushStep.set('challenge');
  }

  selectSimulatedNumberMatch(num: number): void {
    this.simulatedSelectedNumber.set(num);
    if (num === this.simulatedChallengeNumber()) {
      this.simulatedPushStep.set('biometric');
      this.simulatedBiometricScanning.set(true);
      setTimeout(() => {
        this.simulatedBiometricScanning.set(false);
        this.simulatedPushStep.set('approved');
      }, 1000);
    } else {
      this.simulatedPushStep.set('denied');
    }
  }

  denySimulatedPush(): void {
    this.simulatedPushStep.set('denied');
  }

  retryPushSimulation(): void {
    this.startPushSimulation();
  }

  openWipeDeviceModal(device: EnrolledDevice): void {
    this.selectedDeviceForWipe.set(device);
    this.wipeDeviceSuccess.set(false);
    this.showWipeDeviceModal.set(true);
  }

  closeWipeDeviceModal(): void {
    this.showWipeDeviceModal.set(false);
    this.selectedDeviceForWipe.set(null);
  }

  executeWipeDevice(): void {
    const dev = this.selectedDeviceForWipe();
    if (!dev) return;

    this.wipeDeviceSuccess.set(true);
    setTimeout(() => {
      this.userDevices.update((devs) => devs.filter((d) => d.id !== dev.id));
      this.fleetDevices.update((devs) =>
        devs.map((d) => (d.id === dev.id ? { ...d, complianceStatus: 'Revoked' } : d))
      );
      this.saveStored('vanguard_user_devices', this.userDevices());
      this.saveStored('vanguard_fleet_devices', this.fleetDevices());
      this.logAuditEvent(`Remote wipe executed on device ${dev.name}`, 'Mobile MDM Hub', 'Zero-Trust Revocation', 'blocked', 'High');
      this.showWipeDeviceModal.set(false);
      this.wipeDeviceSuccess.set(false);
      this.selectedDeviceForWipe.set(null);
      this.showAdminNotice(`Device ${dev.name} revoked and corporate keys wiped.`);
    }, 1200);
  }

  toggleFleetDeviceCompliance(device: EnrolledDevice): void {
    const newStatus: EnrolledDevice['complianceStatus'] =
      device.complianceStatus === 'Compliant' ? 'Warning' : 'Compliant';
    this.fleetDevices.update((devs) =>
      devs.map((d) => (d.id === device.id ? { ...d, complianceStatus: newStatus } : d))
    );
    this.userDevices.update((devs) =>
      devs.map((d) => (d.id === device.id ? { ...d, complianceStatus: newStatus } : d))
    );
    this.saveStored('vanguard_fleet_devices', this.fleetDevices());
    this.saveStored('vanguard_user_devices', this.userDevices());
    this.showAdminNotice(`Compliance status for ${device.name} updated to ${newStatus}.`);
  }

  updateMobilePolicy(key: keyof MobilePolicyConfig, val: boolean): void {
    this.mobilePolicy.update((pol) => ({ ...pol, [key]: val }));
    this.saveStored('vanguard_mobile_policy', this.mobilePolicy());
    this.showAdminNotice(`Mobile security policy updated.`);
  }

  private showAdminNotice(msg: string): void {
    this.adminActionNotice.set(msg);
    setTimeout(() => this.adminActionNotice.set(null), 4000);
  }

  // ==========================================
  // SSO Launch Simulator
  // ==========================================
  launchApp(app: SaaSApp): void {
    this.ssoLaunchingNotice.set(
      `Redirecting to ${app.name} via cryptographically signed ${app.protocol} assertion...`
    );
    setTimeout(() => {
      this.ssoLaunchingNotice.set(null);
      if (this.isBrowser) {
        window.open(app.launchUrl, '_blank');
      }
    }, 1200);
  }

  openRequestAppModal(): void {
    this.showRequestAppModal.set(true);
    this.requestedAppName = '';
    this.requestAppJustification = '';
    this.requestAppSuccess.set(false);
  }

  closeRequestAppModal(): void {
    this.showRequestAppModal.set(false);
  }

  submitAppRequest(): void {
    if (!this.requestedAppName.trim()) return;

    // Dynamically record into apps
    const requestedApp: SaaSApp = {
      id: 'app-' + Date.now(),
      name: this.requestedAppName.trim(),
      category: 'cloud',
      description: `User requested app: ${this.requestAppJustification.trim() || 'General access'}`,
      icon: '🚀',
      protocol: 'SAML 2.0',
      launchUrl: 'https://vanguard.security',
      assigned: true,
    };
    this.apps.update((prev) => [requestedApp, ...prev]);
    this.saveStored('vanguard_user_apps', this.apps());

    this.logAuditEvent(`Requested access for SaaS application: ${this.requestedAppName}`, 'User Application Portal', 'Access Request', 'success', 'Low');

    this.requestAppSuccess.set(true);
    setTimeout(() => {
      this.showRequestAppModal.set(false);
      this.requestAppSuccess.set(false);
    }, 2000);
  }

  // ==========================================
  // TOTP Authenticator Enrollment
  // ==========================================
  startEnrollTotp(): void {
    const email = this.user()?.email;
    if (!email) return;

    this.totpEnrollError.set(null);
    this.totpEnrollSuccess.set(false);
    this.totpVerifyCode = '';

    this.authService.enrollTotp(email).subscribe({
      next: (res) => {
        this.totpQrUrl.set(res.qrImageUrl);
        this.totpSecret.set(res.secret);
        this.showEnrollTotpModal.set(true);
      },
      error: (err) => {
        this.totpEnrollError.set(err.message || 'Failed to initialize Authenticator setup.');
      },
    });
  }

  closeEnrollTotpModal(): void {
    this.showEnrollTotpModal.set(false);
  }

  confirmEnrollTotp(): void {
    const email = this.user()?.email;
    const code = this.totpVerifyCode.trim();

    if (!email || !code || code.length !== 6) {
      this.totpEnrollError.set('Please enter a valid 6-digit confirmation code.');
      return;
    }

    this.authService.confirmEnrollTotp(email, code).subscribe({
      next: () => {
        this.totpEnrollSuccess.set(true);
        this.hasTotpEnrolled.set(true);
        this.logAuditEvent('Enrolled TOTP Authenticator App', 'MFA Vault', 'RFC 6238 TOTP', 'success', 'Low');
        setTimeout(() => {
          this.showEnrollTotpModal.set(false);
          this.totpEnrollSuccess.set(false);
        }, 2000);
      },
      error: (err) => {
        this.totpEnrollError.set(err.message || 'Failed to verify Authenticator code.');
      },
    });
  }

  // ==========================================
  // Recovery Codes Management
  // ==========================================
  generateRecoveryCodes(): void {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const p1 = Math.floor(1000 + Math.random() * 9000);
      const p2 = Math.floor(1000 + Math.random() * 9000);
      codes.push(`VANG-${p1}-${p2}`);
    }
    this.recoveryCodes.set(codes);
    this.saveStored('vanguard_recovery_codes', codes);
    this.logAuditEvent('Generated 10 emergency backup recovery codes', 'Personal Security Vault', 'One-Time Secret Vault', 'success', 'Medium');
    this.showAdminNotice('10 fresh emergency backup recovery codes generated.');
  }

  copyRecoveryCodes(): void {
    if (!this.isBrowser || !navigator?.clipboard?.writeText) return;
    const text = this.recoveryCodes().join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.copiedCodes.set(true);
      setTimeout(() => this.copiedCodes.set(false), 2500);
    });
  }

  downloadRecoveryCodes(): void {
    if (!this.isBrowser) return;
    const text =
      `VANGUARD SECURITY — EMERGENCY BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\nUser: ${
        this.user()?.email
      }\n\n` +
      this.recoveryCodes().map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nKeep these codes in a secure offline vault. Each code can only be used once.`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // SSH Key Management
  // ==========================================
  addSshKey(): void {
    this.sshKeyError.set(null);
    this.sshKeySuccess.set(false);

    const label = this.newKeyLabel.trim();
    const content = this.newKeyContent.trim();

    if (!label) {
      this.sshKeyError.set('Please enter a descriptive key name/label.');
      return;
    }

    if (!content.startsWith('ssh-rsa') && !content.startsWith('ssh-ed25519') && !content.startsWith('ecdsa-')) {
      this.sshKeyError.set('Invalid public key format. Must start with ssh-ed25519, ssh-rsa, or ecdsa.');
      return;
    }

    const keyType = content.split(' ')[0];
    const hash =
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      Math.random().toString(36).substring(2, 10).toUpperCase();
    const newKey: SSHKey = {
      id: 'key-' + Date.now(),
      label,
      fingerprint: `SHA256:${hash}`,
      keyType,
      addedAt: 'Just now',
    };

    this.sshKeys.update((keys) => [newKey, ...keys]);
    this.saveStored('vanguard_ssh_keys', this.sshKeys());
    this.logAuditEvent(`Added public SSH key: ${newKey.label}`, 'SSH Public Key Vault', newKey.keyType, 'success', 'Low');

    this.newKeyLabel = '';
    this.newKeyContent = '';
    this.sshKeySuccess.set(true);
    setTimeout(() => this.sshKeySuccess.set(false), 3000);
  }

  removeSshKey(id: string): void {
    const key = this.sshKeys().find((k) => k.id === id);
    this.sshKeys.update((keys) => keys.filter((k) => k.id !== id));
    this.saveStored('vanguard_ssh_keys', this.sshKeys());
    if (key) {
      this.logAuditEvent(`Removed SSH public key ${key.label}`, 'SSH Public Key Vault', key.keyType, 'success', 'Low');
    }
  }

  // ==========================================
  // Common Actions
  // ==========================================
  copyUserId(): void {
    const id = this.user()?.id;
    if (!id || !this.isBrowser) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        this.copiedUserId.set(true);
        setTimeout(() => this.copiedUserId.set(false), 2500);
      });
    }
  }

  revokeAllSessions(): void {
    this.sessionRevoked.set(true);
    this.logAuditEvent('Revoked all other active sessions', 'User Session Manager', 'Supabase JWT', 'success', 'Medium');
    setTimeout(() => this.sessionRevoked.set(false), 4000);
  }

  onLogout(): void {
    this.logAuditEvent('User signed out of portal', 'Authentication Gateway', 'Web Session', 'success', 'Low');
    this.authService.logout();
  }

}
