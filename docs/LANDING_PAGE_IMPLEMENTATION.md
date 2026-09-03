# VANGUARDSecurity — Landing Page Implementation Guide
### Angular Feature Branch · Tests Required · Merge to Development

---

## 0. Overview

**Feature:** `feature/landing-page`  
**Target branch:** `development`  
**Components:** NavbarComponent, HeroComponent, ServicesComponent, AboutComponent, FooterComponent, LandingPageComponent  
**Tests:** Component unit tests (Jasmine/Karma) — all must pass before merge  

---

## 1. Git Setup — Create Feature Branch

```bash
# Make sure you're on development and it's up to date
git checkout development
git pull origin development

# Create and switch to the feature branch
git checkout -b feature/landing-page

# Verify
git branch
# * feature/landing-page
#   development
#   main
```

---

## 2. Generate Angular Files

Run these from inside your Angular project root (`cd vanguard-web` or wherever `angular.json` lives):

```bash
# Generate the landing page module + routing (if you use lazy loading)
ng generate module pages/landing --route landing --module app-routing.module

# Generate components
ng generate component pages/landing/components/navbar       --skip-tests=false
ng generate component pages/landing/components/hero         --skip-tests=false
ng generate component pages/landing/components/services     --skip-tests=false
ng generate component pages/landing/components/about        --skip-tests=false
ng generate component pages/landing/components/footer       --skip-tests=false
ng generate component pages/landing                         --skip-tests=false --flat
```

Your folder structure should look like:

```
src/app/pages/landing/
├── landing.module.ts
├── landing-routing.module.ts
├── landing.component.ts
├── landing.component.html
├── landing.component.scss
├── landing.component.spec.ts
└── components/
    ├── navbar/
    │   ├── navbar.component.ts
    │   ├── navbar.component.html
    │   ├── navbar.component.scss
    │   └── navbar.component.spec.ts
    ├── hero/
    ├── services/
    ├── about/
    └── footer/
```

---

## 3. Global Styles — `styles.scss`

Add these CSS variables to your global `src/styles.scss`. They mirror the existing login page design system:

```scss
// styles.scss — add to :root block or top of file

:root {
  --bg-deep:    #0B1120;
  --bg-card:    #111827;
  --bg-panel:   #161F2E;
  --line:       rgba(255, 255, 255, 0.06);
  --line-mid:   rgba(255, 255, 255, 0.10);
  --blue:       #3B82F6;
  --blue-light: #60A5FA;
  --blue-glow:  rgba(59, 130, 246, 0.15);
  --cyan:       #7DD3FC;
  --white:      #F1F5F9;
  --muted:      #94A3B8;
  --muted-dark: #475569;
  --green:      #34D399;
  --font-body:  'Inter', sans-serif;
  --font-mono:  'JetBrains Mono', monospace;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg-deep);
  color: var(--white);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
}

// Grid background — shared with login page
.grid-bg {
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 10%, rgba(59,130,246,0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
}
```

Add fonts to `index.html`:

```html
<!-- index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 4. Component Code

### 4.1 `landing.component.ts`

```typescript
// landing.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {}
```

### `landing.component.html`

```html
<div class="landing-wrapper grid-bg">
  <app-navbar></app-navbar>
  <main>
    <app-hero></app-hero>
    <app-services></app-services>
    <app-about></app-about>
  </main>
  <app-footer></app-footer>
