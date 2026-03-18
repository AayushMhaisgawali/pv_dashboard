module.exports = (req, res) => {
  res.status(200).json({ ok: true, message: "Use /api/telemetry for reads and writes." });
};
