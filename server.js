const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Detailed Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} (${res.statusCode}) from ${req.ip} [${duration}ms]`);
  });
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const FILE = path.join(__dirname, "events.json");

function readEvents() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify([]));
      return [];
    }
    const content = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch (err) {
    console.error("Error reading events.json:", err);
    return [];
  }
}

function saveEvents(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing events.json:", err);
  }
}

// Fall event handler
function handleFall(req, res) {
  try {
    const events = readEvents();

    const event = {
      id: Date.now(),
      type: req.body.type || req.body.event || "fall",
      device_id: req.body.device_id || "CS001",
      timestamp: new Date().toISOString(),
      battery: req.body.battery !== undefined ? req.body.battery : 100,
    };

    events.unshift(event);
    saveEvents(events);

    console.log("🚨 FALL EVENT RECEIVED FROM ESP32:", event);

    res.json({
      success: true,
      message: "Event stored",
      event: event,
    });
  } catch (err) {
    console.error("Error handling fall event:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Receive fall event from ESP32
app.post("/fall", handleFall);
app.post("/api/fall", handleFall);

// Get all events
app.get("/events", (req, res) => {
  res.json(readEvents());
});
app.get("/api/events", (req, res) => {
  res.json(readEvents());
});

// Clear events endpoint
app.delete("/events", (req, res) => {
  saveEvents([]);
  res.json({ success: true, message: "Events cleared" });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const PORT = 3000;
const ALT_PORT = 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(`🚀 COsense Local Server Running!`);
  console.log(`👉 Open Dashboard in Browser:  http://localhost:${PORT}`);
  console.log(`👉 Or via Local IP:          http://127.0.0.1:${PORT}`);
  console.log(`👉 ESP32 Endpoint:            http://10.183.58.224:${PORT}/fall`);
  console.log(`⚠️  DO NOT type http://0.0.0.0:${PORT} in your browser`);
  console.log(`======================================================`);
});

app.listen(ALT_PORT, "0.0.0.0", () => {
  console.log(`🚀 Also listening on port ${ALT_PORT} for ESP32:`);
  console.log(`👉 ESP32 Endpoint:            http://10.183.58.224:${ALT_PORT}/api/fall`);
  console.log(`======================================================\n`);
});

