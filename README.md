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

## Logins and Passcodes

| Member Name | Role | Passcode |
| :--- | :--- | :--- |
| **Naman Gajjar** | Admin | `2026` |
| **Sharad Timirbhai Patel** | Member | `2468` |
| **Rushik Dineshbhai Patel** | Member | `3941` |
| **Urvish patel** | Member | `8295` |
| **Dipeshbhai Patel** | Member | `6319` |
| **Palak Narendrbhai Patel** | Member | `5872` |
| **Meet N Patel** | Member | `7054` |
| **Keyur Patel** | Member | `1988` |
| **Sneh Patel** | Member | `2005` |
| **Vivek Prajapati** | Member | `2007` |
| **Aaryan s Patel** | Member | `7391` |
| **Sarthak Patel** | Member | `5264` |

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
