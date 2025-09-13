const http = require("http");
const app = require("./src/app");
const PORT = process.env.PORT || 3000;
http.createServer(app).listen(PORT, () => {
  console.log(`Ameth API listening on :${PORT}`);
});
