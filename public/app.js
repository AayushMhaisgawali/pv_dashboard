const app = document.getElementById("app");

const state = {
  telemetry: {
    predictedTemperature: 0,
    probes: [],
    updatedAt: null
  },
  connectionState: "waiting",
  pollingStarted: false
};

function formatTemperature(value) {
  return `${Number(value ?? 0).toFixed(2)}°C`;
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

function probeCard(probe) {
  return `
    <article class="probe-card card">
      <p class="metric-label">${escapeHtml(probe.label)}</p>
      <h2 class="metric-value">${formatTemperature(probe.value)}</h2>
    </article>
  `;
}

function render() {
  const probes = state.telemetry.probes.length
    ? state.telemetry.probes
    : [
        { id: 1, label: "Probe 1", value: 0 },
        { id: 2, label: "Probe 2", value: 0 },
        { id: 3, label: "Probe 3", value: 0 },
        { id: 4, label: "Probe 4", value: 0 }
      ];

  const liveClass = state.connectionState === "live" ? "live" : "waiting";
  const liveText = state.connectionState === "live" ? "Connected to API" : "Waiting for API updates";

  app.innerHTML = `
    <main class="dashboard-shell">
      <header class="dashboard-header">
        <div class="brand">
          <span class="brand-mark"></span>
          <div class="brand-copy">
            <h1>Solar PV Monitoring Dashboard</h1>
            <p>Hosted-ready dashboard for ESP XIAO input</p>
          </div>
        </div>
        <div class="header-status">
          <span class="status-pill ${liveClass}">${liveText}</span>
          <span class="status-pill">Updated ${formatUpdatedAt(state.telemetry.updatedAt)}</span>
        </div>
      </header>

      <section class="hero-card card">
        <p class="metric-label">Predicted Temperature</p>
        <h2 class="metric-value">${formatTemperature(state.telemetry.predictedTemperature)}</h2>
        <p class="metric-subtext">This tile refreshes automatically from the hosted telemetry API.</p>
      </section>

      <section class="probe-grid">
        ${probes.map(probeCard).join("")}
      </section>

      <section class="info-row">
        <article class="info-panel">
          <h2>Deployment Mode</h2>
          <p>This version is optimized for Vercel: static frontend plus polling to <code>/api/telemetry</code>. Your ESP can POST predicted and real values directly to that endpoint.</p>
          <div class="meta-grid">
            <div class="meta-chip">
              <span>Predicted</span>
              <strong>${formatTemperature(state.telemetry.predictedTemperature)}</strong>
            </div>
            <div class="meta-chip">
              <span>Visible Values</span>
              <strong>${probes.length} Tiles</strong>
            </div>
            <div class="meta-chip">
              <span>Accepted Fields</span>
              <strong>predicted, real, probes</strong>
            </div>
            <div class="meta-chip">
              <span>Last Update</span>
              <strong>${formatUpdatedAt(state.telemetry.updatedAt)}</strong>
            </div>
          </div>
        </article>

        <article class="info-panel">
          <h2>Quick Test Values</h2>
          <p>Use this panel to simulate ESP readings before wiring the board.</p>
          <form id="demoForm" class="demo-form">
            <label>
              Predicted Temperature
              <input type="number" step="0.01" name="predictedTemperature" value="${state.telemetry.predictedTemperature || 0}" />
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
            <button class="full" type="submit">Push Demo Data</button>
          </form>
          <p class="footer-note">If you later want true persistent hosted data, we should add a database or KV store.</p>
        </article>
      </section>
    </main>
  `;

  const demoForm = document.getElementById("demoForm");
  if (demoForm) {
    demoForm.addEventListener("submit", onSubmitDemoForm);
  }
}

function applyTelemetry(data) {
  state.telemetry = {
    predictedTemperature: Number(data.predictedTemperature ?? 0),
    probes: Array.isArray(data.probes) ? data.probes : [],
    updatedAt: data.updatedAt || null
  };
  state.connectionState = "live";
  render();
}

async function loadTelemetry() {
  try {
    const response = await fetch("/api/telemetry", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    applyTelemetry(data);
  } catch (error) {
    state.connectionState = "waiting";
    render();
  }
}

async function onSubmitDemoForm(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const probes = state.telemetry.probes.length
    ? state.telemetry.probes
    : [
        { id: 1, label: "Probe 1", value: 0 },
        { id: 2, label: "Probe 2", value: 0 },
        { id: 3, label: "Probe 3", value: 0 },
        { id: 4, label: "Probe 4", value: 0 }
      ];

  const payload = {
    predictedTemperature: Number(formData.get("predictedTemperature")),
    probes: probes.map((probe, index) => ({
      id: probe.id ?? index + 1,
      label: probe.label ?? `Probe ${index + 1}`,
      value: Number(formData.get(`probe${index + 1}`))
    }))
  };

  const response = await fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    const data = await response.json();
    applyTelemetry(data.telemetry);
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
