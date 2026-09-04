import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ServiceCard {
  tag: string;
  name: string;
  description: string;
  icon: string; // SVG path data
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css']
})
export class Services {
  services: ServiceCard[] = [
    {
      tag: 'SAML 2.0 · OIDC',
      name: 'Single Sign-On',
      description: 'Federated authentication for all your web apps. NestJS signs every JWT and XML assertion with PKI — passwords never leave the perimeter.',
      icon: 'shield'
    },
    {
      tag: 'PUSH · TOTP · BIOMETRICS',
      name: 'Multi-Factor Auth',
      description: 'Out-of-band push approvals from the VANGUARDSecurity mobile app. TOTP, biometrics, and WebAuthn — all in one native authenticator.',
      icon: 'lock'
    },
    {
      tag: 'CLOUD LDAP',
      name: 'Legacy Directory',
      description: 'Cloud LDAP bind endpoint resolves credentials against your central Supabase directory. NAS drives and legacy apps bind without a local AD server.',
      icon: 'database'
    },
    {
      tag: 'RADIUS',
      name: 'Network Access Control',
      description: 'Wi-Fi access points and VPN gateways authenticate through VANGUARDSecurity. No more shared network keys — every device is identifiable.',
      icon: 'server'
    },
    {
      tag: 'IMMUTABLE LOG',
      name: 'Real-Time Audit Trail',
      description: 'Every auth event, policy change, and directory sync is written to an immutable audit log. SOC 2 and compliance-ready from day one.',
      icon: 'file'
    },
    {
      tag: 'ANGULAR · REACT NATIVE',
      name: 'Admin Console + Mobile',
      description: 'A modular Angular dashboard for directory configuration and a React Native app for on-the-go MFA approvals and biometric unlock.',
      icon: 'monitor'
    },
  ];
}
