export interface ProtocolStatus {
  name: string;
  type: string;
  port: string;
  status: 'online' | 'standby' | 'healthy';
  description: string;
  badge: string;
  certExpiry?: string;
}

export interface SaaSApp {
  id: string;
  name: string;
  category: 'cloud' | 'developer' | 'collaboration';
  description: string;
  icon: string;
  protocol: 'SAML 2.0' | 'OIDC';
  launchUrl: string;
  assigned: boolean;
}

export interface SignInEvent {
  id: string;
  timestamp: string;
  application: string;
  protocol: string;
  device: string;
  ip: string;
  location: string;
  status: 'success' | 'mfa_required' | 'blocked';
}

export interface SSHKey {
  id: string;
  label: string;
  fingerprint: string;
  keyType: string;
  addedAt: string;
}

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  department: 'Engineering' | 'Security Ops' | 'IT Infrastructure' | 'Finance' | 'Executive';
  role: 'Super Administrator' | 'Security Officer' | 'Directory Member';
  mfaStatus: 'Enrolled (TOTP)' | 'Email OTP Only';
  accountStatus: 'Active' | 'Suspended' | 'Pending';
  lastLogin: string;
  initials: string;
  temporaryPassword?: string;
}

export interface TenantAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  target: string;
  protocol: 'SAML 2.0' | 'OIDC' | 'LDAPS (636)' | 'RADIUS (1812)' | 'Web Portal' | (string & {});
  clientIp: string;
  location: string;
  device: string;
  status: 'success' | 'challenge' | 'blocked';
  riskScore: 'Low' | 'Medium' | 'High';
}

export interface SamlConnector {
  id: string;
  name: string;
  icon: string;
  protocol: 'SAML 2.0' | 'OIDC';
  entityId: string;
  acsUrl: string;
  nameIdFormat: string;
  signResponse: boolean;
  signAssertion: boolean;
  status: 'Active' | 'Draft' | 'Inactive';
  assignedGroups: string[];
  lastSsoEvent?: string;
}

export interface OidcClient {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  revealed?: boolean;
  redirectUris: string[];
  grantTypes: ('authorization_code' | 'client_credentials' | 'refresh_token')[];
  allowedScopes: string[];
  createdAt: string;
}

export interface IdpCertMetadata {
  subject: string;
  issuer: string;
  serialNumber: string;
  algorithm: string;
  validFrom: string;
  validUntil: string;
  daysRemaining: number;
  sha256Fingerprint: string;
  keySize: string;
}

export interface LdapHost {
  id: string;
  name: string;
  type: 'NAS Storage' | 'Linux Server Cluster' | 'Legacy Application';
  ipAddress: string;
  protocol: 'LDAPS (636)' | 'StartTLS (389)';
  status: 'Connected' | 'Offline';
  dailyBinds: number;
  bindUser: string;
  lastActive: string;
}

export interface RadiusAccessPoint {
  id: string;
  name: string;
  type: 'Aruba WPA3 Enterprise' | 'Cisco Catalyst 9100' | 'Palo Alto GlobalProtect' | 'WireGuard Gateway';
  ipAddress: string;
  sharedSecret: string;
  status: 'Active' | 'Standby';
  lastAuthEvent: string;
}

export interface VlanMapping {
  department: string;
  vlanId: number;
  subnetCidr: string;
  description: string;
  isolated: boolean;
}

export interface EnrolledDevice {
  id: string;
  name: string;
  model: string;
  type: 'Mobile iOS' | 'Mobile Android' | 'macOS Workstation' | 'Windows Workstation';
  osVersion: string;
  ownerName: string;
  ownerEmail: string;
  department: string;
  biometricType: 'Face ID' | 'Touch ID' | 'Windows Hello' | 'Fingerprint' | 'None';
  diskEncrypted: boolean;
  jailbroken: boolean;
  edrActive: boolean;
  complianceStatus: 'Compliant' | 'Warning' | 'Revoked';
  enrolledAt: string;
  lastSync: string;
}

export interface MobilePolicyConfig {
  enforceNumberMatching: boolean;
  enforceBiometrics: boolean;
  blockJailbroken: boolean;
  inactivityLockoutMinutes: number;
}

