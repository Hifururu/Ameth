const express = require("express");
const app = express();

app.use(express.json());

// API key
const apiKey = require("./lib/apiKey");
app.use(apiKey);

// Rutas
app.use("/rules", require("./routes/rules"));
app.use("/categorize", require("./routes/categorize"));

app.get("/", (_req, res) => res.json({ ok: true, service: "Ameth API" }));

module.exports = app;
app.use("/finance", require("./routes/finance.demo"));
app.use("/gmail", require("./routes/gmail.demo"));
