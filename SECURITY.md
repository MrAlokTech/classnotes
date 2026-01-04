# Security Policy

## Supported Versions

This project is actively maintained.  
Security fixes apply to the latest version deployed on the live site.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **do NOT open a public GitHub issue**.

Please report it responsibly by emailing:

📧 **care@alokdasofficial.in**

Include as much detail as possible:

- Steps to reproduce the issue
- Affected feature or endpoint
- Screenshots or logs (if applicable)
- Potential impact

You will receive an acknowledgment within a reasonable time.

---

## What Counts as a Security Issue

Please report issues related to:

- Firestore Security Rules bypass
- Unauthorized PDF uploads
- Upload or verification abuse
- Google Apps Script endpoint misuse
- Privilege escalation (admin / verified users)
- Data exposure beyond intended access
- Denial of service or abuse vectors

---

## What Does NOT Count as a Security Issue

The following are **intentional and not vulnerabilities**:

- Public `firebaseConfig` in client-side code
- Client-side JavaScript logic being readable
- Anonymous Firebase Authentication usage
- Public read access for approved collections
- UI-only restrictions (security is enforced server-side)

Security for this project is enforced via **Firestore Security Rules and backend validation**, not client-side secrecy.

---

## Responsible Disclosure

Please allow reasonable time to investigate and resolve reported issues before public disclosure.

We appreciate responsible security research and good-faith reporting.
