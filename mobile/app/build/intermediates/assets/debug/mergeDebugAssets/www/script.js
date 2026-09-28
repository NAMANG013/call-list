// Self-contained SHA-256 implementation
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;

  var result = '';
  var words = [];
  var asciiLength = ascii[lengthProperty] * 8;
  
  var hash = sha256.h = sha256.h || [];
  var k = sha256.k = sha256.k || [];
  var primeCounter = k[lengthProperty];

  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0);
    
    for (i = 0; i < 64; i++) {
      var wItem = w[i];
      if (i >= 16) {
        var s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        wItem = w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      
      var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      var temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + wItem) | 0;
      var temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash = hash.slice(0, 8);
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Decryption helper: byte-level XOR and base64 parsing
function decrypt(base64Text, key) {
  try {
    const binaryString = atob(base64Text);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(key);
    
    const decryptedBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      decryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBytes);
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

// Universal Session Manager
const SessionManager = {
  SESSION_STORAGE_KEY: "jaySwaminarayanCallList.mobileSession",
  USER_STORAGE_KEY: "jaySwaminarayanCallList.sessionUser",
  MEMBERS_STORAGE_KEY: "jaySwaminarayanCallList.decryptedMembers",

  isNative: function() {
    return typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.saveSession === "function";
  },

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

    if (this.isNative() && remember) {
      try {
        window.AndroidSession.saveSession(sessionStr);
      } catch (e) {}
    }

    return sessionObj;
  },

  getSession: function() {
    // 1. Check Native Android SharedPreferences first
    if (this.isNative()) {
      try {
        const nativeData = window.AndroidSession.getSession();
        if (nativeData && nativeData.trim().length > 0) {
          const parsed = JSON.parse(nativeData);
          if (parsed && parsed.user) {
            localStorage.setItem(this.SESSION_STORAGE_KEY, nativeData);
            localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(parsed.user));
            if (parsed.decryptedMembers) {
              localStorage.setItem(this.MEMBERS_STORAGE_KEY, JSON.stringify(parsed.decryptedMembers));
            }
            return parsed;
          }
        }
      } catch (e) {}
    }

    // 2. Check localStorage
    try {
      const localData = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (localData) return JSON.parse(localData);
    } catch (e) {}

    // 3. Check sessionStorage
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      if (sessionData) return JSON.parse(sessionData);
    } catch (e) {}

    // 4. Legacy fallback
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

  showToast: function(message) {
    if (this.isNative() && typeof window.AndroidSession.showToast === "function") {
      window.AndroidSession.showToast(message);
    }
  }
};

// Global state
let members = [];
let users = [];
let encryptedMembers = {};
let activeUser = null;
let currentMembers = [];

const STATUS_LABELS = {
  "going": "Coming",
  "not-going": "Not Coming",
  "maybe": "Maybe",
  "not-received": "Call Not Received"
};

function getStatusDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStatusKey() {
  return `jaySwaminarayanCallList.status.${getStatusDateKey()}`;
}

function getStatuses() {
  const key = getStatusKey();
  const dateKey = getStatusDateKey();
  
  if (typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.getSavedStatuses === "function") {
    try {
      const nativeStr = window.AndroidSession.getSavedStatuses(dateKey);
      if (nativeStr && nativeStr.trim().length > 2) {
        return JSON.parse(nativeStr);
      }
    } catch (e) {}
  }

  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}

function saveStatus(memberName, status) {
  const statuses = getStatuses();
  if (status) {
    statuses[memberName] = status;
  } else {
    delete statuses[memberName];
  }
  const jsonStr = JSON.stringify(statuses);
  const key = getStatusKey();
  const dateKey = getStatusDateKey();

  localStorage.setItem(key, jsonStr);

  if (typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.saveStatuses === "function") {
    try {
      window.AndroidSession.saveStatuses(dateKey, jsonStr);
    } catch (e) {}
  }

  SessionManager.touchSession();
}

// UI Elements
const loginScreen = document.querySelector("#loginScreen");
const appScreen = document.querySelector("#appScreen");
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const rememberSessionCheckbox = document.querySelector("#rememberSession");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const searchBox = document.querySelector("#searchBox");
const searchInput = document.querySelector("#searchInput");
const adminFilterWrap = document.querySelector("#adminFilterWrap");
const adminFilter = document.querySelector("#adminFilter");
const listMeta = document.querySelector("#listMeta");
const memberList = document.querySelector("#memberList");
const emptyState = document.querySelector("#emptyState");
const template = document.querySelector("#memberTemplate");
const whatsappFab = document.querySelector("#whatsappFab");

