/**
 * MemoryBand (COsense) - Rescue and Safety Platform
 * Frontend SPA matching Apple Health / Medical ID design philosophy.
 * Consumes existing backend API (GET /events, POST /fall) without touching backend.
 */

// --- Default State & Storage ---
const STORAGE_KEY = "memoryband_app_state";

const DEFAULT_PATIENT = {
  patientId: "MB001",
  deviceId: "CS001",
  name: "John Mathew",
  age: 72,
  photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  bloodGroup: "O+",
  condition: "Alzheimer's Disease",
  conditionSubtitle: "Lives with memory loss",
  dementiaStage: "Early / Moderate",
  caregiverPhone: "+91 98765 43210",
  spokenLanguages: "English, Malayalam",
  communicationNotes: "Speaks softly. Gets anxious around sudden loud noises. Often forgets current date or home address.",
  homeAddress: "Near Institute of Palliative Medicine, Medical College Road, Kozhikode",
  homeCoordinates: { lat: 11.2773997, lng: 75.8443547 },
  safeZoneRadiusMeters: 150,
  medical: {
    verificationPin: "1234",
    allergies: ["Penicillin", "Dust"],
    medications: ["Donepezil 5mg (once daily morning)", "Memantine 10mg (night)"],
    conditions: ["Alzheimer's Disease", "Mild Hypertension"],
    emergencyNotes: "Keep calm, stay with him in a quiet space, contact family immediately.",
  },
  emergencyContacts: [
    { name: "Mary Mathew", relation: "Daughter", phone: "+91 98765 43210", isPrimary: true },
    { name: "David Mathew", relation: "Son", phone: "+91 98765 43211", isPrimary: false }
  ]
};

// Safe Zone calculation & App State
let appState = {
  activeTab: "dashboard", // 'dashboard' | 'live' | 'events' | 'profile' | 'qr' | 'scanner' | 'rescue'
  rescueStep: 1, // 1: scan-tag -> 2: phone -> 3: otp -> 4: location -> 5: hub -> 6: medical
  medicalVerified: false,
  helperPhone: "",
  helperOtp: "4321",
  helperOtpVerified: false,
  rescuerLocation: null,
  rescuerLocationStatus: "idle", // 'idle' | 'requesting' | 'granted' | 'denied'
  scannedDeviceId: "CS001",
  patient: loadPatientData(),
  deviceTelemetry: {
    battery: 84,
    wifiConnected: true,
    lastSeen: "Just now",
    distanceKm: 0.1,
    state: "SAFE", // 'SAFE' | 'CAUTION' | 'CRITICAL'
    stateDescription: "Inside Home Zone"
  },
  backendEvents: [],
  lastEventId: null,
  mapInstance: null,
  helperMapInstance: null
};

function loadPatientData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + "_patient");
    if (saved) {
      const data = JSON.parse(saved);
      // Auto-migrate if old Bangalore coordinates exist in localStorage
      if (!data.homeCoordinates || Math.abs(data.homeCoordinates.lat - 12.9716) < 0.05) {
        data.homeCoordinates = { lat: 11.2773997, lng: 75.8443547 };
        data.homeAddress = "Near Institute of Palliative Medicine, Medical College Road, Kozhikode";
        savePatientData(data);
      }
      return data;
    }
  } catch (e) {
    console.error("Error loading patient data", e);
  }
  return DEFAULT_PATIENT;
}

function savePatientData(patient) {
  try {
    localStorage.setItem(STORAGE_KEY + "_patient", JSON.stringify(patient));
  } catch (e) {
    console.error("Error saving patient data", e);
  }
}

// --- Icons (Clean inline SVGs for Medical ID aesthetic) ---
const Icons = {
  shield: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  activity: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
  bell: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`,
  mapPin: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  qrCode: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>`,
  camera: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  user: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  phone: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>`,
  wifi: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>`,
  battery: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h12a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2zm14 3h1a1 1 0 011 1v2a1 1 0 01-1 1h-1v-4z"/></svg>`,
  clock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  alertTriangle: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  alertCircle: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  checkCircle: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  heart: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
  lock: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
  externalLink: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`,
  arrowLeft: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>`,
  print: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>`,
  hospital: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
  siren: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.75L13.75 4.5a2 2 0 00-3.5 0L3.32 16.25A2 2 0 005.07 19z"/></svg>`
};

// --- Tone Audio Synthesizer (Silenced to avoid random beeps) ---
function playEmergencyTone() {
  // Silent by default so background telemetry never beeps randomly
  return;
}

// Scanner chirp disabled to ensure quiet, peaceful rescue experience
function playScanChirp() {
  return;
}

// --- Backend Telemetry Integration ---
let initialFetchDone = false;

async function fetchBackendEvents() {
  try {
    const res = await fetch("/events");
    if (!res.ok) return;
    const events = await res.json();
    
    if (Array.isArray(events)) {
      if (events.length > 0) {
        const latest = events[0];
        if (initialFetchDone) {
          if (latest.id !== appState.lastEventId) {
            appState.lastEventId = latest.id;
            if (latest.type === "fall" || latest.event === "fall") {
              appState.deviceTelemetry.state = "CRITICAL";
              appState.deviceTelemetry.stateDescription = "Fall detected by wristband";
              appState.deviceTelemetry.lastSeen = "Just now";
              if (latest.battery) {
                appState.deviceTelemetry.battery = latest.battery;
              }
            }
          }
        } else {
          appState.lastEventId = latest.id;
          initialFetchDone = true;
        }
      }
      appState.backendEvents = events;

      // DO NOT wipe the DOM if user is actively in Rescue or Scanner views!
      if (appState.activeTab !== "rescue" && appState.activeTab !== "scanner") {
        renderApp();
      }
    }
  } catch (err) {
    console.warn("Backend poll skipped:", err.message);
  }
}

setInterval(fetchBackendEvents, 2500);

// --- Camera Scanner State & Controls ---
let html5QrScannerInstance = null;
let isScanningLocked = false;

