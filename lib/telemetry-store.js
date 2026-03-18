let telemetry = {
  predictedTemperature: 95.23,
  probes: [
    { id: 1, label: "Probe 1", value: 95.23 },
    { id: 2, label: "Probe 2", value: 95.23 },
    { id: 3, label: "Probe 3", value: 95.23 },
    { id: 4, label: "Probe 4", value: 95.23 }
  ],
  updatedAt: new Date().toISOString()
};

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function normalizeProbe(probe, index) {
  const scalarValue = pickNumber(probe);
  if (scalarValue !== undefined) {
    return {
      id: index + 1,
      label: `Probe ${index + 1}`,
      value: scalarValue
    };
  }

  if (probe && typeof probe === "object") {
    return {
      id: probe.id ?? index + 1,
      label: probe.label ?? probe.name ?? probe.title ?? `Probe ${index + 1}`,
      value: pickNumber(probe.value, probe.temperature, probe.real, probe.realValue, probe.actual)
        ?? telemetry.probes[index]?.value
        ?? 0
    };
  }

  return {
    id: index + 1,
    label: `Probe ${index + 1}`,
    value: telemetry.probes[index]?.value ?? 0
  };
}

function normalizeProbes(nextData) {
  const raw =
    nextData.probes
    ?? nextData.realValues
    ?? nextData.realValue
    ?? nextData.real
    ?? nextData.actualValues
    ?? nextData.actualValue
    ?? nextData.actual;

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(normalizeProbe);
  }

  const singleValue = pickNumber(raw);
  if (singleValue !== undefined) {
    return [
      {
        id: 1,
        label: "Real Value",
        value: singleValue
      }
    ];
  }

  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([label, value], index) => ({
      id: index + 1,
      label,
      value: pickNumber(value?.value, value?.temperature, value?.real, value?.actual, value) ?? 0
    }));
  }

  return telemetry.probes;
}

function updateTelemetry(nextData) {
  telemetry = {
    predictedTemperature:
      pickNumber(
        nextData.predictedTemperature,
        nextData.predicted,
        nextData.predictedValue,
        nextData.prediction
      ) ?? telemetry.predictedTemperature,
    probes: normalizeProbes(nextData),
    updatedAt: new Date().toISOString()
  };

  return telemetry;
}

function getTelemetry() {
  return telemetry;
}

module.exports = {
  getTelemetry,
  updateTelemetry
};
