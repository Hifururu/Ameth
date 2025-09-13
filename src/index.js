const express = require("express");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// Logger sencillo
const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(logDir, "app.log"), line);
};

// Body parser JSON
app.use(express.json());

// Rutas Google (opcional)
try {
  const googleRouter = require("./google");
  app.use(googleRouter);
  console.log("Google routes ready.");
} catch (e) {
  console.warn("Google routes not loaded:", e.message);
}

// Rutas Finanzas (Kyaru)
try {
  const finRouter = require("./expenses");
  app.use(finRouter);
  console.log("Finance routes ready.");
} catch (e) {
  console.warn("Finance routes not loaded:", e.message);
}

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ameth-api", env: process.env.AMETH_ENV || "unknown" });
});

// Start
app.listen(port, () => {
  log(`AMETH API escuchando en http://localhost:${port}`);
  console.log(`AMETH API escuchando en http://localhost:${port}`);
});