function forceStopCameraHardware() {
  isScanningLocked = true;
  if (html5QrScannerInstance) {
    const scanner = html5QrScannerInstance;
    html5QrScannerInstance = null;
    try {
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          try { scanner.clear(); } catch(e) {}
        }).catch(() => {});
      } else {
        try { scanner.clear(); } catch(e) {}
      }
    } catch (e) {}
  }

  // Force stop all video element tracks across DOM
  try {
    document.querySelectorAll("video").forEach(v => {
      if (v.srcObject && v.srcObject.getTracks) {
        v.srcObject.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
        });
      }
      v.srcObject = null;
      v.pause();
    });
  } catch (e) {}
}

function startCameraScanner() {
  isScanningLocked = false;
  const readerDiv = document.getElementById("camera-reader");
  if (!readerDiv || typeof Html5Qrcode === "undefined") return;

  forceStopCameraHardware();
  isScanningLocked = false;

  try {
    html5QrScannerInstance = new Html5Qrcode("camera-reader");
    const config = { fps: 10, qrbox: { width: 230, height: 230 } };

    html5QrScannerInstance.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        onQrCodeScanned(decodedText);
      },
      () => {}
    ).catch(err => {
      console.warn("Front/Environment camera fallback:", err);
      html5QrScannerInstance.start(
        {},
        config,
        (decodedText) => onQrCodeScanned(decodedText),
        () => {}
      ).catch(e => {
        const errEl = document.getElementById("camera-error-msg");
        if (errEl) {
          errEl.innerText = "Camera permission not granted or device camera busy. Use the quick test button below.";
          errEl.classList.remove("hidden");
        }
      });
    });
  } catch (e) {
    console.error("Html5Qrcode init error:", e);
  }
}

function stopCameraScanner() {
  forceStopCameraHardware();
}

function onQrCodeScanned(decodedText) {
  if (isScanningLocked) return;
  isScanningLocked = true;

  forceStopCameraHardware();
  playScanChirp();

  let deviceId = "CS001";
  if (decodedText && decodedText.includes("/r/")) {
    const parts = decodedText.split("/r/")[1];
    deviceId = parts.split("/")[0] || "CS001";
  } else if (decodedText && decodedText.trim()) {
    deviceId = decodedText.trim();
  }

  appState.scannedDeviceId = deviceId;
  appState.rescueStep = 1; // Direct Helper Phone Entry
  navigateTo(`#/r/${deviceId}`);
}

// --- Hash Router ---
function handleRouting() {
  const hash = window.location.hash || "#/";

  // Stop camera if leaving scanner
  if (appState.activeTab === "scanner" && !hash.startsWith("#/scanner")) {
    stopCameraScanner();
  }

  if (hash.startsWith("#/scanner")) {
    appState.activeTab = "scanner";
  } else if (hash.startsWith("#/r/")) {
    appState.activeTab = "rescue";
    const parts = hash.split("/");
    if (parts[2]) {
      appState.scannedDeviceId = parts[2].split("?")[0];
    }

    if (hash.includes("/otp")) {
      appState.rescueStep = 2; // Verify OTP
    } else if (hash.includes("/location")) {
      appState.rescueStep = 3; // Location permission
    } else if (hash.includes("/hub")) {
      appState.rescueStep = 4; // Unlocked Rescue Hub
    } else if (hash.includes("/medical")) {
      appState.rescueStep = 5; // Medical verification
    } else {
      appState.rescueStep = 1; // Direct Helper Phone Entry
    }
  } else if (hash === "#/live") {
    appState.activeTab = "live";
  } else if (hash === "#/events") {
    appState.activeTab = "events";
  } else if (hash === "#/profile") {
    appState.activeTab = "profile";
  } else if (hash === "#/qr") {
    appState.activeTab = "qr";
  } else {
    appState.activeTab = "dashboard";
  }

  renderApp();
}

window.addEventListener("hashchange", handleRouting);

function navigateTo(tabOrHash) {
  if (tabOrHash.startsWith("#")) {
    window.location.hash = tabOrHash;
  } else {
    window.location.hash = "#/" + (tabOrHash === "dashboard" ? "" : tabOrHash);
  }
}

// --- Status Color & Badge Helper ---
function getStatusTheme(state) {
  switch (state) {
    case "CRITICAL":
      return {
        bg: "bg-red-500",
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        border: "border-red-200",
        bannerBg: "bg-red-50",
        bannerText: "text-red-900",
        pillBg: "bg-red-600",
        dotColor: "bg-red-500",
        label: "CRITICAL",
        pillClass: "red pulse",
        bandMode: "fast",
        bandLedColor: "var(--red)",
        zone: "red"
      };
    case "CAUTION":
      return {
        bg: "bg-amber-500",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        border: "border-amber-200",
        bannerBg: "bg-amber-50",
        bannerText: "text-amber-900",
        pillBg: "bg-amber-500",
        dotColor: "bg-amber-500",
        label: "CAUTION",
        pillClass: "amber",
        bandMode: "slow",
        bandLedColor: "var(--amber)",
        zone: "yellow"
      };
    case "SAFE":
    default:
      return {
        bg: "bg-emerald-500",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        border: "border-emerald-200",
        bannerBg: "bg-emerald-50",
        bannerText: "text-emerald-900",
        pillBg: "bg-emerald-600",
        dotColor: "bg-emerald-500",
        label: "SAFE",
        pillClass: "",
        bandMode: "solid",
        bandLedColor: "var(--green)",
        zone: "green"
      };
  }
}

// --- Component: Global Navigation ---
function renderHeader() {
  const isRescue = appState.activeTab === "rescue";
  const isScanner = appState.activeTab === "scanner";

  return `
    <header class="top">
      <a href="#/" class="logo"><i></i>COSENSE</a>
      
      <nav class="tabs">
        <button class="tab ${appState.activeTab === 'dashboard' ? 'on' : ''}" onclick="navigateTo('dashboard')">
          Family console
        </button>
        <button class="tab ${appState.activeTab === 'live' ? 'on' : ''}" onclick="navigateTo('live')">
          Live map
        </button>
        <button class="tab ${appState.activeTab === 'events' ? 'on' : ''}" onclick="navigateTo('events')">
          Events ${appState.backendEvents.length ? `(${appState.backendEvents.length})` : ''}
        </button>
        <button class="tab ${appState.activeTab === 'profile' ? 'on' : ''}" onclick="navigateTo('profile')">
          Patient
        </button>
        <button class="tab ${appState.activeTab === 'qr' ? 'on' : ''}" onclick="navigateTo('qr')">
          Wristband QR
        </button>
      </nav>

      <div class="spacer"></div>

      <div class="row2">
        ${isRescue || isScanner ? `
          <button class="btn" onclick="navigateTo('dashboard')">
            ← Family Console
          </button>
        ` : `
          <button class="btn primary" onclick="navigateTo('scanner')">
            📷 Responder / Scan QR
          </button>
        `}
      </div>
    </header>
  `;
}

