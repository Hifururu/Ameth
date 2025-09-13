module.exports = function apiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (key !== "mi-super-clave") {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
};
