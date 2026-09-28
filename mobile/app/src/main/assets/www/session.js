// Session Manager for Follow Up Mobile App
// Integrates with Android Native SharedPreferences and Web Storage

const SessionManager = {
  SESSION_STORAGE_KEY: "jaySwaminarayanCallList.mobileSession",
  USER_STORAGE_KEY: "jaySwaminarayanCallList.sessionUser",
  MEMBERS_STORAGE_KEY: "jaySwaminarayanCallList.decryptedMembers",
  STATUS_STORAGE_PREFIX: "jaySwaminarayanCallList.status.",

  isNative: function() {
    return typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.saveSession === "function";
  },

  /**
   * Save session data to both Android SharedPreferences and localStorage
   */
  saveSession: function(user, decryptedMembers, remember = true) {
    const sessionObj = {
      sessionId: "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7),
      user: user,
      decryptedMembers: decryptedMembers,
      remember: remember,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    const sessionStr = JSON.stringify(sessionObj);

    // Save in Web storage
    try {
      if (remember) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, sessionStr);
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
        localStorage.setItem(this.MEMBERS_STORAGE_KEY, JSON.stringify(decryptedMembers));
      } else {
        sessionStorage.setItem(this.SESSION_STORAGE_KEY, sessionStr);
        sessionStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
        sessionStorage.setItem(this.MEMBERS_STORAGE_KEY, JSON.stringify(decryptedMembers));
      }
    } catch (e) {
      console.warn("Storage write failed:", e);
    }

    // Save in Android Native SharedPreferences
    if (this.isNative() && remember) {
      try {
        window.AndroidSession.saveSession(sessionStr);
      } catch (e) {
        console.warn("Android native session save failed:", e);
      }
    }

    return sessionObj;
  },

  /**
   * Retrieve active session, checking native Android storage first, then web storage
   */
  getSession: function() {
    // 1. Check Native Android SharedPreferences first
    if (this.isNative()) {
      try {
        const nativeData = window.AndroidSession.getSession();
        if (nativeData && nativeData.trim().length > 0) {
          const parsed = JSON.parse(nativeData);
          if (parsed && parsed.user) {
            // Sync back to localStorage for seamless web compatibility
            localStorage.setItem(this.SESSION_STORAGE_KEY, nativeData);
            localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(parsed.user));
            if (parsed.decryptedMembers) {
              localStorage.setItem(this.MEMBERS_STORAGE_KEY, JSON.stringify(parsed.decryptedMembers));
            }
            return parsed;
          }
        }
      } catch (e) {
        console.warn("Native session retrieval error:", e);
      }
    }

    // 2. Check localStorage
    try {
      const localData = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (e) {}

    // 3. Check sessionStorage
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (e) {}

    // 4. Fallback to basic session keys if available
    try {
      const legacyUserStr = localStorage.getItem(this.USER_STORAGE_KEY) || sessionStorage.getItem(this.USER_STORAGE_KEY);
      const legacyMembersStr = localStorage.getItem(this.MEMBERS_STORAGE_KEY) || sessionStorage.getItem(this.MEMBERS_STORAGE_KEY);
      if (legacyUserStr) {
        return {
          sessionId: "sess_legacy",
          user: JSON.parse(legacyUserStr),
          decryptedMembers: legacyMembersStr ? JSON.parse(legacyMembersStr) : [],
          remember: true,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };
      }
    } catch (e) {}

    return null;
  },

  /**
   * Touch session to update last active timestamp
   */
  touchSession: function() {
    const session = this.getSession();
    if (session) {
      session.lastActive = new Date().toISOString();
      const str = JSON.stringify(session);
      try {
        localStorage.setItem(this.SESSION_STORAGE_KEY, str);
      } catch (e) {}
      if (this.isNative() && session.remember) {
        try {
          window.AndroidSession.saveSession(str);
        } catch (e) {}
      }
    }
  },

  /**
   * Clear session from both native and web storage
   */
  clearSession: function() {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
      localStorage.removeItem(this.USER_STORAGE_KEY);
      localStorage.removeItem(this.MEMBERS_STORAGE_KEY);
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
      sessionStorage.removeItem(this.USER_STORAGE_KEY);
      sessionStorage.removeItem(this.MEMBERS_STORAGE_KEY);
    } catch (e) {}

    if (this.isNative()) {
      try {
        window.AndroidSession.clearSession();
      } catch (e) {}
    }
  },

  /**
   * Native Toast helper
   */
  showToast: function(message) {
    if (this.isNative() && typeof window.AndroidSession.showToast === "function") {
      window.AndroidSession.showToast(message);
    }
  }
};

window.SessionManager = SessionManager;
