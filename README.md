# ClassNotes ~ MSc Chemistry

![Website](https://img.shields.io/website?url=https://notes.alokdasofficial.in&style=flat-square&label=Live%20Site) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square) ![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=flat-square)

![ClassNotes Preview](https://notes.alokdasofficial.in/preview.jpg)

## 📖 Overview

**ClassNotes** is a modern Single Page Application (SPA) designed to solve the chaos of sharing study materials. Unlike static file lists, it provides a rich user experience with real-time search, category filtering, and a custom PDF viewer.

It runs on a **serverless architecture**, utilizing **Firebase** for the database and **Google Apps Script(GAS)** as a backend API to handle file uploads, bug reports, and email notifications without a dedicated server.

Checkout [Live Site](https://notes.alokdasofficial.in) to know more.

## ✨ Key Features

### 🎓 For Students

- **Smart Search:** Instantly filter notes by title, professor, or subject (e.g., "Organic", "Spectroscopy").
- **Built-in PDF Viewer:** Read notes directly without downloading them first.
- **Seasonal Themes:** The UI reacts to holidays (Diwali, Christmas, Holi) and seasons (Snow in winter, Rain in monsoon).
- **Deep Linking:** Share a specific note with a direct URL (e.g., `/?pdf=123`).
- **Dark Mode:** Fully supported system-wide dark theme.

### 🛡️ For Admins

- **Maintenance Terminal:** A hidden, CLI-style interface for system diagnostics (Easter Egg 🥚).
- **Automated Moderation:** Google Apps Script filters and emails admin upon new uploads/reports.
- **Analytics:** Anonymous tracking of search gaps (what students look for but don't find).

## 🔐 Security Model

ClassNotes is not an open upload platform.

- Anyone can view and read notes
- Only verified users can upload PDFs
- Upload permissions are enforced via Firestore Security Rules
- Client-side code is never trusted for security decisions

Even if the frontend is modified, unauthorized uploads are blocked at the database level.

## 🛠️ Tech Stack

| Component    | Technology         | Description                                    |
| ------------ | ------------------ | ---------------------------------------------- |
| **Frontend** | HTML5, CSS3, JS    | Vanilla JS (ES6+), CSS Variables, Flexbox/Grid |
| **Database** | Firebase Firestore | Stores PDF metadata, comments, and analytics   |
| **Auth**     | Firebase Auth      | Anonymous authentication for session tracking  |
| **Backend**  | Google Apps Script | Handles uploads (`doPost`), emails, and config |
| **Storage**  | Google Drive       | Hosts the actual PDF files                     |

## 🚀 Installation & Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/MrAlokTech/classnotes.git
   cd classnotes
   ```

2. **Configure Firebase**

   1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
   2. Enable **Firestore Database** and **Authentication** (Anonymous Sign-in).
   3. Copy your web app configuration.
   4. Update `index.html` (bottom script section):

      ```javascript
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        // ... other keys
      };
      ```

3. **Setup Google Apps Script (Backend)**

   1. Create a new Google Sheet.
   2. Go to **Extensions > Apps Script**.
   3. Paste the backend code (handles `doPost` for uploads/reports).
   4. **Deploy** as a Web App (Access: _Anyone_).
   5. Update `script.js` and `upload.js`:

      ```javascript
      const GAS_URL =
        "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
      ```

4. **Run Locally**

   You can use any static server. For example, with Python:

   ```bash
   python -m http.server 8000
   ```

   Visit `http://localhost:8000` in your browser.

## 📂 Project Structure

```text
├── index.html          # Main application (Search, Grid, Viewer)
├── style.css           # Global styles, variables, and animations
├── script.js           # Core logic, Firebase init, UI events
├── upload/
│   ├── index.html      # Upload form interface
│   ├── style.css       # upload Standalone styling
│   └── upload.js       # File encoding & GAS submission logic
├── legal/
│   ├── privacy-policy.html
│   ├── takedown-policy.html
│   ├── terms-of-use.html
│   ├── legal.css
│   └── legal.js
└── README.md           # This file
```

## 🥚 Easter Eggs

- **The Terminal:** Try finding the hidden "Maintenance Mode" screen.
- **Prank Mode:** Don't click the logo too many times... you've been warned.

## 🧠 Open Source Scope

This repository contains the client-side source code only.

It does not include:

- PDF notes or educational content
- Firebase data or credentials
- Admin or verification access
- Private Google Apps Script source code

Educational content on the live site is not open source unless explicitly stated.

## 🔐 Security

Security is taken seriously in this project.

If you discover a security issue (for example, upload bypass, Firestore rule issues, or backend misuse),
**do not open a public GitHub issue**.

Please report security vulnerabilities responsibly.
See [SECURITY.md](./SECURITY.md) for full details.

## 🤝 Contributing

Contributions are welcome, but this project follows a **serverless Firebase architecture** with strict security boundaries.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.
Pull requests that weaken security or bypass verification rules may be rejected.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

Made with ❤️ by [Alok Das](https://alokdasofficial.in)
