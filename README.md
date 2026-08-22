# Jay Swaminarayan Member Follow Up (Call List Clone)

This is a premium, high-fidelity clone of [call-list.vercel.app](https://call-list.vercel.app) built using HTML, CSS, JavaScript, and Vite.

## Features

- **Modern Visuals:** Glassmorphism, tailored dark theme colors, elegant typography, and responsive simulator container.
- **Statistics Dashboard:** Dynamic, real-time counters representing members' response status (*Going*, *Not Going*, *Maybe*, and *No Ans*).
- **Smooth Animations:** Interactive dropdown selectors, page transitions, and status change feedback.
- **Toast Notifications:** Modern contextual alerts for login status and member changes.
- **Persistent Data:** Stores user progress in LocalStorage bucketed by the current date (`jaySwaminarayanCallList.status.YYYY-MM-DD`).
- **Share to WhatsApp:** One-click FAB to compile and format the daily follow-up report and open it directly in WhatsApp.

---

## Logins and Passwords

For quick reference and testing, use the following credentials:

| Member Name | Password (4-Digit PIN) | Role |
| :--- | :--- | :--- |
| **Admin** | `2026` | Admin |
| **Meet G Patel** | `4827` | Member |
| **Tirth S Patel** | `9136` | Member |
| **Meet N Patel** | `7054` | Member |
| **Sharad T Patel** | `2468` | Member |
| **Dipeshbhai Patel** | `6319` | Member |
| **Palak N Patel** | `5872` | Member |
| **Rushik D Patel** | `3941` | Member |
| **Urvish R Patel** | `8295` | Member |

---

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Dev Server
To start the Vite server for local development:
```bash
npm run dev
```

### 3. Build for Production
To bundle assets for hosting (e.g. Vercel, Netlify):
```bash
npm run build
```
The output files will be built into the `dist/` directory.
