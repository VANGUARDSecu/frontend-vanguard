# Vanguard Security Platform - Standard First-Timer User Guide

Welcome to the **Vanguard Security Platform**! This guide is designed for new employees and corporate users joining an organization secured by Vanguard Zero-Trust Identity & Access Management.

---

## Table of Contents
1. [Introduction to Vanguard](#1-introduction-to-vanguard)
2. [First-Time Sign-In & Account Activation](#2-first-time-sign-in--account-activation)
3. [Hardening Your Password](#3-hardening-your-password)
4. [Setting Up 2-Step Verification (MFA)](#4-setting-up-2-step-verification-mfa)
5. [Using Out-of-Band Mobile Push MFA](#5-using-out-of-band-mobile-push-mfa)
6. [Emergency Recovery Codes](#6-emergency-recovery-codes)
7. [Single Sign-On (SSO) Application Launchpad](#7-single-sign-on-sso-application-launchpad)
8. [Requesting Access to Applications](#8-requesting-access-to-applications)
9. [Connecting to Corporate Wi-Fi (802.1X / EAP-TLS)](#9-connecting-to-corporate-wi-fi-8021x--eap-tls)
10. [Managing Public SSH Keys](#10-managing-public-ssh-keys)
11. [Personal Vault & 2FA Authenticator](#11-personal-vault--2fa-authenticator)
12. [Monitoring Personal Sign-In Activity & Security Alerts](#12-monitoring-personal-sign-in-activity--security-alerts)
13. [Troubleshooting & Frequently Asked Questions](#13-troubleshooting--frequently-asked-questions)

---

## 1. Introduction to Vanguard

Vanguard is your company's **Zero-Trust Identity Portal**. Instead of maintaining dozens of passwords for different internal tools, your single Vanguard account grants you verified, encrypted access to all your assigned SaaS applications, corporate wireless networks, and developer infrastructure.

### Core Principles
- **Verify Explicitly**: Your identity and device security are verified before access is granted.
- **Least-Privilege Access**: You receive access strictly to the tools and applications your department requires.
- **Continuous Protection**: Sessions are protected by multi-factor authentication, biometric verification, and automated threat telemetry.

---

## 2. First-Time Sign-In & Account Activation

When your organization creates your account, you will receive an invitation email containing:
- **Your Corporate Email Address**
- **A Temporary Password** (format: `Vanguard#XXXX!`)
- **Login Portal Link**: `http://localhost:4200/login`

### Step-by-Step Initial Login:
1. Navigate to the login portal at [`/login`](http://localhost:4200/login).
2. Enter your corporate email address and temporary password.
3. Check **"Remember Me"** if you are using your assigned, secure corporate laptop.
4. Click **Sign In With Vanguard**.
5. You will be prompted for **2-Step Verification**:
   - Check your corporate email inbox for an 8-digit verification code.
   - Enter the code on screen to complete authentication.

---

## 3. Hardening Your Password

If you signed in using a temporary password, you must replace it immediately with a permanent, secure personal password.

### Password Complexity Rules:
- **Minimum 8 characters** in length
- At least **one uppercase letter** (`A-Z`)
- At least **one number** (`0-9`)
- At least **one special character** (`!@#$%^&*`, etc.)
- Must be distinct from your current temporary password

### How to Change Your Password:
1. In the **User Portal**, select the **Security & MFA** tab.
2. In the **Password & Credentials** card, click **Update Password**.
3. Enter your current password and your new chosen password.
4. Confirm your new password and click **Save Password**.

---

## 4. Setting Up 2-Step Verification (MFA)

To ensure unauthorized parties cannot access your account even if your password were ever compromised, Vanguard requires secondary verification.

### Supported Second Factors:
- **Email OTP**: 8-digit codes dispatched to your corporate email.
- **Authenticator App (TOTP)**: 6-digit rotating time-based codes from Google Authenticator, Microsoft Authenticator, or Authy.
- **Mobile Push Challenge**: Direct push notification on your enrolled smartphone with 2-digit number matching.

### Enrolling an Authenticator App (TOTP):
1. Navigate to **Security & MFA**.
2. Click **Enroll Authenticator**.
3. Open your preferred authenticator app on your smartphone (Google Authenticator, Microsoft Authenticator, 1Password, or Authy).
4. Scan the on-screen QR code (or manually copy the secret key).
5. Enter the current 6-digit code displayed in your app to confirm enrollment.

---

## 5. Using Out-of-Band Mobile Push MFA

When logging into corporate applications (such as AWS, Slack, or GitHub) via Vanguard Single Sign-On, you may receive an **Out-of-Band Mobile Push Challenge**.

### How Mobile Push Works:
1. When you initiate login, your computer screen will display a **2-digit challenge number** (e.g., `42`).
2. An instant push notification is sent to your enrolled mobile companion device (`mobile-vanguard`).
3. Tap the notification on your phone:
   - Verify the requesting application name and approximate location.
   - Tap the matching 2-digit number (`42`) from the candidate options.
   - Confirm via your phone's biometric gate (**Face ID**, **Touch ID**, or **Fingerprint**).
4. Your computer screen automatically detects the approval and completes sign-in seamlessly!

---

## 6. Emergency Recovery Codes

Whenever you enroll in two-factor authentication, you must generate and safely store your **Emergency Recovery Codes**.

### Key Rules for Recovery Codes:
- **10 Single-Use Codes**: Each code (format: `VANG-XXXX-XXXX`) can only be used once.
- **Offline Storage**: Download and store them in an encrypted password manager or print and keep them in a secure location.
- **Emergency Use**: If your phone is lost, broken, or unavailable, you can redeem a recovery code to regain account access.

### Generating Recovery Codes:
1. Go to the **Security & MFA** tab.
2. Locate the **Emergency Recovery Codes** card.
3. Click **Generate Recovery Codes**.
4. Click **Download Codes (.txt)** or **Copy to Clipboard**.

---

## 7. Single Sign-On (SSO) Application Launchpad

Your **My Applications** tab is your personalized enterprise launchpad.

### Launching an Application:
1. In the sidebar, click **My Applications (SSO)**.
2. View your catalog of assigned applications (Cloud Infrastructure, Developer Tools, Collaboration suites).
3. Click on any application card (e.g., **Slack**, **Google Workspace**, **AWS IAM**, **GitHub Enterprise**).
4. Vanguard automatically issues a cryptographically signed SAML 2.0 assertion or OpenID Connect (OIDC) token, logging you in without asking for a secondary password!

---

## 8. Requesting Access to Applications

If you need access to an enterprise application that is not currently assigned to your account:
1. In the **My Applications** tab, click **Request Application**.
2. Select the application from the corporate catalog.
3. Provide a clear **business justification** (e.g., *"Required for Q3 infrastructure migration project"*).
4. Click **Submit Access Request**.
5. Your request is queued for review by your department leads and security officers. You will receive an automated notification once approved!

---

## 9. Connecting to Corporate Wi-Fi (802.1X / EAP-TLS)

Vanguard provides pre-configured **WPA2/WPA3 Enterprise 802.1X profiles** for seamless office wireless connectivity.

### Installing Your Wi-Fi Profile:
1. Navigate to **Wi-Fi & VPN Profile** in the User Portal sidebar.
2. Under **Corporate Wireless Profile (SSID: Vanguard-Secure-Corp)**, select your operating system:
   - **Apple macOS / iOS** (`.mobileconfig`)
   - **Microsoft Windows** (`.xml` network profile)
   - **Linux / Android** (`EAP-TLS` CA Certificate bundle)
3. Click **Download Wi-Fi Profile**.
4. Double-click the downloaded profile on your computer to install. Your laptop will now automatically connect to the corporate network whenever you are in the office!

---

## 10. Managing Public SSH Keys

If you are an engineer or infrastructure operator who connects to servers, databases, or Git repositories via SSH:
1. Go to the **SSH & LDAP Keys** tab.
2. Click **Add Public SSH Key**.
3. Provide a recognizable label (e.g., `MacBook Pro Workstation`).
4. Paste your public key content (`ssh-ed25519 AAAAC3...` or `ssh-rsa AAAAB3...`).
5. Click **Register Key**.
6. Vanguard binds this key to your directory profile and makes it available to internal LDAP and SSH bastions.

---

## 11. Personal Vault & 2FA Authenticator

Vanguard includes a built-in **Personal Security Vault** and **2FA Authenticator** to protect your daily credentials:
- **Personal Vault**: Store private logins, payment cards, secure notes, and personal API tokens encrypted end-to-end.
- **2FA Authenticator**: Store non-corporate TOTP accounts (e.g., personal GitHub, cloud accounts) with live 30-second rolling code generators.

---

## 12. Monitoring Personal Sign-In Activity & Security Alerts

Zero-Trust is transparent. You have complete visibility into when and where your credentials are used.

### Reviewing Sign-In History:
1. Navigate to **My Sign-in Activity**.
2. Inspect the live event stream showing:
   - Timestamp and application accessed
   - Protocol used (SAML 2.0, OIDC, RADIUS)
   - Device type and browser
   - Client IP address and geographic location
   - Authentication outcome (`Success`, `MFA Challenge`, `Blocked`)

### Configuring Email Alerts:
1. In the **Security & MFA** tab, scroll to **Login Alert Preferences**.
2. Toggle **Email Login Alerts** ON.
3. Choose your alert threshold:
   - **Alert on All Logins**
   - **Alert on New Device / Location Only** (Recommended)
4. Optional: Add a **Secondary Notification Email** (such as a personal email address) so you are notified even if corporate email is inaccessible.

---

## 13. Troubleshooting & Frequently Asked Questions

### Q: I lost my phone and cannot receive my TOTP / Push challenge. What should I do?
**A:** On the 2-step verification challenge screen, click **"Use Recovery Code"**. Enter one of your saved `VANG-XXXX-XXXX` emergency recovery codes. Once logged in, go to **Security & MFA** and pair your new phone.

### Q: My temporary invitation password has expired.
**A:** Temporary passwords are valid for 48 hours from issuance. If yours has expired, contact your internal IT administrator or security officer to resend your invitation link with a fresh temporary password.

### Q: How do I reopen this First-Timer Guide?
**A:** Click the **"📖 First-Timer Guide"** button in the top navigation header or the **First-Timer Guide** link in the sidebar navigation at any time.

---

*Vanguard Security Platform — High-Assurance Zero-Trust Identity*
