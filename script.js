import { Device } from '@twilio/voice-sdk';

// self-contained SHA-256 implementation
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

// Global dynamic variables
let members = []; // Full list of members if in dynamic mode
let users = [];   // List of users { keyHash, role, username }
let encryptedMembers = {}; // Encrypted database from data.json { keyHash: ciphertext }

let activeUser = null;
let currentMembers = []; // Decrypted members accessible to the logged in user

const STATUS_LABELS = {
  "going": "Coming",
  "not-going": "Not Coming",
  "maybe": "Maybe",
  "not-received": "Call Not Received"
};

function getStatusKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `jaySwaminarayanCallList.status.${year}-${month}-${day}`;
}

function getStatuses() {
  try {
    return JSON.parse(localStorage.getItem(getStatusKey())) || {};
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
  localStorage.setItem(getStatusKey(), JSON.stringify(statuses));
}

const loginScreen = document.querySelector("#loginScreen");
const appScreen = document.querySelector("#appScreen");
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
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

const callOverlay = document.querySelector("#callOverlay");
const callTargetName = document.querySelector("#callTargetName");
const callTargetPhone = document.querySelector("#callTargetPhone");
const callStatusBadge = document.querySelector("#callStatusBadge");
const callTimer = document.querySelector("#callTimer");
const muteBtn = document.querySelector("#muteBtn");
const muteLabel = document.querySelector("#muteLabel");
const hangupBtn = document.querySelector("#hangupBtn");

let twilioDevice = null;
let activeCall = null;
let callDurationSeconds = 0;
let callTimerInterval = null;
let isMuted = false;
let isTwilioAvailable = null;

async function getTwilioToken() {
  try {
    const res = await fetch('/api/token');
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.token ? data : null;
  } catch (err) {
    console.warn("Twilio token fetch failed:", err.message);
    return null;
  }
}

async function initTwilioDevice() {
  if (twilioDevice) return twilioDevice;

  const data = await getTwilioToken();
  if (!data || !data.token) {
    isTwilioAvailable = false;
    return null;
  }

  try {
    twilioDevice = new Device(data.token, {
      codecPreferences: ['opus', 'pcmu'],
      enableRingingState: true
    });

    twilioDevice.on('registered', () => {
      isTwilioAvailable = true;
      console.log('Twilio Voice Client Registered');
    });

    twilioDevice.on('error', (err) => {
      console.error('Twilio Voice Error:', err);
    });

    await twilioDevice.register();
    isTwilioAvailable = true;
    return twilioDevice;
  } catch (e) {
    console.warn('Could not register Twilio Device:', e);
    isTwilioAvailable = false;
    return null;
  }
}

function formatCallTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startCallTimer() {
  callDurationSeconds = 0;
  callTimer.textContent = '00:00';
  if (callTimerInterval) clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callDurationSeconds++;
    callTimer.textContent = formatCallTime(callDurationSeconds);
  }, 1000);
}

function stopCallTimer() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
}

function openCallModal(member, formattedPhone) {
  callTargetName.textContent = member.name;
  callTargetPhone.textContent = formattedPhone;
  callStatusBadge.textContent = "Connecting...";
  callStatusBadge.className = "call-status-badge";
  callTimer.textContent = "00:00";
  isMuted = false;
  muteBtn.classList.remove("muted");
  if (muteLabel) muteLabel.textContent = "Mute";
  callOverlay.classList.remove("hidden");
}

function updateCallStatus(statusText, type = "") {
  callStatusBadge.textContent = statusText;
  callStatusBadge.className = `call-status-badge ${type}`;
}

function closeCallModal() {
  stopCallTimer();
  callOverlay.classList.add("hidden");
  activeCall = null;
}

hangupBtn.addEventListener("click", () => {
  if (activeCall) {
    activeCall.disconnect();
  }
  closeCallModal();
});

muteBtn.addEventListener("click", () => {
  if (activeCall) {
    isMuted = !isMuted;
    activeCall.mute(isMuted);
    muteBtn.classList.toggle("muted", isMuted);
    if (muteLabel) muteLabel.textContent = isMuted ? "Unmute" : "Mute";
  }
});

