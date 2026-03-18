const { getTelemetry, updateTelemetry } = require("../lib/telemetry-store");

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString("utf8"));
  }

  return body;
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(getTelemetry());
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
