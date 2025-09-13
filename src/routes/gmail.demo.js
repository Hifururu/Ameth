const express = require("express");
const { categorizeEmail } = require("../lib/autoCategorize");
const router = express.Router();

/** POST /gmail/demo
 * body: { subject?, snippet?, from? }
 */
router.post("/demo", (req, res) => {
  const email = req.body || {};
  const cat = categorizeEmail(email);
  res.json({ ok: true, email, category: cat.category, ruleId: cat.ruleId, matchedKeywords: cat.matchedKeywords });
});

module.exports = router;
