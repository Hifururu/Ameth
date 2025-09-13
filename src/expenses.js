const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const DATA_PATH = path.join(__dirname, "..", "data", "expenses.json");

function loadAll() {
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]");
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const clean = raw.replace(/^\uFEFF/, "").trim(); // quita BOM si existe
  try {
    const arr = JSON.parse(clean || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    // si está corrupto, lo repara
    fs.writeFileSync(DATA_PATH, "[]");
    return [];
  }
}
function saveAll(arr) { fs.writeFileSync(DATA_PATH, JSON.stringify(arr, null, 2)); }

// ===== Diagnóstico (sin API key) =====
router.get("/finance/debug", (_req, res) => {
  const envKey = (process.env.AMETH_API_KEY || "").toString();
  res.json({ envKeyLength: envKey.length, startsWith: envKey.slice(0,3), endsWith: envKey.slice(-3) });
});

// ===== API key robusta =====
function requireApiKey(req, res, next) {
  const envKey = (process.env.AMETH_API_KEY || "").toString().trim();
  const reqKey = (req.headers["x-api-key"] || "").toString().trim();
  if (!envKey || reqKey !== envKey) return res.status(401).json({ error: "invalid_api_key" });
  next();
}

// Listar
router.get("/finance/records", requireApiKey, (_req, res) => res.json(loadAll()));

// Obtener por ID
router.get("/finance/record/:id", requireApiKey, (req, res) => {
  const item = loadAll().find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: "not_found" });
  res.json(item);
});

// Crear
router.post("/finance/record", requireApiKey, (req, res) => {
  const b = req.body || {};
  const required = ["date","concept","category","amount_clp","type"];
  for (const f of required) if (!b[f]) return res.status(400).json({ error: "missing_field", field: f });
  const rec = {
    id: Date.now().toString(),
    date: b.date,
    concept: b.concept,
    category: b.category,
    amount_clp: Number(b.amount_clp) || 0,
    type: b.type, // "gasto" | "ingreso"
    source: b.source || "manual",
    external_id: b.external_id || null,
    created_at: new Date().toISOString()
  };
  const all = loadAll(); all.push(rec); saveAll(all);
  res.status(201).json(rec);
});

// Borrar
router.delete("/finance/record/:id", requireApiKey, (req, res) => {
  const all = loadAll();
  const i = all.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: "not_found" });
  const deleted = all.splice(i, 1)[0]; saveAll(all);
  res.json({ ok: true, deleted });
});

module.exports = router;
router.get("/finance/summary", requireApiKey, (req, res) => {
  const from = (req.query.from || "").toString();     // ej: 2025-09-01
  const to   = (req.query.to   || "").toString();     // ej: 2025-09-30
  const type = (req.query.type || "").toString();     // "gasto" | "ingreso" | ""

  const all = loadAll().filter(r => {
    if (from && (r.date || "") < from) return false;
    if (to   && (r.date || "") > to)   return false;
    if (type && r.type !== type)       return false;
    return true;
  });

  const sum = (arr) => arr.reduce((n, x) => n + (Number(x.amount_clp) || 0), 0);
  const byCat = {};
  for (const r of all) {
    const k = r.category || "sin_categoria";
    byCat[k] = byCat[k] || { category: k, gasto: 0, ingreso: 0 };
    if (r.type === "ingreso") byCat[k].ingreso += Number(r.amount_clp) || 0;
    else byCat[k].gasto += Number(r.amount_clp) || 0;
  }

  const categorias = Object.values(byCat).sort((a,b) =>
    (b.gasto + b.ingreso) - (a.gasto + a.ingreso)
  );

  const totalGastos   = sum(all.filter(r => r.type !== "ingreso"));
  const totalIngresos = sum(all.filter(r => r.type === "ingreso"));
  const balance = totalIngresos - totalGastos;

  res.json({ from, to, totalGastos, totalIngresos, balance, categorias });
});
