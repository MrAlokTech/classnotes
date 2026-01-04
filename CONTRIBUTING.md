# Contributing to ClassNotes

Thank you for your interest in contributing to ClassNotes.

This project uses a **serverless Firebase architecture**, and contributions should respect the design and security boundaries described below.

---

## How to Contribute

1. Fork the repository
2. Create a new branch  
   `git checkout -b feature/YourFeature`
3. Make your changes
4. Commit with a clear message  
   `git commit -m "Add YourFeature"`
5. Push to your fork  
   `git push origin feature/YourFeature`
6. Open a Pull Request

---

## Contribution Guidelines (Important)

### 1. Client-Side Code Only

This repository contains **client-side code only**.

Do NOT:

- Add Firebase Admin SDK
- Add private keys or secrets
- Add backend credentials
- Add Google Apps Script private code

---

### 2. Firebase Configuration

- `firebaseConfig` is **public by design**
- Do NOT move it to `.env` files
- Do NOT attempt to “hide” Firebase config
- Do NOT add secrets to frontend code

Security is enforced via **Firestore Security Rules**, not client-side obfuscation.

---

### 3. Firestore Rules

Firestore Security Rules are **critical**.

- Do NOT weaken access rules
- Do NOT allow unauthenticated writes
- Do NOT bypass verification checks
- Any rule-related suggestion must be clearly justified

If proposing rule changes, explain:

- What problem it solves
- Why it does not reduce security

---

### 4. Authentication & Upload Logic

- Anonymous authentication is intentional
- Upload access is restricted to verified users
- UI checks are not security boundaries

Do NOT:

- Remove verification checks
- Convert upload logic to client-only validation
- Assume frontend logic equals authorization

---

### 5. Google Apps Script Integration

- GAS endpoints are treated as backend APIs
- Client calls must remain validated server-side
- Do NOT hardcode new endpoints without documentation

---

### 6. Code Quality

- Keep code readable and commented
- Follow existing project structure
- Avoid unnecessary dependencies
- Do not introduce frameworks unless discussed

---

## What Contributions Are Welcome

- UI improvements
- Accessibility enhancements
- Performance optimizations
- Bug fixes
- Documentation improvements
- Code cleanup and refactoring
- Better error handling and UX polish

---

## What May Be Rejected

- Changes that weaken security
- Breaking architectural boundaries
- Adding unnecessary complexity
- Upload or auth logic modifications without justification

---

## Code of Conduct

Be respectful and constructive.

This project is built for students and education.  
Healthy discussion is welcome. Disruptive behavior is not.

---

Thank you for helping improve ClassNotes.
