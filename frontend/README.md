# MIRЯOЯ — Reflect. Discover. Grow.

![Version](https://img.shields.io/badge/version-0.0.1-gold?style=for-the-badge)
![Framework](https://img.shields.io/badge/Angular-20-C3002F?style=for-the-badge&logo=angular)
![Mobile](https://img.shields.io/badge/Ionic-8-3880FF?style=for-the-badge&logo=ionic)
![Platform](https://img.shields.io/badge/Android-Support-3DDC84?style=for-the-badge&logo=android)

**MIRЯOЯ** is an AI Powered Memory and Emotional Analytics System. Designed strictly as a single user personal reflection tool, it solves the problem of transient insights by helping users capture, reflect on and identify patterns in their daily experiences and emotional journeys. 

The frontend is built with Ionic and Angular, delivering a unified, reactive UI across Web and Android platforms.

**Live Application**: [projectmirror.tech](https://projectmirror.tech)

---

## Key Features

* **Cross-Platform Interface**: Features a unified application architecture that provides a consistent, mobile first experience across both Web and Android platforms.
* **Multimodal Data Capture**: Built with a lowfriction interface that supports both voice-to-text and direct text input, allowing users to log reflections in their preferred format.
* **Secure Authentication System**: Implements robust JWT-based authentication with persistent sessions, balancing security and data privacy with instant user access.
* **Core UI Architecture**: The presentation layer is categorized into interactive modules including Login, Chat, Visualizer, and Profile management.
* **Interactive Growth Dashboard**: Includes dedicated UI components to display AI-driven pattern synthesis and historical reflections to the user.
* **Adaptive & Global Design**: Fully responsive UI featuring automated Dark Mode, HSL-tailored color palettes, and Internationalization (i18n) support using JSON-based dictionaries.

---

## Tech Stack

* **Frontend Framework**: Ionic combined with Angular for a unified, reactive user interface.
* **Native Bridge**: Capacitor 8 for native Android deployment and optimization.
* **Language & Logic**: TypeScript 5.9 with RxJS for state management.
* **Styling**: Modular, component-based SCSS.
* **Communication**: Handles REST requests and JWT token transmission to the Spring Boot microservices backend.

---

## Project Structure

Following a feature-based architecture aligned with the presentation layer design:

```text
src/
├── app/
│   ├── core/         # Centralized Services & Auth Guards
│   ├── features/     # Feature modules (Login, Chat, Visualizer, Profile)
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

* Node.js (LTS recommended)
* Ionic CLI (`npm install -g @ionic/cli`)
* Angular CLI (`npm install -g @angular/cli`)

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

# OR use the Ionic CLI
ionic serve
```

---

## Mobile Development (Android)

MIRЯOЯ is optimized for Android deployment as part of its cross-platform scope.

```bash
# Build and sync to the Android project
npm run android:build

# Run with Live Reload (on a connected device)
npm run android:live
```

**Android Builds**: Visit the [Official Releases Page](https://github.com/prabhu-tejaa/MIRROR/releases) to download the latest APKs.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run start` | Serves the project locally with hot-reload. |
| `npm run build` | Builds an optimized production bundle. |
| `npm run lint` | Runs ESLint for code quality checks. |
| `npm run android:build` | Syncs the compiled codebase to the native Android project. |
| `npm run android:live` | Runs the app on a physical device with live reload enabled. |

---

## Developed By

**Prabhu Teja Pamula**
Registration Number: 24EMCA1237
[Portfolio](https://prabhu-tejaa.github.io/portfolio/)

**Project Guide:**
Dr. Brijendra Singh
Associate Professor

Submitted as part of the Master of Computer Applications project at **Vellore Institute of Technology (VIT)**.

---
*© 2026 MIRЯOЯ Project. Reflect. Discover. Grow.*