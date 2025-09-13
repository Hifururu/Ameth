const express = require("express");
const { categorizeText } = require("../lib/ruleEngine");
const router = express.Router();

/**
 * POST /categorize
 * body: { text: string }
 */
router.post("/", (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text (string) is required" });
  }
  const result = categorizeText(text);
  res.json({ input: text, ...result });
});

module.exports = router;
router.post("/batch", (req, res) => {
  const { texts } = req.body || {};
  if (!Array.isArray(texts)) {
    return res.status(400).json({ error: "texts (string[]) is required" });
  }
  const { categorizeText } = require("../lib/ruleEngine");
  const out = texts.map(t => {
    const s = String(t ?? "");
    const r = categorizeText(s);
    return { input: s, ...r };
  });
  res.json(out);
});
