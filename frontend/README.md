# MIRЯOЯ — Reflect. Discover. Grow.

![Version](https://img.shields.io/badge/version-0.0.1-gold?style=for-the-badge)
![Framework](https://img.shields.io/badge/Angular-20-C3002F?style=for-the-badge&logo=angular)
![Mobile](https://img.shields.io/badge/Ionic-8-3880FF?style=for-the-badge&logo=ionic)
![Platform](https://img.shields.io/badge/Android-Support-3DDC84?style=for-the-badge&logo=android)

**MIRЯOЯ** is a premium, modern mobile and web application built with **Ionic 8** and **Angular 20**. It features a high-fidelity user experience, sleek glassmorphism design, and robust authentication systems, all while maintaining a "buttery smooth" performance on Android and Web.

**Live Application**: [projectmirror.tech](https://projectmirror.tech)

This project is submitted as part of the **Master of Computer Applications** (MCA) program at **Vellore Institute of Technology** (VIT).

---

## Key Features

- **Premium Authentication**: One-page, borderless signup and login flows with real-time field synchronization.
- **NIST & OWASP Compliant**: Granular password complexity rules and military-grade input validation.
- **Global Support**: Complete Internationalization (i18n) system using JSON-based dictionaries.
- **Interactive Spaces**: Integrated Chat, "You" Space, and Profile management through a seamless tabbed interface.
- **Next-Gen Tech**: Built on the latest Angular 20 and Capacitor 8 stack for native-level performance.
- **Adaptive Design**: Fully responsive UI with automated Dark Mode and HSL-tailored color palettes.

---

## Tech Stack

- **Core**: [Angular 20](https://angular.io/)
- **UI Framework**: [Ionic 8](https://ionicframework.com/)
- **Native Bridge**: [Capacitor 8](https://capacitorjs.com/)
- **Logic**: TypeScript 5.9
- **Styling**: SCSS (Modular & Component-based)
- **State Management**: RxJS

---

## Project Structure

Following a production-ready, feature-based architecture:

```text
src/
├── app/
│   ├── core/         # Centralized Services & Guards
│   ├── features/     # Feature-specific modules (Auth, Tabs, etc.)
│   ├── shared/       # Reusable components & shared styles
│   └── app.routes.ts # Main application routing
├── assets/
│   ├── i18n/         # Translation JSON files
│   └── icon/         # App icons and branding
└── theme/            # Global variables and Ionic theme overrides
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Ionic CLI](https://ionicframework.com/docs/cli) (`npm install -g @ionic/cli`)
- [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)

### Installation

```bash
# Clone the repository
git clone https://github.com/prabhu-tejaa/MIRROR.git

# Install dependencies
npm install
```

### Development Environment

```bash
# Serve locally
npm run start
# OR
ionic serve
```

---

## Mobile Development (Android)

MIRЯOЯ is fully optimized for Android deployment via Capacitor.

```bash
# Build and sync to Android
npm run android:build

# Run with Live Reload (on connected device)
npm run android:live
```

**Android Builds**: Visit the [Official Releases Page](https://github.com/prabhu-tejaa/MIRROR/releases) to download the latest APKs.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run start` | Serves the project locally with hot-reload. |
| `npm run build` | Builds a production bundle. |
| `npm run lint` | Runs ESLint for code quality checks. |
| `npm run android:build` | Syncs the codebase to the Android project. |
| `npm run android:live` | Runs the app on a device with live reload enabled. |

---

## Developed By

**Prabhu Teja Pamula**
Reg No: **24EMCA1237**
Software Engineer

Under the guidance of:
**Dr. Brijendra Singh**
Associate Professor

Master of Computer Applications (MCA) Project
**Vellore Institute of Technology (VIT)**
[Portfolio](https://prabhu-tejaa.github.io/portfolio/)

---

*© 2026 MIRЯOЯ Project. Reflect. Discover. Grow.*