// Session UI Elements
const sessionChip = document.querySelector("#sessionChip");
const sessionChipUser = document.querySelector("#sessionChipUser");
const sessionModal = document.querySelector("#sessionModal");
const sessionCloseBtn = document.querySelector("#sessionCloseBtn");
const sessionLogoutBtn = document.querySelector("#sessionLogoutBtn");
const sessionInfoUser = document.querySelector("#sessionInfoUser");
const sessionInfoRole = document.querySelector("#sessionInfoRole");
const sessionInfoId = document.querySelector("#sessionInfoId");
const sessionInfoTime = document.querySelector("#sessionInfoTime");
const sessionInfoStorage = document.querySelector("#sessionInfoStorage");

// Direct Cellular/Device Dialer Call
function makePhoneCall(member) {
  if (!member.phone) {
    alert("No phone number available for this member.");
    return;
  }

  let cleanPhone = member.phone.replace(/[\s\-\(\)]/g, '');
  if (/^[6-9]\d{9}$/.test(cleanPhone)) {
    cleanPhone = '+91' + cleanPhone;
  } else if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+91' + cleanPhone;
  }

  if (typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.dialPhone === "function") {
    window.AndroidSession.dialPhone(cleanPhone);
  } else {
    window.location.href = `tel:${cleanPhone}`;
  }
}

function renderAdminFilter() {
  const regularUsers = users.filter((user) => user.role !== "admin");
  adminFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All members";
  adminFilter.append(allOption);

  for (const user of regularUsers) {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.username;
    adminFilter.append(option);
  }
}

function updateSessionUI(session) {
  if (!session || !session.user) return;
  const username = session.user.username;
  const role = session.user.role === "admin" ? "Admin" : "Member";

  if (sessionChipUser) {
    sessionChipUser.textContent = `${username} (${role})`;
  }
  if (sessionInfoUser) sessionInfoUser.textContent = username;
  if (sessionInfoRole) sessionInfoRole.textContent = role;
  if (sessionInfoId) sessionInfoId.textContent = session.sessionId || "sess_active";
  if (sessionInfoTime) {
    const d = session.createdAt ? new Date(session.createdAt) : new Date();
    sessionInfoTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + d.toLocaleDateString();
  }
  if (sessionInfoStorage) {
    sessionInfoStorage.textContent = SessionManager.isNative()
      ? "Android SharedPreferences (Persistent)"
      : "Local Storage (Persistent)";
  }
}

