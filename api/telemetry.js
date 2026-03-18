const { getTelemetry, updateTelemetry } = require("../lib/telemetry-store");

// ← Replace with your ngrok URL each time you restart ngrok
const ESP32_URL = "https://abc123.ngrok-free.app";

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") return JSON.parse(body);
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  return body;
}

// Fetch from ESP32 and reformat to match dashboard shape
async function fetchFromESP32() {
  const res = await fetch(`${ESP32_URL}/api/data`, {
    headers: { "ngrok-skip-browser-warning": "true" }, // skip ngrok browser warning page
    signal: AbortSignal.timeout(4000) // 4s timeout
  });

  if (!res.ok) throw new Error(`ESP32 returned ${res.status}`);
  const data = await res.json();

  // Reformat ESP32 shape → dashboard shape
  return {
    predictedTemperature: data.predicted_temp ?? 0,
    probes: (data.ntc_probes ?? []).map(p => ({
      id: p.probe,
      label: `Probe ${p.probe}`,
      value: p.temperature
    })),
    veml6030: data.veml6030,   // bonus — available if you want it later
    sht30: data.sht30,         // bonus — available if you want it later
    updatedAt: new Date().toISOString()
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    try {
      // Try ESP32 first, fall back to stored telemetry
      const espData = await fetchFromESP32();
      updateTelemetry(espData);       // keep store in sync
      res.status(200).json(espData);
    } catch (err) {
      // ESP32 unreachable → return last known values
      console.warn("ESP32 unreachable, using stored telemetry:", err.message);
      res.status(200).json(getTelemetry());
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = parseBody(req.body);
      const nextTelemetry = updateTelemetry(payload);
      res.status(200).json({ ok: true, telemetry: nextTelemetry });
    } catch (error) {
      res.status(400).json({ error: "Invalid payload", details: error.message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};