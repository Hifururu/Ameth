const express = require("express");
const { categorizeTransaction } = require("../lib/autoCategorize");
const router = express.Router();

/** POST /finance/demo
 * body: { merchant?, description?, notes?, categoryHint? }
 */
router.post("/demo", (req, res) => {
  const tx = req.body || {};
  const cat = categorizeTransaction(tx);
  res.json({ ok: true, tx, category: cat.category, ruleId: cat.ruleId, matchedKeywords: cat.matchedKeywords });
});

module.exports = router;