function setAuthenticated(isAuthenticated) {
  const isAdmin = Boolean(activeUser?.role === "admin");

  loginScreen.classList.toggle("hidden", isAuthenticated);
  appScreen.classList.toggle("hidden", !isAuthenticated);
  adminFilterWrap.classList.toggle("hidden", !isAuthenticated || !isAdmin);
  searchBox.classList.toggle("hidden", !isAuthenticated || !isAdmin);
  appScreen.classList.toggle("admin-view", isAdmin);

  if (isAuthenticated) {
    renderMembers();
    if (isAdmin) searchInput.focus();
  } else {
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function renderMembers() {
  const query = searchInput.value.trim().toLowerCase();
  const isAdmin = Boolean(activeUser?.role === "admin");
  const selectedUser = adminFilter.value;
  const currentStatuses = getStatuses();
  
  const visibleMembers = currentMembers.filter((member) => {
    const ownerMatch = isAdmin
      ? selectedUser === "all" || member.assignedTo === selectedUser
      : true;
    const text = `${member.name} ${member.phone} ${member.assignedTo}`.toLowerCase();
    return ownerMatch && text.includes(query);
  });

  memberList.replaceChildren();
  emptyState.classList.toggle("visible", visibleMembers.length === 0);
  listMeta.textContent = isAdmin
    ? `${visibleMembers.length} members shown`
    : `${visibleMembers.length} assigned members`;

  for (const member of visibleMembers) {
    const item = template.content.firstElementChild.cloneNode(true);
    const name = item.querySelector(".member-name");
    const phone = item.querySelector(".member-phone");
    const owner = item.querySelector(".member-owner");
    const callButton = item.querySelector(".call-button");

    name.textContent = member.name;
    if (member.birthDate) {
      const today = new Date();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const parts = member.birthDate.split('-');
      if (parts.length === 3 && parts[1] === todayMonth && parts[2] === todayDay) {
        name.textContent += ' 🎂';
      }
    }
    phone.textContent = member.phone;
    owner.textContent = member.assignedTo;

    if (member.phone) {
      callButton.href = `tel:${member.phone}`;
    } else {
      callButton.href = "#";
    }

    callButton.addEventListener("click", (e) => {
      e.preventDefault();
      makePhoneCall(member);
    });
    callButton.setAttribute("aria-label", `Call ${member.name}`);

    const statusIndicator = item.querySelector(".member-status-indicator");
    const menuButton = item.querySelector(".menu-button");
    const dropdown = item.querySelector(".status-dropdown");
    const options = item.querySelectorAll(".status-option");
    const savedStatus = currentStatuses[member.name];

    function applyStatusUI(status) {
      if (status && STATUS_LABELS[status]) {
        statusIndicator.textContent = STATUS_LABELS[status];
        statusIndicator.className = `member-status-indicator status-${status}`;
        menuButton.classList.add("has-status");
      } else {
        statusIndicator.textContent = "";
        statusIndicator.className = "member-status-indicator hidden";
        menuButton.classList.remove("has-status");
      }
    }

    applyStatusUI(savedStatus);

    menuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".status-dropdown.show").forEach((el) => {
        if (el !== dropdown) el.classList.remove("show");
      });
      dropdown.classList.toggle("show");
    });

    options.forEach((option) => {
      if (option.dataset.status === savedStatus) {
        option.classList.add("selected");
      } else {
        option.classList.remove("selected");
      }

      option.addEventListener("click", (e) => {
        e.stopPropagation();
        
        if (option.classList.contains("selected")) {
          option.classList.remove("selected");
          saveStatus(member.name, null);
          applyStatusUI(null);
        } else {
          options.forEach(opt => opt.classList.remove("selected"));
          option.classList.add("selected");
          saveStatus(member.name, option.dataset.status);
          applyStatusUI(option.dataset.status);
        }

        dropdown.classList.remove("show");
      });
    });

    memberList.append(item);
  }
}

document.addEventListener("click", () => {
  document.querySelectorAll(".status-dropdown.show").forEach((el) => {
    el.classList.remove("show");
  });
});