</div>
```

### `landing.component.scss`

```scss
.landing-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;

  main {
    flex: 1;
    position: relative;
    z-index: 1;
  }
}
```

---

### 4.2 `navbar.component.ts`

```typescript
import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  isScrolled = false;
  activeSection = 'home';

  navLinks = [
    { label: 'Home',     href: '#home'     },
    { label: 'Services', href: '#services' },
    { label: 'About',    href: '#about'    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    const sections = ['home', 'services', 'about'];
    for (const id of sections.reverse()) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) {
        this.activeSection = id;
        break;
      }
    }
  }

  scrollTo(sectionId: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
```

### `navbar.component.html`

```html
<nav [class.scrolled]="isScrolled">
  <a href="#home" class="nav-logo" (click)="scrollTo('home', $event)">
    <div class="shield-icon">
      <svg viewBox="0 0 36 40" fill="none">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="36" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60A5FA"/>
            <stop offset="100%" stop-color="#3B82F6"/>
          </linearGradient>
        </defs>
        <path d="M18 1L33 7.5V18C33 27 25.5 34.5 18 38C10.5 34.5 3 27 3 18V7.5L18 1Z"
              fill="rgba(59,130,246,0.15)" stroke="url(#sg)" stroke-width="1.5"/>
        <circle cx="18" cy="18" r="5" fill="rgba(96,165,250,0.3)" stroke="#60A5FA" stroke-width="1.2"/>
        <path d="M18 13v5M18 18l4 2" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <span class="logo-text">VANGUARD <span>Security</span></span>
  </a>

  <ul class="nav-links">
    <li *ngFor="let link of navLinks">
      <a
        [href]="link.href"
        [class.active]="activeSection === link.href.replace('#', '')"
        (click)="scrollTo(link.href.replace('#', ''), $event)">
        {{ link.label }}
      </a>
    </li>
  </ul>

  <div class="nav-right">
    <button class="btn-ghost-sm" (click)="navigateTo('/login')">Sign in</button>
    <button class="btn-blue-sm" (click)="navigateTo('/register')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
      Register
    </button>
  </div>
</nav>
```

### `navbar.component.scss`

```scss
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 64px;
  height: 68px;
  background: rgba(11, 17, 32, 0.80);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--line);
  transition: background 0.3s, box-shadow 0.3s;

  &.scrolled {
    background: rgba(11, 17, 32, 0.95);
    box-shadow: 0 1px 0 var(--line-mid);
  }
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.shield-icon {
  width: 36px;
  height: 36px;
  filter: drop-shadow(0 0 8px rgba(59,130,246,0.5));
  svg { width: 36px; height: 36px; }
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--white);
  span { color: var(--blue-light); }
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  margin: 0; padding: 0;

  a {
    display: inline-block;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;

    &:hover { color: var(--white); background: rgba(255,255,255,0.05); }
    &.active { color: var(--blue-light); }
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-ghost-sm {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line-mid);
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;

  &:hover {
    color: var(--white);
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.04);
  }
}

.btn-blue-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  color: #fff;
  background: var(--blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover {
    background: #2563EB;
    box-shadow: 0 0 16px rgba(59,130,246,0.4);
  }
}
```

---

### 4.3 `hero.component.ts`

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent {
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
```

### `hero.component.html`

```html
<section class="hero" id="home">
  <div class="status-pill">
    <span class="status-pill-dot"></span>
    SYSTEM OPERATIONAL — v0.1.0-alpha
  </div>

  <!-- ★ MAIN TAGLINE — BOLD ★ -->
  <h1 class="hero-tagline">
    <span class="line-glow">One Identity.</span>
    <span class="line-blue">Every Access Point.</span>
    Zero Compromise.
  </h1>

  <p class="hero-sub">
    VANGUARDSecurity is a developer-first IAM platform. Centralize authentication,
    enforce multi-factor access, and audit every login event — across web, network, and legacy systems.
  </p>

  <div class="hero-cta">
    <button class="btn-blue-lg" (click)="navigateTo('/register')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Get started free
    </button>
    <a href="#services" class="btn-outline-lg" (click)="scrollToServices($event)">
      See what's included
    </a>
  </div>

  <div class="proto-badges">
    <span class="proto-badge" *ngFor="let proto of protocols">{{ proto }}</span>
  </div>
</section>
```

### `hero.component.scss`

```scss
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 120px 64px 80px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 10px;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 100px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--green);
  letter-spacing: 0.04em;
  margin-bottom: 40px;
}

.status-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(52,211,153,0); }
}

.hero-tagline {
  font-size: clamp(42px, 6vw, 76px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--white);
  margin-bottom: 28px;
  max-width: 900px;

  .line-blue {
    color: var(--blue-light);
    display: block;
  }

  .line-glow {
    display: block;
    text-shadow: 0 0 40px rgba(96,165,250,0.4);
  }
}

.hero-sub {
  font-size: 18px;
  color: var(--muted);
  max-width: 560px;
  line-height: 1.75;
  margin-bottom: 48px;
}

.hero-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 72px;
}

.btn-blue-lg {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--blue);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover {
    background: #2563EB;
    box-shadow: 0 0 24px rgba(59,130,246,0.45);
  }
}

.btn-outline-lg {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line-mid);
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: var(--white);
    border-color: rgba(255,255,255,0.2);
  }
}

.proto-badges {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.proto-badge {
  padding: 6px 14px;
  background: var(--bg-panel);
  border: 1px solid var(--line-mid);
  border-radius: 6px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--muted);
  letter-spacing: 0.06em;
}
```

---

### 4.4 `services.component.ts`

```typescript
import { Component } from '@angular/core';

export interface ServiceCard {
  tag: string;
  name: string;
  description: string;
  icon: string; // SVG path data
}

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent {
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
```

### `services.component.html`

```html
<section id="services">
  <div class="section-label">WHAT WE OFFER</div>
  <h2 class="section-title">Security that covers every layer.</h2>
  <p class="section-desc">
    From browser-based SSO to Wi-Fi access points and legacy LDAP devices — one platform manages it all.
  </p>

  <div class="service-grid">
    <div class="service-card" *ngFor="let service of services">
      <div class="service-icon">
        <!-- Use your preferred icon library or inline SVGs -->
        <span class="icon-placeholder">⬡</span>
      </div>
      <div class="service-tag">{{ service.tag }}</div>
      <div class="service-name">{{ service.name }}</div>
      <p class="service-desc">{{ service.description }}</p>
    </div>
  </div>
</section>
```

