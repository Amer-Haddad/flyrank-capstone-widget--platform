const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.WIDGET_TEST_PORT || 5501);
const testPage = path.resolve(__dirname, "..", "widget-test.html");

const server = http.createServer((req, res) => {
  if (req.url !== "/" && req.url !== "/widget-test.html") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(testPage, (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Unable to load widget test page");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`Widget test page is running at http://localhost:${port}/widget-test.html`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
