const express = require("express");
const bodyParser = require("body-parser");
const apiKey = require("./src/lib/apiKey");

const financeRoutes = require("./src/routes/finance");
const gmailRoutes   = require("./src/routes/gmail");       // ✅ usa el nuevo router
const rulesRoutes   = require("./src/routes/rules");
const categorizeRoutes = require("./src/routes/categorize");
const oauthRoutes      = require("./src/routes/oauth");

const app = express();
app.use(bodyParser.json());

// ✅ /oauth2/* es público; el resto requiere x-api-key
app.use((req, res, next) => {
  if (req.path.startsWith("/oauth2/")) return next();
  return apiKey(req, res, next);
});

// Rutas
app.use("/finance", financeRoutes);
app.use("/gmail",   gmailRoutes);
app.use("/rules",   rulesRoutes);
app.use("/categorize", categorizeRoutes);
app.use("/oauth2",     oauthRoutes);

// Ping
app.get("/", (req, res) => {
  res.json({ ok: true, service: "Ameth API" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Ameth API listening on :${port}`));