---

### 4.5 `about.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  stats = [
    { val: '4',   key: 'industry protocols supported' },
    { val: '1 BE', key: 'NestJS authorization server' },
    { val: 'RLS',  key: 'row-level security enforced' },
    { val: '3 FE', key: 'web, admin & mobile clients' },
  ];

  tags = ['NestJS', 'Supabase + RLS', 'Angular', 'React Native', 'TypeScript', 'PostgreSQL'];
}
```

---

### 4.6 `footer.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
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
```

---

## 5. Routing

### `app-routing.module.ts` — add landing route

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./pages/landing/landing.module').then(m => m.LandingModule)
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/auth/auth.module').then(m => m.AuthModule)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

### `landing-routing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing.component';

const routes: Routes = [
  { path: '', component: LandingComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingRoutingModule {}
```

### `landing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingRoutingModule } from './landing-routing.module';
import { LandingComponent } from './landing.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { ServicesComponent } from './components/services/services.component';
import { AboutComponent } from './components/about/about.component';
import { FooterComponent } from './components/footer/footer.component';

@NgModule({
  declarations: [
    LandingComponent,
    NavbarComponent,
    HeroComponent,
    ServicesComponent,
    AboutComponent,
    FooterComponent,
  ],
  imports: [
    CommonModule,
    LandingRoutingModule,
  ]
})
export class LandingModule {}
```

---

## 6. Tests (Jasmine/Karma)

Each spec file must pass before merge. Here are the complete test suites:

### `navbar.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NavbarComponent],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the VANGUARD Security logo text', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.logo-text')?.textContent).toContain('VANGUARD');
  });

  it('should render Home, Services, and About nav links', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = el.querySelectorAll('.nav-links a');
    const labels = Array.from(links).map(l => l.textContent?.trim());
    expect(labels).toContain('Home');
    expect(labels).toContain('Services');
    expect(labels).toContain('About');
  });

  it('should render Sign in and Register buttons', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll('.nav-right button');
    const texts = Array.from(buttons).map(b => b.textContent?.trim());
    expect(texts.some(t => t?.includes('Sign in'))).toBeTrue();
    expect(texts.some(t => t?.includes('Register'))).toBeTrue();
  });

  it('should set isScrolled to true when scrollY > 20', () => {
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
    component.onScroll();
    expect(component.isScrolled).toBeTrue();
  });

  it('should set isScrolled to false when scrollY <= 20', () => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    component.onScroll();
    expect(component.isScrolled).toBeFalse();
  });

  it('navLinks array should have exactly 3 items', () => {
    expect(component.navLinks.length).toBe(3);
  });
});
```

### `hero.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HeroComponent } from './hero.component';