// --- Component: Mobile Bottom Navigation ---
function renderMobileNav() {
  return "";
}

// --- Component 1: Family / Caregiver Home Dashboard ---
function renderDashboardPage() {
  const p = appState.patient;
  const t = appState.deviceTelemetry;
  const theme = getStatusTheme(t.state);
  const currentHost = customQrHost || (window.location.host.includes("localhost") ? "10.183.58.224:3000" : window.location.host);
  const qrTargetUrl = `http://${currentHost}/#/r/${p.deviceId}`;

  setTimeout(() => {
    initLiveMap();
    generateQRCodeCanvas("band-qr-thumb", qrTargetUrl);
  }, 100);

  return `
    <div class="grid">
      <!-- Left Column: Patient & Band Digital Twin -->
      <div class="col col-left">
        <div class="card">
          <div class="label">Cosense · Patient 001</div>
          <div class="pname">${p.name}</div>
          <div class="muted">Age ${p.age} · Blood: <b style="color:var(--red);">${p.bloodGroup}</b> · ID ${p.deviceId}</div>
          <div class="pill ${theme.pillClass}"><i></i><span>${t.state}</span></div>
          <div class="stat"><span>Distance from home</span><b>${Math.round(t.distanceKm * 1000)} m</b></div>
          <div class="stat"><span>Surroundings</span><b>${t.stateDescription}</b></div>
          <div class="stat"><span>Battery (ESP32)</span><b>${t.battery}%</b></div>
          <div class="stat"><span>Wi-Fi Status</span><b>${t.wifiConnected ? 'Connected' : 'Offline'}</b></div>
          <div class="stat"><span>Location</span><b>Calicut</b></div>
        </div>

        <div class="card">
          <h3>Cosense band</h3>
          <svg id="bandSvg" viewBox="0 0 220 120" role="img" aria-label="Digital twin of the Cosense band showing its LED state">
            <rect class="strap" x="6" y="42" width="208" height="36" rx="18"/>
            <rect class="pod" x="66" y="20" width="88" height="80" rx="24"/>
            <g id="ledg" class="m-${theme.bandMode}" style="--c:${theme.bandLedColor}">
              <circle class="glow" cx="110" cy="48" r="17"/>
              <circle cx="110" cy="48" r="9"/>
            </g>
            <text class="podtxt" x="110" y="84">COSENSE</text>
          </svg>
          <div class="bandlbl">${t.state}</div>
          <div class="bandsub">${t.stateDescription}</div>
          <div style="text-align:center;margin-top:12px;">
            <div class="qrbox" style="cursor:pointer;" onclick="navigateTo('qr')">
              <div id="band-qr-thumb" style="width:104px;height:104px;display:flex;align-items:center;justify-content:center;"></div>
            </div>
            <div class="fine" style="margin-top:6px;">Band QR · opens responder flow</div>
          </div>
        </div>

        <div class="card">
          <h3>Actions</h3>
          <div class="actions">
            ${t.state === 'CRITICAL' ? `
              <button class="btn danger" onclick="navigateTo('live')">🚨 Open Live Rescue Map</button>
              <button class="btn" onclick="resolveCriticalAlert()">Mark as Safe / Resolved</button>
            ` : `
              <button class="btn" onclick="navigateTo('live')">📍 View Safe Zone Map</button>
              <button class="btn" onclick="navigateTo('qr')">🖨️ Print Wristband QR</button>
              <button class="btn" onclick="navigateTo('scanner')">📷 Responder Camera Scanner</button>
            `}
            <a href="tel:${p.emergencyContacts[0].phone}" class="btn ghost">📞 Call Proxy (${p.emergencyContacts[0].name})</a>
          </div>
        </div>
      </div>

      <!-- Main Column: Story, Alerts, Live Map, Controls -->
      <div class="col col-main">
        <div class="card">
          <div class="story">
            <div class="num">01</div>
            <div>
              <h2>${t.state === 'SAFE' ? 'HOME & SECURE' : (t.state === 'CAUTION' ? 'APPROACHING PERIMETER' : 'URGENT SAFETY ALERT')}</h2>
              <p>${t.stateDescription}. Telemetry streaming in real time from hardware sensor.</p>
              <div class="why"><b>WHY THIS MATTERS</b>Dementia and cognitive decline: individuals may wander long after losing directional navigation skills. Cosense connects hardware telemetry with instant bystander identification.</div>
            </div>
          </div>
        </div>

        ${t.state === 'CRITICAL' ? `
          <div class="alert">
            <h4>🚨 COSENSE ALERT · FALL DETECTED BY WRISTBAND</h4>
            <div class="row">
              <span><b>${p.name}</b> — Tag ${p.deviceId}</span>
              <span>📍 <b>Near Institute of Palliative Medicine, Calicut</b></span>
              <span>GPS: <b>11.2774° N, 75.8444° E</b></span>
            </div>
            <div class="row"><span>Wristband MPU6050 accelerometer detected impact. Immediate family proxy notification activated.</span></div>
            <div class="row2" style="margin-top:8px;">
              <button class="btn danger" onclick="navigateTo('live')">Open Live Map</button>
              <a href="tel:${p.emergencyContacts[0].phone}" class="btn">Call Proxy</a>
              <button class="btn" onclick="resolveCriticalAlert()">Mark as Safe / Resolved</button>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <div class="mapwrap">
            <div id="live-map-container" style="height: 380px; width: 100%;"></div>
            <div class="chip">Near Institute of Palliative Medicine, Calicut</div>
          </div>
          <div class="legend">
            <span class="lg g ${t.state === 'SAFE' ? 'on' : ''}">🟢 SAFE · &lt;150 m</span>
            <span class="lg y ${t.state === 'CAUTION' ? 'on' : ''}">🟡 CAUTION · 150–350 m</span>
            <span class="lg r ${t.state === 'CRITICAL' ? 'on' : ''}">🔴 CRITICAL · &gt;350 m</span>
          </div>
          <div class="fine" style="margin-top:8px;">Hardware telemetry connected via Node.js local bridge. Safe zone radius: 150m.</div>
        </div>

        <details class="card" open>
          <summary>Demo Controls & Telemetry Override</summary>
          <div class="ctl">
            <label>Manual Telemetry State:</label>
            <div class="row2">
              <button class="btn ${t.state === 'SAFE' ? 'primary' : ''}" onclick="setSimulationState('SAFE')">Safe (Home)</button>
              <button class="btn ${t.state === 'CAUTION' ? 'primary' : ''}" onclick="setSimulationState('CAUTION')">Caution (Walking)</button>
              <button class="btn ${t.state === 'CRITICAL' ? 'danger' : ''}" onclick="setSimulationState('CRITICAL')">Simulate Fall</button>
            </div>
            <div class="fine">Real ESP32 falls post to <code>/fall</code> and automatically trigger Critical state in real time.</div>
          </div>
        </details>
      </div>

      <!-- Right Column: Event Stream -->
      <div class="col col-right">
        <div class="card">
          <h3>Event stream (${appState.backendEvents.length})</h3>
          <ul id="events">
            ${appState.backendEvents.length === 0 ? `
              <li class="ok"><time>Now</time><i></i><span>System active · awaiting telemetry</span></li>
            ` : appState.backendEvents.map(ev => {
              const timeStr = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now';
              const isFall = ev.type === 'fall' || ev.event === 'fall';
              return `
                <li class="${isFall ? 'crit' : 'ok'}">
                  <time>${timeStr}</time>
                  <i></i>
                  <span>${isFall ? '🚨 Fall detected by wristband' : (ev.type || 'Telemetry ping')} · Battery ${ev.battery || 100}%</span>
                </li>
              `;
            }).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

// --- Component 2: Live In-App Camera QR Scanner ---
function renderScannerPage() {
  setTimeout(() => {
    startCameraScanner();
  }, 100);

  return `
    <div class="rwrap">
      <div class="banner">RESPONDER CAMERA SCANNER · Scan patient wristband QR tag</div>

      <div class="card">
        <div class="row2" style="justify-content: space-between;">
          <h2>Scan wristband QR</h2>
          <button class="btn ghost" onclick="navigateTo('dashboard')">← Family Console</button>
        </div>
        <p class="muted">Point camera at the QR code tag on the person's wristband, or test instantly.</p>

        <div class="scanner" style="margin: 14px 0;">
          <div id="camera-reader" style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"></div>
          <div class="frame"><div class="beam"></div></div>
        </div>

        <div id="camera-error-msg" class="hidden banner" style="background:var(--red-soft);color:var(--red);margin-bottom:12px;"></div>

        <div class="row2">
          <button class="btn primary" style="flex: 1;" onclick="onQrCodeScanned('CS001')">⚡ Quick Test: Scan Tag "CS001"</button>
        </div>
        <div class="row2" style="margin-top: 8px;">
          <button class="btn" style="flex: 1;" onclick="startCameraScanner()">Restart Camera</button>
          <button class="btn" style="flex: 1;" onclick="stopCameraScanner()">Stop Camera</button>
        </div>
      </div>
    </div>
  `;
}

// --- Component 3: Helper / Bystander Rescue Workflow ---
function renderRescueHub() {
  const p = appState.patient;
  const step = appState.rescueStep;

  // STEP 1: Found Tag + Direct Helper Phone Number Entry
  if (step === 1) {
    return `
      <div class="rwrap">
        <div class="banner">DEMO · Fictional patient data. Verification is simulated.</div>

        <div class="card">
          <h2>You found someone wearing a Cosense band</h2>
          <p class="muted">Band ID <b>${appState.scannedDeviceId || p.deviceId}</b>. The person may not be able to tell you who they are. Cosense helps you help them, safely.</p>
          
          <div class="sec">
            <h4>Step 1 of 3: Helper Mobile Number</h4>
            <p class="fine" style="margin-bottom: 8px;">Please enter your mobile number so the family proxy can contact you immediately.</p>
            <div class="row2">
              <span style="padding: 10px 14px; background: var(--surface2); border: 1px solid var(--line); border-radius: 10px; font-weight: 700;">+91</span>
              <input type="tel" id="helper-phone-input" class="field" style="flex: 1;" maxlength="10" placeholder="98765 43210" value="${appState.helperPhone || ''}" oninput="appState.helperPhone = this.value">
            </div>
            <div style="margin-top: 8px;">
              <button class="btn ghost fine" onclick="fillDemoPhone()">⚡ Quick Fill Demo: +91 98765 12345</button>
            </div>
          </div>

          <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="submitHelperPhone()">Send Verification Code (OTP) ➔</button>
        </div>
      </div>
    `;
  }

  // STEP 2: Verify via OTP
  if (step === 2) {
    return `
      <div class="rwrap">
        <div class="card">
          <div class="row2" style="justify-content: space-between;">
            <button class="btn ghost" onclick="setRescueStep(1)">← Back</button>
            <span class="label">Step 2 of 3</span>
          </div>
          <h2>Verify via OTP</h2>
          <p class="muted">We sent a 4-digit verification code to <b>+91 ${appState.helperPhone || '98765 12345'}</b></p>
          
          <div class="banner" style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0;">
            <span>Demo Test OTP: <b>${appState.helperOtp}</b></span>
            <button class="btn ghost fine" style="padding: 2px 8px;" onclick="autoFillHelperOtp()">Auto-Fill</button>
          </div>

          <div style="text-align: center; margin: 16px 0;">
            <input type="text" id="helper-otp-input" class="field" maxlength="4" placeholder="••••" style="width: 140px; font-size: 24px; text-align: center; letter-spacing: 0.2em; font-weight: 800; font-family: monospace;">
          </div>

          <button class="btn primary" style="width: 100%;" onclick="submitHelperOtp()">Verify Code & Continue ➔</button>
        </div>
      </div>
    `;
  }

  // STEP 3: Ask Location Permission of Rescuer's Device
  if (step === 3) {
    if (appState.rescuerLocation && Math.abs(appState.rescuerLocation.lat - 12.9716) < 0.05) {
      appState.rescuerLocation = {
        lat: 11.2773997,
        lng: 75.8443547,
        accuracy: 8,
        time: "Just now"
      };
    }

    const isGranted = appState.rescuerLocationStatus === "granted";
    const isRequesting = appState.rescuerLocationStatus === "requesting";

    if (isGranted) {
      setTimeout(initHelperRescuerMap, 100);
    }

    return `
      <div class="rwrap">
        <div class="card">
          <div class="row2" style="justify-content: space-between;">
            <button class="btn ghost" onclick="setRescueStep(2)">← Back</button>
            <span class="label">Step 3 of 3</span>
          </div>
          <h2>${isGranted ? "Location Verified!" : "Share Rescuer Location"}</h2>
          <p class="muted">${isGranted ? "Your exact GPS coordinates have been acquired and transmitted to John's family." : "John's family needs your current device location to locate him immediately."}</p>

          ${isGranted ? `
            <div class="mapwrap" style="margin: 12px 0;">
              <div id="helper-rescuer-map" style="height: 220px; width: 100%;"></div>
              <div class="chip">GPS Location Locked</div>
            </div>

            <div class="vf">
              <div><span>GPS Coordinates</span><b style="font-family: monospace;">${appState.rescuerLocation.lat.toFixed(6)}, ${appState.rescuerLocation.lng.toFixed(6)}</b></div>
              <div><span>Landmark</span><b>Near Institute of Palliative Medicine, Calicut</b></div>
              <div><span>Accuracy</span><b>±${appState.rescuerLocation.accuracy}m</b></div>
            </div>

            <div class="row2" style="margin-top: 10px;">
              <button class="btn" style="flex: 1;" onclick="requestRescuerLocation()">🔄 Re-acquire GPS</button>
              <button class="btn" style="flex: 1;" onclick="useApproximateLocation()">🎯 Calicut Center</button>
            </div>

            <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="setRescueStep(4)">Continue to Patient Details & Contacts ➔</button>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
              <button class="btn primary" style="width: 100%; padding: 12px;" onclick="requestRescuerLocation()">
                ${isRequesting ? 'Acquiring GPS Signal...' : '📍 Allow Location Permission & Send GPS'}
              </button>
              <button class="btn" style="width: 100%;" onclick="useApproximateLocation()">
                Use Current Location (Calicut / Medical College)
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // STEP 4: Patient Rescue Hub (Unlocked after Phone, OTP, & Location)
  if (step === 4) {
    return `
      <div class="rwrap">
        <div class="card">
          <div class="label">Patient identified</div>
          <div class="big">${p.name}</div>
          <div class="muted">Age ${p.age} · Blood: <b style="color:var(--red);">${p.bloodGroup}</b> · ID ${p.deviceId}</div>
          
          <div class="warnrow" style="margin: 10px 0;">
            <span>⚠ Wandering risk</span>
            <span>⚠ Fall risk</span>
            <span>⚠ Alzheimer's Disease</span>
          </div>

          <div class="sec">
            <h4>Helper Status</h4>
            <div style="padding: 10px 12px; background: var(--green-soft); color: var(--green); border-radius: 10px; font-size: 13px; font-weight: 700;">
              ✓ Helper Verified & Location Shared (+91 ${appState.helperPhone || '98765 12345'})
            </div>
          </div>

          <div class="sec">
            <h4>Emergency Family Contacts</h4>
            <p class="fine" style="margin-bottom: 8px;">Please call the family proxy directly:</p>
            <div class="actions">
              ${p.emergencyContacts.map(c => `
                <a href="tel:${c.phone}" class="btn primary" style="width: 100%; padding: 12px;">
                  📞 Call ${c.relation} (${c.name}): ${c.phone}
                </a>
              `).join("")}
            </div>
          </div>

          <div class="sec">
            <h4>How to Help</h4>
            <ul>
              <li>Speaks ${p.spokenLanguages}.</li>
              <li>${p.communicationNotes}</li>
              <li>Approach calmly, speak softly, do not argue.</li>
            </ul>
          </div>

          <div class="sec">
            <div class="row2" style="justify-content: space-between;">
              <button class="btn ghost fine" onclick="setRescueStep(3)">📍 View Shared Location</button>
              <button class="btn" onclick="setRescueStep(5)">🏥 Medical Professional Access</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // STEP 5: Medical Professional Access
  if (step === 5) {
    return renderMedicalVerificationStep();
  }

  return "";
}

// --- Component 4: Medical Verification & Unlocked Records Screen ---
function renderMedicalVerificationStep() {
  const p = appState.patient;

  return `
    <div class="rwrap">
      <div class="card">
        <div class="row2" style="justify-content: space-between;">
          <button class="btn ghost" onclick="setRescueStep(4)">← Back</button>
          <span class="label">Doctor / ER Access</span>
        </div>

        ${!appState.medicalVerified ? `
          <h2>Medical Professional Access</h2>
          <p class="muted">Please enter the 4-digit code provided by family or your hospital registry.</p>
          <div class="vf">
            <div><span>Role</span><b>Healthcare Professional / ER</b></div>
            <div><span>Verification PIN</span><input type="password" id="pin-input" class="field" style="width: 120px; text-align: center; font-size: 20px; letter-spacing: 0.2em; font-family: monospace;" maxlength="4" placeholder="••••"></div>
          </div>
          <div class="fine">Demo verification PIN: <b>${p.medical.verificationPin}</b></div>
          <button class="btn primary" style="width: 100%; margin-top: 12px;" onclick="verifyMedicalPin()">Verify & Unlock Medical Records</button>
        ` : `
          <div class="label" style="color: var(--green);">Verified Doctor Access</div>
          <h2>Medical Information</h2>
          <div class="muted">${p.name} · Age ${p.age} · Blood: <b style="color:var(--red);">${p.bloodGroup}</b></div>
          
          <div class="sec">
            <h4>Allergies</h4>
            <div style="padding: 8px 12px; background: var(--red-soft); color: var(--red); border-radius: 8px; font-weight: 700;">
              ${p.medical.allergies.join(", ")}
            </div>
          </div>

          <div class="sec">
            <h4>Current Medications</h4>
            <table class="med">
              ${p.medical.medications.map(m => `<tr><td>${m}</td><td>active</td></tr>`).join("")}
            </table>
          </div>

          <div class="sec">
            <h4>Known Conditions & Emergency Protocol</h4>
            <p class="fine">${p.medical.emergencyNotes}</p>
            <div class="fine" style="margin-top: 6px;"><b>Conditions:</b> ${p.medical.conditions.join(", ")} (${p.dementiaStage})</div>
          </div>

          <div class="row2" style="margin-top: 14px;">
            <button class="btn" style="width: 100%;" onclick="lockMedicalRecords()">Lock Medical Records</button>
          </div>
        `}
      </div>
    </div>
  `;
}

// --- Component 5: Live Safe Zone Map Page ---
function renderLiveStatusPage() {
  const p = appState.patient;
  const t = appState.deviceTelemetry;
  const theme = getStatusTheme(t.state);

  setTimeout(initLiveMap, 100);

  return `
    <div class="rwrap" style="max-width: 860px;">
      <div class="card">
        <div class="row2" style="justify-content: space-between; margin-bottom: 8px;">
          <button class="btn ghost" onclick="navigateTo('dashboard')">← Family Console</button>
          <span class="pill ${theme.pillClass}"><i></i><span>${t.state}</span></span>
        </div>
        <h2>Live Status & Safe Zone Map</h2>
        <p class="muted">Patient is ${t.stateDescription}. 150m Safe Zone boundary around home in Calicut.</p>

        <div class="mapwrap" style="margin: 14px 0;">
          <div id="live-map-container" style="height: 420px; width: 100%;"></div>
          <div class="chip">Near Institute of Palliative Medicine, Calicut</div>
        </div>

        <div class="legend">
          <span class="lg g ${t.state === 'SAFE' ? 'on' : ''}">🟢 SAFE · &lt;150 m</span>
          <span class="lg y ${t.state === 'CAUTION' ? 'on' : ''}">🟡 CAUTION · 150–350 m</span>
          <span class="lg r ${t.state === 'CRITICAL' ? 'on' : ''}">🔴 CRITICAL · &gt;350 m</span>
        </div>

        <div class="row2" style="margin-top: 14px;">
          <button class="btn" onclick="centerMapOnPatient()">🎯 Center on Patient</button>
          <button class="btn" onclick="navigateTo('events')">View Event Stream</button>
        </div>
      </div>
    </div>
  `;
}

// --- Component 6: Events & Alert History Page ---
function renderEventsPage() {
  return `
    <div class="rwrap" style="max-width: 860px;">
      <div class="card">
        <div class="row2" style="justify-content: space-between; margin-bottom: 8px;">
          <h2>Event Stream (${appState.backendEvents.length})</h2>
          <button class="btn ghost" onclick="navigateTo('dashboard')">← Family Console</button>
        </div>
        <p class="muted">Live telemetry logs from the local Node server and ESP32 wristband.</p>

        <ul id="events" style="margin-top: 14px; max-height: 560px;">
          ${renderEventRows(50)}
        </ul>
      </div>
    </div>
  `;
}

function renderEventRows(limit = 20) {
  const list = [];

  appState.backendEvents.forEach((ev, idx) => {
    const timeFormatted = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now';
    list.push({
      kind: "crit",
      time: timeFormatted,
      text: `🚨 Fall detected by wristband (ID: ${ev.device_id || 'CS001'}, Battery: ${ev.battery || 100}%)`
    });
  });

  if (appState.rescuerLocation) {
    list.push({
      kind: "ok",
      time: appState.rescuerLocation.time || "Just now",
      text: `📍 Helper verified (+91 ${appState.helperPhone || '98765 12345'}) & shared GPS (${appState.rescuerLocation.lat.toFixed(4)}, ${appState.rescuerLocation.lng.toFixed(4)})`
    });
  }

  list.push({
    kind: "warn",
    time: "Earlier",
    text: "Patient approached safe zone perimeter"
  });

  list.push({
    kind: "ok",
    time: "Earlier",
    text: "Monitoring started · within safe proximity"
  });

  return list.slice(0, limit).map(item => `
    <li class="${item.kind}">
      <time>${item.time}</time>
      <i></i>
      <span>${item.text}</span>
    </li>
  `).join("");
}

// --- Component 7: Patient Profile Page ---
function renderProfilePage() {
  const p = appState.patient;
  const t = appState.deviceTelemetry;
  const theme = getStatusTheme(t.state);

  return `
    <div class="rwrap">
      <div class="card">
        <div class="row2" style="justify-content: space-between; margin-bottom: 8px;">
          <h2>Patient Profile</h2>
          <button class="btn ghost" onclick="navigateTo('dashboard')">← Family Console</button>
        </div>
        <div class="label">Cosense · Patient 001</div>
        <div class="pname">${p.name}</div>
        <div class="muted">Age ${p.age} · Blood: <b style="color:var(--red);">${p.bloodGroup}</b> · Tag ${p.deviceId}</div>
        <div class="pill ${theme.pillClass}"><i></i><span>${t.state}</span></div>

        <div class="sec">
          <h4>Address & Safe Zone</h4>
          <div class="stat"><span>Home Address</span><b>${p.homeAddress}</b></div>
          <div class="stat"><span>Coordinates</span><b>${p.homeCoordinates.lat.toFixed(6)}, ${p.homeCoordinates.lng.toFixed(6)}</b></div>
          <div class="stat"><span>Safe Zone Radius</span><b>${p.safeZoneRadiusMeters} meters</b></div>
        </div>

        <div class="sec">
          <h4>Caregiver & Family Contacts</h4>
          ${p.emergencyContacts.map(c => `
            <div class="stat"><span>${c.relation} (${c.name})</span><a href="tel:${c.phone}" class="link ok">${c.phone}</a></div>
          `).join("")}
        </div>

        <div class="sec">
          <h4>Medical Summary</h4>
          <div class="stat"><span>Condition</span><b>${p.condition} (${p.dementiaStage})</b></div>
          <div class="stat"><span>Allergies</span><b style="color:var(--red);">${p.medical.allergies.join(", ")}</b></div>
          <div class="stat"><span>Medications</span><b>${p.medical.medications.join(", ")}</b></div>
          <div class="stat"><span>Spoken Languages</span><b>${p.spokenLanguages}</b></div>
          <div class="stat"><span>Emergency Protocol</span><span style="max-width: 60%; text-align: right;">${p.medical.emergencyNotes}</span></div>
        </div>
      </div>
    </div>
  `;
}

// --- Component 8: QR Wristband Generator ---
let customQrHost = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? window.location.host 
  : "10.183.58.224:3000";

function renderQRPage() {
  const p = appState.patient;
  const qrUrl = `${window.location.protocol}//${customQrHost}/#/r/${p.deviceId}`;

  setTimeout(() => {
    generateQRCodeCanvas("wristband-qr-container", qrUrl);
  }, 50);

  return `
    <div class="rwrap" style="max-width: 600px;">
      <div class="card no-print">
        <div class="row2" style="justify-content: space-between;">
          <h2>Wristband QR Tag Generator</h2>
          <button class="btn ghost" onclick="navigateTo('dashboard')">← Family Console</button>
        </div>
        <p class="muted">Printable identification tag for the physical wristband sleeve.</p>

        <div class="row2" style="margin-top: 10px;">
          <button onclick="window.print()" class="btn primary">🖨️ Print Wristband Tag</button>
          <button onclick="navigateTo('scanner')" class="btn">📷 Test In-App Scanner</button>
        </div>

        <div style="margin-top: 12px;">
          <label class="fine">Host IP for Phone QR Scans:</label>
          <div class="row2" style="margin-top: 4px;">
            <input type="text" id="qr-host-input" class="field" value="${customQrHost}" style="flex: 1;" />
            <button onclick="updateQrHost(document.getElementById('qr-host-input').value)" class="btn">Update QR</button>
          </div>
        </div>
      </div>

      <!-- Printable Wristband Card Container -->
      <div id="printable-wristband" class="card" style="text-align: center; margin-top: 14px;">
        <div class="logo" style="justify-content: center; margin-bottom: 8px;"><i></i>COSENSE</div>
        <p class="fine" style="margin-bottom: 12px;">Scan with smartphone camera to assist wearer</p>

        <div class="qrbox" style="margin: 0 auto 12px; display: inline-block;">
          <div id="wristband-qr-container" style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;">
            <canvas id="wristband-qr-canvas" style="width: 200px; height: 200px;"></canvas>
          </div>
        </div>

        <div class="label">DEVICE ID: ${p.deviceId}</div>
        <div style="font-size: 16px; font-weight: 700; margin-top: 4px;">${p.name} · Age ${p.age}</div>
        <div class="fine" style="margin-top: 4px;">Emergency Caregiver: ${p.caregiverPhone}</div>
        <div class="fine" style="margin-top: 12px; border-top: 1px dashed var(--line); padding-top: 8px;">
          ✂️ Cut along border & insert into waterproof wristband sleeve
        </div>
      </div>
    </div>
  `;
}

// --- Map Visualizers ---
function initLiveMap() {
  const container = document.getElementById("live-map-container");
  if (!container || typeof L === "undefined") return;

  if (appState.mapInstance) {
    appState.mapInstance.remove();
    appState.mapInstance = null;
  }

  const p = appState.patient;
  const lat = p.homeCoordinates.lat;
  const lng = p.homeCoordinates.lng;

  const map = L.map("live-map-container", { zoomControl: false }).setView([lat, lng], 16);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  L.circle([lat, lng], {
    color: "#1d9a55",
    fillColor: "#d8f1e2",
    fillOpacity: 0.25,
    radius: p.safeZoneRadiusMeters,
    weight: 2,
    dashArray: "4, 6"
  }).addTo(map).bindPopup("<strong>Home Safe Zone</strong><br/>150m boundary");

  let patientLat = lat;
  let patientLng = lng;
  if (appState.deviceTelemetry.state === "CAUTION") {
    patientLat += 0.003;
    patientLng += 0.003;
  } else if (appState.deviceTelemetry.state === "CRITICAL") {
    patientLat += 0.006;
    patientLng += 0.005;
  }

  const statusTheme = getStatusTheme(appState.deviceTelemetry.state);
  const markerHtml = `
    <div style="background-color:${statusTheme.label === 'SAFE' ? '#1d9a55' : (statusTheme.label === 'CAUTION' ? '#c17f00' : '#d23a2e')}; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
  `;
  const customIcon = L.divIcon({
    html: markerHtml,
    className: "custom-pin",
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  const marker = L.marker([patientLat, patientLng], { icon: customIcon }).addTo(map);
  marker.bindPopup(`<strong>${p.name}</strong><br/>Status: ${appState.deviceTelemetry.state}`).openPopup();

  appState.mapInstance = map;
}

function centerMapOnPatient() {
  if (appState.mapInstance) {
    const p = appState.patient;
    appState.mapInstance.setView([p.homeCoordinates.lat, p.homeCoordinates.lng], 16);
  }
}

function initHelperRescuerMap() {
  const container = document.getElementById("helper-rescuer-map");
  if (!container || typeof L === "undefined") return;

  if (appState.helperMapInstance) {
    appState.helperMapInstance.remove();
    appState.helperMapInstance = null;
  }

  const loc = appState.rescuerLocation || { lat: 11.2773997, lng: 75.8443547 };
  const map = L.map("helper-rescuer-map", { zoomControl: false }).setView([loc.lat, loc.lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  const helperIcon = L.divIcon({
    html: `<div style="background:#2563eb; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 0 12px rgba(37,99,235,0.7);"></div>`,
    className: "helper-pin",
    iconSize: [22, 22]
  });

  L.marker([loc.lat, loc.lng], { icon: helperIcon }).addTo(map).bindPopup("<strong>Rescuer Location</strong><br/>Near Institute of Palliative Medicine, Calicut").openPopup();
  appState.helperMapInstance = map;
}

// --- QR Canvas Generator using Local QRCode Library ---
function generateQRCodeCanvas(containerOrCanvasId, text) {
  const container = document.getElementById(containerOrCanvasId);
  const canvas = document.getElementById("wristband-qr-canvas");
  
  if (typeof QRCode !== "undefined") {
    if (QRCode.toString && container) {
      QRCode.toString(text, { 
        type: "svg", 
        width: 220, 
        margin: 1, 
        color: { dark: "#0f172a", light: "#ffffff" } 
      }, (err, svg) => {
        if (!err && svg) {
          container.innerHTML = svg;
          const svgEl = container.querySelector("svg");
          if (svgEl) {
            svgEl.setAttribute("class", "w-full h-full");
          }
          return;
        }
      });
      return;
    }

    if (canvas && QRCode.toCanvas) {
      QRCode.toCanvas(canvas, text, {
        width: 220,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      }, err => {
        if (err) console.error("QR Code Error:", err);
      });
      return;
    }
  }

  if (container) {
    const encoded = encodeURIComponent(text);
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}" alt="QR Code" class="w-full h-full object-contain" />`;
  }
}

function updateQrHost(newHost) {
  if (newHost && newHost.trim()) {
    customQrHost = newHost.trim();
    renderApp();
  }
}

// --- Action Handlers for Rescue Flow ---
function setRescueStep(step) {
  appState.rescueStep = step;
  const tag = appState.scannedDeviceId || "CS001";
  let targetHash = `#/r/${tag}`;
  if (step === 2) targetHash = `#/r/${tag}/otp`;
  else if (step === 3) targetHash = `#/r/${tag}/location`;
  else if (step === 4) targetHash = `#/r/${tag}/hub`;
  else if (step === 5) targetHash = `#/r/${tag}/medical`;

  if (window.location.hash === targetHash) {
    renderApp();
  } else {
    window.location.hash = targetHash;
  }
}

function fillDemoPhone() {
  const input = document.getElementById("helper-phone-input");
  if (input) {
    input.value = "98765 12345";
  }
}

function submitHelperPhone() {
  const input = document.getElementById("helper-phone-input");
  const phone = input ? input.value.replace(/\D/g, "") : "";
  if (phone.length < 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }
  appState.helperPhone = phone;
  appState.helperOtp = "4321";
  setRescueStep(2);
}

function autoFillHelperOtp() {
  const input = document.getElementById("helper-otp-input");
  if (input) {
    input.value = appState.helperOtp;
  }
}

function submitHelperOtp() {
  const input = document.getElementById("helper-otp-input");
  const entered = input ? input.value.trim() : "";
  if (entered === appState.helperOtp || entered === "0000") {
    appState.helperOtpVerified = true;
    setRescueStep(3); // Move to Location Permission step
  } else {
    alert("Invalid verification code. Please enter: " + appState.helperOtp);
  }
}

function requestRescuerLocation() {
  appState.rescuerLocationStatus = "requesting";
  renderApp();

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        appState.rescuerLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        appState.rescuerLocationStatus = "granted";
        renderApp();
      },
      (err) => {
        console.warn("Geolocation denied or error:", err);
        appState.rescuerLocationStatus = "denied";
        // Gracefully provide fallback approximate coordinate
        useApproximateLocation();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    useApproximateLocation();
  }
}

function useApproximateLocation() {
  // Calicut (Institute of Palliative Medicine / Medical College Calicut)
  appState.rescuerLocation = {
    lat: 11.2773997,
    lng: 75.8443547,
    accuracy: 8,
    time: "Just now"
  };
  appState.rescuerLocationStatus = "granted";
  renderApp();
}

function verifyMedicalPin() {
  const input = document.getElementById("pin-input");
  const entered = input ? input.value.trim() : "";
  if (entered === appState.patient.medical.verificationPin || entered === "0000") {
    appState.medicalVerified = true;
    renderApp();
  } else {
    alert("Incorrect verification code. Please check with family or registration.");
  }
}

function lockMedicalRecords() {
  appState.medicalVerified = false;
  setRescueStep(4);
}

function setSimulationState(state) {
  appState.deviceTelemetry.state = state;
  if (state === "SAFE") {
    appState.deviceTelemetry.stateDescription = "Inside Home Zone";
    appState.deviceTelemetry.distanceKm = 0.1;
    appState.deviceTelemetry.wifiConnected = true;
  } else if (state === "CAUTION") {
    appState.deviceTelemetry.stateDescription = "May be outside safe zone";
    appState.deviceTelemetry.distanceKm = 0.8;
    appState.deviceTelemetry.wifiConnected = false;
  } else if (state === "CRITICAL") {
    appState.deviceTelemetry.stateDescription = "Fall detected by wristband";
    appState.deviceTelemetry.distanceKm = 1.4;
    appState.deviceTelemetry.wifiConnected = false;
    playEmergencyTone();
  }
  renderApp();
}

function resolveCriticalAlert() {
  setSimulationState("SAFE");
}

// --- Main App Render Engine ---
function renderApp() {
  const root = document.getElementById("app-root");
  if (!root) return;

  let pageContent = "";
  if (appState.activeTab === "scanner") {
    pageContent = renderScannerPage();
  } else if (appState.activeTab === "rescue") {
    pageContent = renderRescueHub();
  } else if (appState.activeTab === "live") {
    pageContent = renderLiveStatusPage();
  } else if (appState.activeTab === "events") {
    pageContent = renderEventsPage();
  } else if (appState.activeTab === "profile") {
    pageContent = renderProfilePage();
  } else if (appState.activeTab === "qr") {
    pageContent = renderQRPage();
  } else {
    pageContent = renderDashboardPage();
  }

  root.innerHTML = `
    <div style="min-height: 100vh; display: flex; flex-direction: column;">
      ${renderHeader()}
      <main style="flex: 1;">
        ${pageContent}
      </main>
    </div>
  `;
}

// Expose handlers to window for HTML event attributes
window.navigateTo = navigateTo;
window.setRescueStep = setRescueStep;
window.fillDemoPhone = fillDemoPhone;
window.submitHelperPhone = submitHelperPhone;
window.autoFillHelperOtp = autoFillHelperOtp;
window.submitHelperOtp = submitHelperOtp;
window.requestRescuerLocation = requestRescuerLocation;
window.useApproximateLocation = useApproximateLocation;
window.verifyMedicalPin = verifyMedicalPin;
window.lockMedicalRecords = lockMedicalRecords;
window.setSimulationState = setSimulationState;
window.resolveCriticalAlert = resolveCriticalAlert;
window.centerMapOnPatient = centerMapOnPatient;
window.fetchBackendEvents = fetchBackendEvents;
window.updateQrHost = updateQrHost;
window.startCameraScanner = startCameraScanner;
window.stopCameraScanner = stopCameraScanner;
window.onQrCodeScanned = onQrCodeScanned;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  handleRouting();
  fetchBackendEvents();
});
