const express = require("express");
const bodyParser = require("body-parser");
const apiKey = require("./src/lib/apiKey");

const financeRoutes = require("./src/routes/finance.demo");
const gmailRoutes = require("./src/routes/gmail");
const rulesRoutes = require("./src/routes/rules");
const categorizeRoutes = require("./src/routes/categorize");
const oauthRoutes = require("./src/routes/oauth");

const app = express();
app.use(bodyParser.json());

// ✅ Middleware API key aplicado SOLO a rutas protegidas
app.use((req, res, next) => {
  if (req.path.startsWith("/oauth2/")) {
    return next(); // estas son públicas
  }
  return apiKey(req, res, next);
});

// Rutas
app.use("/finance", financeRoutes);
app.use("/gmail", gmailRoutes);
app.use("/rules", rulesRoutes);
app.use("/categorize", categorizeRoutes);
app.use("/oauth2", oauthRoutes);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "Ameth API" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ameth API listening on :${port}`);
});
