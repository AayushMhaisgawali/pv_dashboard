const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { getTelemetry, updateTelemetry } = require("./lib/telemetry-store");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const clients = new Set();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(payload));
}

function sendEvent(client, data) {
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastTelemetry(data) {
  for (const client of clients) {
    sendEvent(client, data);
  }
}

function serveFile(res, pathname) {
  const targetPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(targetPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };

    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/telemetry") {
    sendJson(res, 200, getTelemetry());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/telemetry") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const nextTelemetry = updateTelemetry(parsed);
        broadcastTelemetry(nextTelemetry);
        sendJson(res, 200, { ok: true, telemetry: nextTelemetry });
      } catch (error) {
        sendJson(res, 400, { error: "Invalid JSON payload" });
      }
    });

    return;
  }

  if (req.method === "GET" && url.pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    res.write("\n");
    clients.add(res);
    sendEvent(res, getTelemetry());

    req.on("close", () => {
      clients.delete(res);
    });

    return;
  }

  serveFile(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Solar PV dashboard running at http://localhost:${PORT}`);
});
