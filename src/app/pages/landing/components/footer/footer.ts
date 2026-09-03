import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class Footer {
  currentYear = new Date().getFullYear();

  productLinks = [
    { label: 'Single sign-on', href: '#' },
    { label: 'Multi-factor auth', href: '#' },
    { label: 'Directory sync', href: '#' },
    { label: 'Network access', href: '#' },
    { label: 'Audit logging', href: '#' },
  ];

  devLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'API reference', href: '#' },
    { label: 'SDK guides', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'GitHub', href: '#' },
  ];

  companyLinks = [
    { label: 'About', href: '#about' },
    { label: 'Security', href: '#' },
    { label: 'Compliance', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ];
}
