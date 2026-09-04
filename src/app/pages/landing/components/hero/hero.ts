import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrls: ['./hero.css']
})
export class Hero {
  protocols = ['SAML 2.0', 'OIDC', 'CLOUD LDAP', 'RADIUS', 'SCIM', 'WEBAUTHN'];

  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  scrollToServices(event: Event): void {
    event.preventDefault();
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }
}