async function startTwilioCall(member) {
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

  const device = await initTwilioDevice();
  if (!device) {
    const useNative = confirm(
      `Twilio Voice backend credentials are not configured in Vercel yet.\n\nWould you like to dial ${member.name} (${member.phone}) using your phone app?`
    );
    if (useNative) {
      window.location.href = `tel:${member.phone}`;
    }
    return;
  }

  openCallModal(member, cleanPhone);

  try {
    const call = await device.connect({
      params: {
        To: cleanPhone
      }
    });

    activeCall = call;

    call.on('ringing', () => {
      updateCallStatus('Ringing...');
    });

    call.on('accept', () => {
      updateCallStatus('In Call', 'connected');
      startCallTimer();
    });

    call.on('disconnect', () => {
      updateCallStatus('Call Ended', 'ended');
      stopCallTimer();
      setTimeout(closeCallModal, 1500);
    });

    call.on('cancel', () => {
      updateCallStatus('Canceled', 'ended');
      stopCallTimer();
      setTimeout(closeCallModal, 1500);
    });

    call.on('error', (err) => {
      console.error('Twilio Call Error:', err);
      updateCallStatus('Call Error: ' + (err.message || 'Failed'), 'ended');
      stopCallTimer();
      setTimeout(closeCallModal, 2500);
    });
  } catch (err) {
    console.error('Call initiation error:', err);
    updateCallStatus('Failed to start call', 'ended');
    setTimeout(closeCallModal, 2500);
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

function currentUser() {
  if (activeUser) return activeUser;
  try {
    const sessionUserStr = localStorage.getItem("jaySwaminarayanCallList.sessionUser") || sessionStorage.getItem("jaySwaminarayanCallList.sessionUser");
    if (sessionUserStr) {
      activeUser = JSON.parse(sessionUserStr);
      return activeUser;
    }
  } catch (e) {}
  return null;
}

function setAuthenticated(isAuthenticated) {
  const user = currentUser();
  const isAdmin = Boolean(user?.role === "admin");

  loginScreen.classList.toggle("hidden", isAuthenticated);
  appScreen.classList.toggle("hidden", !isAuthenticated);
  adminFilterWrap.classList.toggle("hidden", !isAuthenticated || !isAdmin);
  searchBox.classList.toggle("hidden", !isAuthenticated || !isAdmin);
  appScreen.classList.toggle("admin-view", isAdmin);

  if (isAuthenticated) {
    try {
      const saved = localStorage.getItem("jaySwaminarayanCallList.decryptedMembers") || sessionStorage.getItem("jaySwaminarayanCallList.decryptedMembers");
      if (saved) {
        currentMembers = JSON.parse(saved);
      }
    } catch (e) {}
    
    renderMembers();
    if (isAdmin) searchInput.focus();
  } else {
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function renderMembers() {
  const query = searchInput.value.trim().toLowerCase();
  const user = currentUser();
  const isAdmin = Boolean(user?.role === "admin");
  const selectedUser = adminFilter.value;
  const currentStatuses = getStatuses();
  
  const visibleMembers = currentMembers.filter((member) => {
    const ownerMatch = isAdmin
      ? selectedUser === "all" || member.assignedTo === selectedUser
      : true; // Non-admin already has pre-filtered currentMembers
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
      callButton.href = "javascript:void(0)";
    } else {
      callButton.href = "#";
    }
    callButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (!member.phone) {
        alert("No phone number found");
        return;
      }
      startTwilioCall(member);
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

  localStorage.setItem("jaySwaminarayanCallList.sessionUser", JSON.stringify(matchedUser));
  localStorage.setItem("jaySwaminarayanCallList.decryptedMembers", JSON.stringify(decryptedMembers));

  activeUser = matchedUser;
  currentMembers = decryptedMembers;

  loginError.textContent = "";
  setAuthenticated(true);
}

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

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("jaySwaminarayanCallList.sessionUser");
  localStorage.removeItem("jaySwaminarayanCallList.decryptedMembers");
  sessionStorage.removeItem("jaySwaminarayanCallList.sessionUser");
  sessionStorage.removeItem("jaySwaminarayanCallList.decryptedMembers");
  activeUser = null;
  currentMembers = [];
  searchInput.value = "";
  setAuthenticated(false);
});

searchInput.addEventListener("input", renderMembers);
adminFilter.addEventListener("change", renderMembers);

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
  


  const user = currentUser();
  const isAdmin = Boolean(user?.role === "admin");
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
    text += `*By:* ${isAdmin ? selectedUser : user?.username}\n`;
  }

  visibleMembers.forEach(member => {
    const status = currentStatuses[member.name];
    if (status && STATUS_LABELS[status]) {
      text += `${member.name} - *${STATUS_LABELS[status]}*\n`;
    }
  });

  const wpUrl = `https://wa.me/?text=${encodeURIComponent(text.trim())}`;
  window.open(wpUrl, '_blank');
});

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
    
    const user = currentUser();
    setAuthenticated(Boolean(user));

    const splashScreen = document.querySelector("#splashScreen");
    setTimeout(() => {
      if (splashScreen) {
        splashScreen.classList.add("fade-out");
      }
    }, 3000);
  } catch (error) {
    console.error("Error loading dynamic data:", error);
  }
}

initApp();
