/*
  Wearable Fall Detection Band
  Board : Seeed XIAO ESP32S3
  Sensor: MPU6050 (I2C, raw register access - no library needed)

  PIN OUT
  -------------------------------------------------------------
  MPU6050 VCC  -> 3V3
  MPU6050 GND  -> GND
  MPU6050 SDA  -> D4 (GPIO5)
  MPU6050 SCL  -> D5 (GPIO6)
  MPU6050 AD0  -> GND (I2C address 0x68)

  LED anode    -> D0 (GPIO1) via 220 ohm resistor, cathode -> GND
  (Vibration motor not connected for now)
  -------------------------------------------------------------

  ALERT PATTERN after a fall:
    Phase 1 (10 s): double pulse, repeating every 500 ms gap
    Phase 2 (10 s): single pulse, repeating every 1000 ms gap
*/

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ---------- WiFi + notification (ntfy.sh) ----------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
// Local Node server running on your laptop (same WiFi network).
// If your laptop's IP changes, update it here (check with: ipconfig).
const char* SERVER_URL = "http://10.183.58.224:3000/fall";
const char* DEVICE_ID  = "CS001";

// Set to true to send one test event 5 s after boot (no fall needed).
// Set back to false once you've confirmed the server receives it.
const bool TEST_SEND_ON_BOOT = false;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 8000) {
    delay(200);
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "WiFi connected" : "WiFi failed");
}

void sendFallEvent() {
  connectWiFi();  // reconnect if the link dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = String("{\"device_id\":\"") + DEVICE_ID +
                   "\",\"event\":\"fall\",\"battery\":100}";

  int code = http.POST(payload);
  Serial.print("HTTP Response: ");
  Serial.println(code);
  http.end();
}

// ---------- Pins ----------
#define SDA_PIN    5    // D4
#define SCL_PIN    6    // D5
#define LED_PIN    1    // D0
// (vibration motor removed for now)

// ---------- MPU6050 ----------
#define MPU_ADDR   0x68
#define ACCEL_SCALE 4096.0f   // LSB/g at +/-8g

// ---------- Fall detection thresholds (tune these) ----------
const float FREEFALL_G       = 0.5f;   // magnitude below this = free-fall
const float IMPACT_G         = 2.5f;   // magnitude above this = impact
const unsigned long IMPACT_WINDOW_MS = 600;  // impact must follow free-fall within this time
const unsigned long FREEFALL_MIN_MS  = 40;   // free-fall must last at least this long

// ---------- Alert timing ----------
const unsigned long PHASE_MS       = 10000;  // each phase lasts 10 s
const unsigned long PULSE_ON_MS    = 100;    // length of one pulse
const unsigned long PULSE_GAP_MS   = 100;    // gap between the two pulses of a double pulse
const unsigned long DOUBLE_DELAY_MS = 500;   // delay after double pulse
const unsigned long SINGLE_ON_MS   = 200;    // single pulse length
const unsigned long SINGLE_DELAY_MS = 1000;  // delay after single pulse

// ---------- State ----------
unsigned long freefallStart = 0;
bool inFreefall = false;
unsigned long freefallSeenAt = 0;

void setOutputs(bool on) {
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

void mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

bool readAccelG(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, 6) != 6) return false;
  int16_t x = (Wire.read() << 8) | Wire.read();
  int16_t y = (Wire.read() << 8) | Wire.read();
  int16_t z = (Wire.read() << 8) | Wire.read();
  ax = x / ACCEL_SCALE;
  ay = y / ACCEL_SCALE;
  az = z / ACCEL_SCALE;
  return true;
}

// Waits using millis (short blocking delay is fine here)
void waitMs(unsigned long ms) { delay(ms); }

void runAlert() {
  unsigned long start = millis();

  // Phase 1: double pulse, 500 ms delay, for 10 s
  while (millis() - start < PHASE_MS) {
    setOutputs(true);  waitMs(PULSE_ON_MS);
    setOutputs(false); waitMs(PULSE_GAP_MS);
    setOutputs(true);  waitMs(PULSE_ON_MS);
    setOutputs(false); waitMs(DOUBLE_DELAY_MS);
  }

  // Phase 2: single pulse, 1000 ms delay, for 10 s
  start = millis();
  while (millis() - start < PHASE_MS) {
    setOutputs(true);  waitMs(SINGLE_ON_MS);
    setOutputs(false); waitMs(SINGLE_DELAY_MS);
  }

  setOutputs(false);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  setOutputs(false);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  mpuWrite(0x6B, 0x00);  // wake up MPU6050
  mpuWrite(0x1C, 0x10);  // accel range +/-8g
  mpuWrite(0x1A, 0x03);  // digital low-pass filter ~44Hz
  delay(100);

  connectWiFi();

  if (TEST_SEND_ON_BOOT) {
    delay(5000);
    sendFallEvent();
  }

  // Short startup blink so you know it's alive
  setOutputs(true); delay(200); setOutputs(false);
  Serial.println("Fall detector ready");
}

void loop() {
  float ax, ay, az;
  if (!readAccelG(ax, ay, az)) {
    delay(10);
    return;
  }

  float mag = sqrtf(ax * ax + ay * ay + az * az);
    // ---- Live MPU6050 readout (every 100 ms) ----
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint >= 100) {
    lastPrint = millis();
    Serial.printf("ax:%.2f ay:%.2f az:%.2f mag:%.2f\n", ax, ay, az, mag);
  }
  unsigned long now = millis();

  // Stage 1: detect sustained free-fall
  if (mag < FREEFALL_G) {
    if (!inFreefall) {
      inFreefall = true;
      freefallStart = now;
    } else if (now - freefallStart >= FREEFALL_MIN_MS) {
      freefallSeenAt = now;   // confirmed free-fall
    }
  } else {
    inFreefall = false;
  }

  // Stage 2: impact shortly after free-fall = fall
  if (mag > IMPACT_G && freefallSeenAt != 0 &&
      (now - freefallSeenAt) <= IMPACT_WINDOW_MS) {
    Serial.println("FALL DETECTED!");
    freefallSeenAt = 0;
    inFreefall = false;
    sendFallEvent();
    runAlert();
  }

  // Expire stale free-fall flag
  if (freefallSeenAt != 0 && (now - freefallSeenAt) > IMPACT_WINDOW_MS) {
    freefallSeenAt = 0;
  }

  delay(5);  // ~200 Hz sampling
}
