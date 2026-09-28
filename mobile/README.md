# Follow Up - Android Mobile App (APK)

This subfolder contains the complete standalone Android mobile app project and pre-built APK for **Follow Up** (`com.jayswaminarayan.followup`).

> [!NOTE]
> The root web application files remain completely untouched as requested. All mobile and session-related code is strictly isolated inside this `mobile/` subfolder.

---

## 📱 APK File Location

- **Direct APK**: [`mobile/FollowUp.apk`](file:///Users/namang024/Documents/Projects/call-list/mobile/FollowUp.apk)
- **Gradle Output**: [`mobile/app/build/outputs/apk/debug/app-debug.apk`](file:///Users/namang024/Documents/Projects/call-list/mobile/app/build/outputs/apk/debug/app-debug.apk)

---

## ✨ Features & Session Management Added

1. **YouTube-Style Live Auto-Updates (Zero APK Updates Needed)**:
   - When online, the mobile app loads directly from the live production deployment (`https://call-list-six.vercel.app`).
   - Any time you push changes to your repository or Vercel (new UI, updated member lists, new dates, bug fixes), the mobile app **updates automatically and immediately** on everyone's phones without needing to download or reinstall an APK!
   - **Pull-To-Refresh**: Users can pull down from the top of the screen at any time to instantly check for and fetch the latest updates.
   - **Offline Resilience Fallback**: If internet connectivity is lost or Vercel is unreachable, the app automatically and seamlessly falls back to the local bundled version (`https://appassets.androidplatform.net/assets/www/index.html`) so the app is always functional.

2. **Persistent Session Across App Restarts & Live Updates**:
   - Integrated with Android Native `SharedPreferences` via [`SessionBridge.java`](file:///Users/namang024/Documents/Projects/call-list/mobile/app/src/main/java/com/jayswaminarayan/followup/SessionBridge.java).
   - Injected into both the live Vercel version and the offline local fallback.
   - Even when you push live updates to the app, logged-in users **stay logged in** without having to re-enter their 4-digit passcode.
   - Modern toggle switch on the login screen for *"Keep me logged in (Persistent Session)"*.

3. **Session UI & Management**:
   - **Modern iOS/Android Toggle Switch**: Clean, touch-friendly toggle switch replacing standard checkboxes.
   - **Active Session Chip**: Displays active session badge in the app header (`● [Username] ([Role])`).
   - **Session Details Modal**: Tap the session chip to view detailed session info (Session ID, Start Time, Account Role, Native Storage Sync).
   - **Clean Logout**: Tapping "Logout" or "End Session" completely purges the session from both Android `SharedPreferences` and web storage.

4. **Android Native Capabilities**:
   - **Direct Phone Dialer**: Tapping the call button directly invokes the Android Phone app dialer with `tel:<phone_number>`.
   - **Direct WhatsApp Intent**: Tapping the WhatsApp button launches the native WhatsApp app with pre-formatted follow-up reports.

---

## 🚀 How to Install on Android

### Method 1: Via ADB (USB Cable or Wi-Fi)
```bash
adb install -r mobile/FollowUp.apk
```

### Method 2: Transfer to Phone
1. Copy `FollowUp.apk` to your phone via USB, Google Drive, WhatsApp, or email.
2. Tap the APK file on your Android device to install.
3. If prompted with *"Install unknown apps"*, allow permission for your file manager or browser.

---

## 🛠️ How to Rebuild the APK

Run the included build script:
```bash
./mobile/build-apk.sh
```

Or via Gradle directly:
```bash
cd mobile
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew assembleDebug
```
