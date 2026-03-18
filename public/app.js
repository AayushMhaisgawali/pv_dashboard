const app = document.getElementById("app");
const DEFAULT_API_URL = "/api/telemetry";

const state = {
  telemetry: {
    headlineLabel: "Predicted Temperature",
    headlineValue: 0,
    probes: [],
    humidity: null,
    lux: null,
    updatedAt: null,
    sourceType: "telemetry"
  },
  connectionState: "waiting",
  pollingStarted: false,
  apiUrl: localStorage.getItem("espApiUrl") || DEFAULT_API_URL
};

function formatTemperature(value) {
  return `${Number(value ?? 0).toFixed(2)}°C`;
}

function formatNumber(value, unit = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(2)}${unit}`;
}

function formatUpdatedAt(value) {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDefaultProbes() {
  return [
    { id: 1, label: "Probe 1", value: 0 },
    { id: 2, label: "Probe 2", value: 0 },
    { id: 3, label: "Probe 3", value: 0 },
    { id: 4, label: "Probe 4", value: 0 }
  ];
}

function probeCard(probe) {
  return `
    <article class="probe-card card">
      <p class="metric-label">${escapeHtml(probe.label)}</p>
      <h2 class="metric-value">${formatTemperature(probe.value)}</h2>
    </article>
  `;
}

function normalizeEspData(data) {
  const probes = Array.isArray(data.ntc_probes)
    ? data.ntc_probes.map((probe, index) => ({
        id: probe.probe ?? index + 1,
        label: `Probe ${probe.probe ?? index + 1}`,
        value: Number(probe.temperature ?? 0)
      }))
    : getDefaultProbes();

  return {
    headlineLabel: "SHT30 Temperature",
    headlineValue: Number(data.sht30?.temperature ?? 0),
    probes,
    humidity: Number(data.sht30?.humidity ?? 0),
    lux: Number(data.veml6030?.lux ?? 0),
    updatedAt: new Date().toISOString(),
    sourceType: "esp"
  };
}

function normalizeTelemetryData(data) {
  return {
    headlineLabel: "Predicted Temperature",
    headlineValue: Number(data.predictedTemperature ?? 0),
    probes: Array.isArray(data.probes) ? data.probes : getDefaultProbes(),
    humidity: data.humidity ?? null,
    lux: data.lux ?? null,
    updatedAt: data.updatedAt || new Date().toISOString(),
    sourceType: "telemetry"
  };
}

function applyIncomingData(data) {
  const normalized = Array.isArray(data?.ntc_probes) || data?.sht30 || data?.veml6030
    ? normalizeEspData(data)
    : normalizeTelemetryData(data);

  state.telemetry = normalized;
  state.connectionState = "live";
  render();
}

function render() {
  const probes = state.telemetry.probes.length ? state.telemetry.probes : getDefaultProbes();
  const liveClass = state.connectionState === "live" ? "live" : "waiting";
  const liveText = state.connectionState === "live" ? "Connected to ESP API" : "Waiting for ESP API";

  app.innerHTML = `
    <main class="dashboard-shell">
      <header class="dashboard-header">
        <div class="brand">
          <span class="brand-mark"></span>
          <div class="brand-copy">
            <h1>Solar PV Monitoring Dashboard</h1>
            <p>Live dashboard for XIAO ESP32S3 sensor API</p>
          </div>
        </div>
        <div class="header-status">
          <span class="status-pill ${liveClass}">${liveText}</span>
          <span class="status-pill">Updated ${formatUpdatedAt(state.telemetry.updatedAt)}</span>
        </div>
      </header>

      <section class="hero-card card">
        <p class="metric-label">${escapeHtml(state.telemetry.headlineLabel)}</p>
        <h2 class="metric-value">${formatTemperature(state.telemetry.headlineValue)}</h2>
        <p class="metric-subtext">Polling <code>${escapeHtml(state.apiUrl)}</code> for live sensor values.</p>
      </section>

      <section class="probe-grid">
        ${probes.map(probeCard).join("")}
      </section>

      <section class="info-row">
        <article class="info-panel">
          <h2>ESP Connection</h2>
          <p>Enter your XIAO API URL below. Based on your firmware, it should look like <code>http://ESP-IP/api/data</code>.</p>
          <form id="endpointForm" class="endpoint-form">
            <label class="full-width">
              ESP API URL
              <input type="text" name="apiUrl" value="${escapeHtml(state.apiUrl)}" placeholder="http://192.168.1.50/api/data" />
            </label>
            <button type="submit">Save Endpoint</button>
          </form>
          <div class="meta-grid">
            <div class="meta-chip">
              <span>Humidity</span>
              <strong>${formatNumber(state.telemetry.humidity, "%RH")}</strong>
            </div>
            <div class="meta-chip">
              <span>Lux</span>
              <strong>${formatNumber(state.telemetry.lux, " lx")}</strong>
            </div>
            <div class="meta-chip">
              <span>Source</span>
              <strong>${state.telemetry.sourceType === "esp" ? "ESP /api/data" : "Local telemetry API"}</strong>
            </div>
            <div class="meta-chip">
              <span>Probe Count</span>
              <strong>${probes.length} Sensors</strong>
            </div>
          </div>
        </article>

        <article class="info-panel">
          <h2>Write Test Values</h2>
          <p>This uses your ESP server's <code>PUT /api/data</code> when the endpoint points to the XIAO, so you can test the live UI without changing firmware.</p>
          <form id="demoForm" class="demo-form">
            <label>
              SHT30 Temperature
              <input type="number" step="0.01" name="headlineValue" value="${state.telemetry.headlineValue || 0}" />
            </label>
            <label>
              Humidity
              <input type="number" step="0.01" name="humidity" value="${state.telemetry.humidity ?? 0}" />
            </label>
            <label>
              Lux
              <input type="number" step="0.01" name="lux" value="${state.telemetry.lux ?? 0}" />
            </label>
            ${probes
              .map(
                (probe, index) => `
                  <label>
                    ${escapeHtml(probe.label)}
                    <input type="number" step="0.01" name="probe${index + 1}" value="${Number(probe.value ?? 0)}" />
                  </label>
                `
              )
              .join("")}
            <button class="full" type="submit">Send Test Values</button>
          </form>
          <p class="footer-note">Your firmware already allows CORS, so the browser can read and write to the ESP directly on the same network.</p>
        </article>
      </section>
    </main>
  `;

  const endpointForm = document.getElementById("endpointForm");
  if (endpointForm) {
    endpointForm.addEventListener("submit", onSubmitEndpointForm);
  }

  const demoForm = document.getElementById("demoForm");
  if (demoForm) {
    demoForm.addEventListener("submit", onSubmitDemoForm);
  }
}

async function loadTelemetry() {
  try {
    const response = await fetch(state.apiUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    applyIncomingData(data);
  } catch (error) {
    state.connectionState = "waiting";
    render();
  }
}

async function onSubmitEndpointForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const apiUrl = String(formData.get("apiUrl") || "").trim() || DEFAULT_API_URL;
  state.apiUrl = apiUrl;
  localStorage.setItem("espApiUrl", apiUrl);
  state.connectionState = "waiting";
  render();
  await loadTelemetry();
}

function createEspWritePayload(formData, probeCount) {
  return {
    ntc_probes: Array.from({ length: probeCount }, (_, index) => Number(formData.get(`probe${index + 1}`))),
    lux: Number(formData.get("lux")),
    sht_temp: Number(formData.get("headlineValue")),
    sht_humidity: Number(formData.get("humidity"))
  };
}

function createLocalWritePayload(formData, probes) {
  return {
    predictedTemperature: Number(formData.get("headlineValue")),
    humidity: Number(formData.get("humidity")),
    lux: Number(formData.get("lux")),
    probes: probes.map((probe, index) => ({
      id: probe.id ?? index + 1,
      label: probe.label ?? `Probe ${index + 1}`,
      value: Number(formData.get(`probe${index + 1}`))
    }))
  };
}

async function onSubmitDemoForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const probes = state.telemetry.probes.length ? state.telemetry.probes : getDefaultProbes();
  const useEspEndpoint = state.apiUrl.includes("/api/data");
  const payload = useEspEndpoint
    ? createEspWritePayload(formData, probes.length)
    : createLocalWritePayload(formData, probes);

  const response = await fetch(state.apiUrl, {
    method: useEspEndpoint ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    await loadTelemetry();
  }
}

function startPolling() {
  if (state.pollingStarted) {
    return;
  }

  state.pollingStarted = true;
  loadTelemetry();
  setInterval(loadTelemetry, 3000);
}

render();
startPolling();
