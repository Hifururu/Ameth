const express = require("express");
const { customAlphabet } = require("nanoid");
const { loadStore, saveStore } = require("../lib/ruleEngine");

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
const router = express.Router();

/* ---------- CRUD básico ---------- */

router.get("/", (_req, res) => {
  const store = loadStore();
  res.json(store);
});

function sanitizeMode(mode) {
  return ["substring", "word", "regex"].includes(mode) ? mode : "substring";
}

router.post("/", (req, res) => {
  const b = req.body || {};
  const rule = {
    id: b.id || nano(),
    name: b.name || "unnamed",
    category: b.category || "uncategorized",
    keywords: Array.isArray(b.keywords) ? b.keywords : [],
    match: b.match === "all" ? "all" : "any",
    matchMode: sanitizeMode(b.matchMode),
    enabled: b.enabled !== false,
    priority: Number.isFinite(b.priority) ? b.priority : 0,
  };

  const store = loadStore();
  if (store.rules.find(r => r.id === rule.id)) {
    return res.status(409).json({ error: "id already exists" });
  }
  store.rules.push(rule);
  saveStore(store);
  res.status(201).json(rule);
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const store = loadStore();
  const idx = store.rules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });

  const prev = store.rules[idx];
  const b = req.body || {};
  const updated = {
    ...prev,
    name: b.name ?? prev.name,
    category: b.category ?? prev.category,
    keywords: Array.isArray(b.keywords) ? b.keywords : prev.keywords,
    match: b.match === "all" || b.match === "any" ? b.match : prev.match,
    matchMode: b.matchMode ? sanitizeMode(b.matchMode) : (prev.matchMode || "substring"),
    enabled: typeof b.enabled === "boolean" ? b.enabled : prev.enabled,
    priority: Number.isFinite(b.priority) ? b.priority : prev.priority,
  };

  store.rules[idx] = updated;
  saveStore(store);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const store = loadStore();
  const before = store.rules.length;
  store.rules = store.rules.filter(r => r.id !== id);
  if (store.rules.length === before) return res.status(404).json({ error: "not found" });
  saveStore(store);
  res.status(204).end();
});

/* ---------- Export / Import ---------- */

router.get("/export", (_req, res) => {
  const store = loadStore();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rules.export.json"`);
  res.status(200).send(JSON.stringify(store, null, 2));
});

router.post("/import", (req, res) => {
  const b = req.body || {};
  const incoming = Array.isArray(b.rules) ? b.rules : [];
  const replace = b.replace === true;

  const store = loadStore();
  if (replace) store.rules = [];

  let added = 0, updated = 0;
  for (const r of incoming) {
    if (!r || !r.id) continue;
    const idx = store.rules.findIndex(x => x.id === r.id);
    const cleaned = {
      id: r.id,
      name: r.name || "unnamed",
      category: r.category || "uncategorized",
      keywords: Array.isArray(r.keywords) ? r.keywords : [],
      match: r.match === "all" ? "all" : "any",
      matchMode: sanitizeMode(r.matchMode),
      enabled: r.enabled !== false,
      priority: Number.isFinite(r.priority) ? r.priority : 0,
    };
    if (idx >= 0) {
      store.rules[idx] = { ...store.rules[idx], ...cleaned };
      updated++;
    } else {
      store.rules.push(cleaned);
      added++;
    }
  }

  saveStore(store);
  res.json({ ok: true, added, updated, total: store.rules.length });
});

/* ---------- Diagnóstico ---------- */

router.post("/test/:id", (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text (string) is required" });
  }

  const store = loadStore();
  const rule = store.rules.find(r => r.id === id);
  if (!rule) return res.status(404).json({ error: "rule not found" });

  const norm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const corpus = norm(text);
  const kws = (rule.keywords || []).filter(Boolean);

  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function hit(kw, mode) {
    const k = norm(kw);
    switch (mode) {
      case "word":  return new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(corpus);
      case "regex": try { return new RegExp(kw, "i").test(corpus); } catch { return false; }
      default:      return corpus.includes(k);
    }
  }

  const mode = sanitizeMode(rule.matchMode);
  const present = kws.filter(k => hit(k, mode)).map(k => norm(k));
  const missing = kws.filter(k => !hit(k, mode)).map(k => norm(k));
  const ok = rule.match === "all" ? missing.length === 0 : present.length > 0;

  res.json({
    ok,
    rule: { id: rule.id, name: rule.name, match: rule.match, matchMode: mode, priority: rule.priority },
    input: text,
    presentKeywords: present,
    missingKeywords: missing
  });
});

module.exports = router;