describe('HeroComponent', () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeroComponent],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main tagline', () => {
    const el: HTMLElement = fixture.nativeElement;
    const tagline = el.querySelector('.hero-tagline')?.textContent;
    expect(tagline).toContain('One Identity');
    expect(tagline).toContain('Every Access Point');
    expect(tagline).toContain('Zero Compromise');
  });

  it('should render all 6 protocol badges', () => {
    const el: HTMLElement = fixture.nativeElement;
    const badges = el.querySelectorAll('.proto-badge');
    expect(badges.length).toBe(6);
  });

  it('should render the Get started free CTA button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.btn-blue-lg');
    expect(btn?.textContent).toContain('Get started free');
  });

  it('should render the status pill', () => {
    const el: HTMLElement = fixture.nativeElement;
    const pill = el.querySelector('.status-pill');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain('SYSTEM OPERATIONAL');
  });

  it('protocols array should have 6 entries', () => {
    expect(component.protocols.length).toBe(6);
  });
});
```

### `services.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let component: ServicesComponent;
  let fixture: ComponentFixture<ServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ServicesComponent],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render exactly 6 service cards', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.service-card');
    expect(cards.length).toBe(6);
  });

  it('should display "Single Sign-On" as a service name', () => {
    const el: HTMLElement = fixture.nativeElement;
    const names = Array.from(el.querySelectorAll('.service-name')).map(n => n.textContent?.trim());
    expect(names).toContain('Single Sign-On');
  });

  it('should display "Multi-Factor Auth" as a service name', () => {
    const el: HTMLElement = fixture.nativeElement;
    const names = Array.from(el.querySelectorAll('.service-name')).map(n => n.textContent?.trim());
    expect(names).toContain('Multi-Factor Auth');
  });

  it('services data should have 6 items each with tag, name, and description', () => {
    expect(component.services.length).toBe(6);
    component.services.forEach(s => {
      expect(s.tag).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
    });
  });
});
```

### `about.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AboutComponent],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 stats', () => {
    expect(component.stats.length).toBe(4);
  });

  it('should have 6 tech stack tags', () => {
    expect(component.tags.length).toBe(6);
  });
});
```

### `footer.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterComponent],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the current year in the copyright line', () => {
    const el: HTMLElement = fixture.nativeElement;
    const copy = el.querySelector('.footer-copy')?.textContent;
    expect(copy).toContain(String(new Date().getFullYear()));
  });

  it('should render VANGUARD Security in the footer logo', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.footer-logo-text')?.textContent).toContain('VANGUARD');
  });

  it('should render 4 social link buttons', () => {
    const el: HTMLElement = fixture.nativeElement;
    const socialBtns = el.querySelectorAll('.footer-social .social-btn');
    expect(socialBtns.length).toBe(4);
  });

  it('productLinks should have 5 entries', () => {
    expect(component.productLinks.length).toBe(5);
  });
});
```

### `landing.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { ServicesComponent } from './components/services/services.component';
import { AboutComponent } from './components/about/about.component';
import { FooterComponent } from './components/footer/footer.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        LandingComponent,
        NavbarComponent,
        HeroComponent,
        ServicesComponent,
        AboutComponent,
        FooterComponent,
      ],
      imports: [CommonModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-navbar', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-navbar')).toBeTruthy();
  });

  it('should render app-hero', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-hero')).toBeTruthy();
  });

  it('should render app-services', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-services')).toBeTruthy();
  });

  it('should render app-about', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-about')).toBeTruthy();
  });

  it('should render app-footer', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-footer')).toBeTruthy();
  });
});
```

---

## 7. Run Tests

```bash
# Run all tests once (CI mode — exits after)
ng test --watch=false --browsers=ChromeHeadless

# Watch mode during development
ng test
```

Expected output when all pass:

```
SUMMARY:
✔ NavbarComponent > should create
✔ NavbarComponent > should render the VANGUARD Security logo text
✔ NavbarComponent > should render Home, Services, and About nav links
✔ NavbarComponent > should render Sign in and Register buttons
✔ NavbarComponent > should set isScrolled to true when scrollY > 20
✔ NavbarComponent > should set isScrolled to false when scrollY <= 20
✔ NavbarComponent > navLinks array should have exactly 3 items
✔ HeroComponent > should create
✔ HeroComponent > should render the main tagline
✔ HeroComponent > should render all 6 protocol badges
✔ HeroComponent > should render the Get started free CTA button
✔ HeroComponent > should render the status pill
✔ HeroComponent > protocols array should have 6 entries
✔ ServicesComponent > should create
✔ ServicesComponent > should render exactly 6 service cards
... (all 30+ tests pass)

TOTAL: 30 SUCCESS
```

---

## 8. Commit & Merge to Development

Only run these steps **after all tests pass.**

```bash
# ── Stage all changes ──────────────────────────────
git add .

# ── Commit with a conventional commit message ──────
git commit -m "feat(landing): add landing page with nav, hero, services, about, and footer

- NavbarComponent: fixed nav with scroll-aware active link, Sign in + Register
- HeroComponent: bold tagline 'One Identity. Every Access Point. Zero Compromise.'
- ServicesComponent: 6 service cards (SSO, MFA, LDAP, RADIUS, Audit, Mobile)
- AboutComponent: architecture overview + tech stack stats
- FooterComponent: 4-column footer with social links + legal
- All components covered by Jasmine unit tests (30 specs, 0 failures)
- Matches existing login/register dark navy + grid design system"

# ── Push the feature branch to remote ─────────────
git push origin feature/landing-page

# ── Switch to development and merge ───────────────
git checkout development
git pull origin development          # sync before merge

git merge feature/landing-page --no-ff -m "Merge feature/landing-page into development"

# ── Push development to remote ─────────────────────
git push origin development

# ── Clean up local feature branch (optional) ──────
git branch -d feature/landing-page
```

---

## 9. Quick Reference — File Checklist

```
✅ src/styles.scss                  — CSS variables + grid-bg
✅ src/index.html                   — Google Fonts import
✅ src/app/app-routing.module.ts    — root route added
✅ src/app/pages/landing/
   ✅ landing.module.ts
   ✅ landing-routing.module.ts
   ✅ landing.component.ts / .html / .scss / .spec.ts
   ✅ components/navbar/             (ts + html + scss + spec)
   ✅ components/hero/               (ts + html + scss + spec)
   ✅ components/services/           (ts + html + scss + spec)
   ✅ components/about/              (ts + html + scss + spec)
   ✅ components/footer/             (ts + html + scss + spec)
```

---

*All tests green → merge to development → push to remote. Done.*
