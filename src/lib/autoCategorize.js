const { categorizeText } = require("./ruleEngine");

// Combina campos típicos de una transacción
function categorizeTransaction(tx = {}) {
  const text = [
    tx.merchant,
    tx.description,
    tx.notes,
    tx.categoryHint,   // por si traes hint de tu fuente
  ].filter(Boolean).join(" ");
  const r = categorizeText(text);
  return { ...r, input: text };
}

// Combina campos típicos de un email
function categorizeEmail(email = {}) {
  const text = [
    email.subject,
    email.snippet,
    email.from,
  ].filter(Boolean).join(" ");
  const r = categorizeText(text);
  return { ...r, input: text };
}

module.exports = { categorizeTransaction, categorizeEmail };
