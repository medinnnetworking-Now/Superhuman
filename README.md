# Superhuman (MemoryBand)

A wearable smart fall-detection band and local monitoring server built with Seeed Studio XIAO ESP32-S3, MPU-6050 6-axis IMU, and Node.js.

## Features
- **Real-Time Fall Detection:** Edge fall-detection algorithm on ESP32-S3 using free-fall threshold and impact deceleration detection.
- **Local Dashboard:** Real-time web dashboard displaying device alerts, timestamps, and battery levels.
- **Dual-Port HTTP Ingestion:** Endpoints on ports 3000 and 3001 supporting `/fall` and `/api/fall`.
- **Alert System:** Visual LED feedback with phase pulse sequences for active fall alerts.

## Tech Stack
- **Hardware:** Seeed Studio XIAO ESP32-S3, MPU-6050
- **Firmware:** Arduino C++ (ESP32 core, Wire, WiFi, HTTPClient)
- **Backend:** Node.js, Express, CORS
- **Frontend:** Vanilla HTML/CSS/JS with live event polling

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Server
```bash
node server.js
```
The dashboard will be available at [http://localhost:3000](http://localhost:3000).

### 3. ESP32 Hardware Setup
- Configure your Wi-Fi credentials and local IP endpoint in `fall_detector (1).ino`.
- Flash to your Seeed XIAO ESP32-S3 using Arduino IDE.
