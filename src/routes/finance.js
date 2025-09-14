const express = require("express");
const { categorizeText, loadStore } = require("../lib/ruleEngine");

const router = express.Router();

// Helper: arma un texto a partir de campos típicos
function buildText(item = {}) {
  const { description, merchant, notes } = item;
  return [description, merchant, notes].filter(Boolean).join(" | ");
}

// POST /finance/categorize  { description, merchant?, notes? }
router.post("/categorize", (req, res) => {
  const store = loadStore();
  const text = buildText(req.body || {});
  const result = categorizeText(text, store);
  res.json({
    input: req.body || {},
    text,
    category: result.category,
    ruleId: result.ruleId,
    ruleName: result.ruleName,
    matchedKeywords: result.matchedKeywords
  });
});

// POST /finance/bulk  [ { description, merchant?, notes?, amount? }, ... ]
router.post("/bulk", (req, res) => {
  const store = loadStore();
  const arr = Array.isArray(req.body) ? req.body : [];
  const items = arr.map((it) => {
    const text = buildText(it);
    const r = categorizeText(text, store);
    return {
      ...it,
      _text: text,
      _category: r.category,
      _ruleId: r.ruleId,
      _ruleName: r.ruleName,
      _matchedKeywords: r.matchedKeywords
    };
  });
  res.json({ ok: true, total: items.length, items });
});

// POST /finance/summary  [ { description, merchant?, notes?, amount } ]
router.post("/summary", (req, res) => {
  const store = loadStore();
  const arr = Array.isArray(req.body) ? req.body : [];
  const out = {};
  for (const it of arr) {
    const text = buildText(it);
    const r = categorizeText(text, store);
    const cat = r.category || "uncategorized";
    if (!out[cat]) out[cat] = { count: 0, total: 0 };
    out[cat].count += 1;
    const amt = Number(it.amount) || 0;
    out[cat].total += amt;
  }
  res.json({ ok: true, categories: out });
});

module.exports = router;