// Login Handler with Session Creation
function handleLogin(pin) {
  if (!pin || pin.length < 4) {
    loginError.textContent = "Please enter a 4-digit passcode.";
    return;
  }

  let matchedUser = null;
  let decryptedMembers = [];
  const isDynamic = Boolean(localStorage.getItem("jaySwaminarayanCallList.dynamicMembers"));

  for (const user of users) {
    const derivKey = `${user.username}:${pin}`;
    const inputHash = sha256(derivKey);
    if (user.keyHash === inputHash) {
      if (isDynamic) {
        const savedMembers = JSON.parse(localStorage.getItem("jaySwaminarayanCallList.dynamicMembers"));
        decryptedMembers = user.role === "admin"
          ? savedMembers
          : savedMembers.filter((m) => m.assignedTo === user.username);
        matchedUser = user;
        break;
      } else {
        const ciphertext = encryptedMembers[inputHash];
        if (ciphertext) {
          const decryptedStr = decrypt(ciphertext, pin);
          if (decryptedStr) {
            try {
              decryptedMembers = JSON.parse(decryptedStr);
              matchedUser = user;
              break;
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }
  }

  if (!matchedUser) {
    loginError.textContent = "Invalid passcode.";
    passwordInput.select();
    return;
  }

  const rememberMe = rememberSessionCheckbox ? rememberSessionCheckbox.checked : true;
  const newSession = SessionManager.saveSession(matchedUser, decryptedMembers, rememberMe);

  activeUser = matchedUser;
  currentMembers = decryptedMembers;

  loginError.textContent = "";
  updateSessionUI(newSession);
  setAuthenticated(true);

  SessionManager.showToast(`Logged in as ${matchedUser.username}`);
}

// Session Modal controls
if (sessionChip) {
  sessionChip.addEventListener("click", () => {
    const session = SessionManager.getSession();
    if (session) updateSessionUI(session);
    sessionModal.classList.add("active");
  });
}

if (sessionCloseBtn) {
  sessionCloseBtn.addEventListener("click", () => {
    sessionModal.classList.remove("active");
  });
}

if (sessionModal) {
  sessionModal.addEventListener("click", (e) => {
    if (e.target === sessionModal) {
      sessionModal.classList.remove("active");
    }
  });
}

function handleLogout() {
  if (confirm("Are you sure you want to end your session and log out?")) {
    SessionManager.clearSession();
    activeUser = null;
    currentMembers = [];
    searchInput.value = "";
    if (sessionModal) sessionModal.classList.remove("active");
    setAuthenticated(false);
    SessionManager.showToast("Logged out successfully");
  }
}

logoutButton.addEventListener("click", handleLogout);
if (sessionLogoutBtn) sessionLogoutBtn.addEventListener("click", handleLogout);

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleLogin(passwordInput.value.trim());
});

passwordInput.addEventListener("input", () => {
  loginError.textContent = "";
  if (passwordInput.value.trim().length === 4) {
    handleLogin(passwordInput.value.trim());
  }
});

searchInput.addEventListener("input", renderMembers);
adminFilter.addEventListener("change", renderMembers);

// WhatsApp FAB
whatsappFab.addEventListener("click", () => {
  const currentStatuses = getStatuses();
  if (Object.keys(currentStatuses).length === 0) {
    alert("No members have been updated today.");
    return;
  }

  const grouped = {
    "going": [],
    "not-going": [],
    "maybe": [],
    "not-received": []
  };

  const isAdmin = Boolean(activeUser?.role === "admin");
  const selectedUser = adminFilter.value;

  const visibleMembers = currentMembers.filter((member) => {
    return isAdmin
      ? (selectedUser === "all" || member.assignedTo === selectedUser)
      : true;
  });

  let hasData = false;
  visibleMembers.forEach(member => {
    const status = currentStatuses[member.name];
    if (status && grouped[status]) {
      grouped[status].push(member.name);
      hasData = true;
    }
  });

  if (!hasData) {
    alert("No updated members found in the current view.");
    return;
  }

  const date = new Date();
  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  let text = `*Follow-Up Report* (${dateStr})\n`;
  if (!isAdmin || selectedUser !== "all") {
    text += `*By:* ${isAdmin ? selectedUser : activeUser?.username}\n`;
  }

  visibleMembers.forEach(member => {
    const status = currentStatuses[member.name];
    if (status && STATUS_LABELS[status]) {
      text += `${member.name} - *${STATUS_LABELS[status]}*\n`;
    }
  });

  const messageText = text.trim();

  if (typeof window.AndroidSession !== "undefined" && typeof window.AndroidSession.openWhatsApp === "function") {
    window.AndroidSession.openWhatsApp(messageText);
  } else {
    const wpUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(wpUrl, '_blank');
  }
});

// Pull-to-refresh for instant live updates (YouTube-style)
let touchStartY = 0;
let isPulling = false;

window.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    touchStartY = e.touches[0].clientY;
    isPulling = true;
  } else {
    isPulling = false;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isPulling) return;
  const currentY = e.touches[0].clientY;
  const diff = currentY - touchStartY;
  if (diff > 120 && window.scrollY === 0) {
    isPulling = false;
    SessionManager.showToast("Checking for updates...");
    window.location.reload(true);
  }
}, { passive: true });

// App Initialization
async function initApp() {
  try {
    const savedMembers = localStorage.getItem("jaySwaminarayanCallList.dynamicMembers");
    const savedUsers = localStorage.getItem("jaySwaminarayanCallList.dynamicUsers");
    
    if (savedMembers && savedUsers) {
      members = JSON.parse(savedMembers);
      users = JSON.parse(savedUsers);
    } else {
      const res = await fetch("data.json");
      const data = await res.json();
      users = data.users;
      encryptedMembers = data.encryptedMembers;
    }

    renderAdminFilter();

    // Check for existing session (Native Android SharedPreferences or Web Storage)
    const existingSession = SessionManager.getSession();
    if (existingSession && existingSession.user && existingSession.decryptedMembers) {
      activeUser = existingSession.user;
      currentMembers = existingSession.decryptedMembers;
      updateSessionUI(existingSession);
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }

    const splashScreen = document.querySelector("#splashScreen");
    setTimeout(() => {
      if (splashScreen) {
        splashScreen.classList.add("fade-out");
      }
    }, 1500);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

initApp();
