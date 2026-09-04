const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const commandPort = process.argv.indexOf("--port");
const portArgument = commandPort >= 0 ? process.argv[commandPort + 1] : null;
const port = Number(portArgument || process.env.WIDGET_TEST_PORT || 5500);
const rootDirectory = path.resolve(__dirname, "..");

const server = http.createServer((req, res) => {
  const requestedPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const relativePath = requestedPath === "/" ? "widget-test.html" : requestedPath.slice(1);
  const filePath = path.resolve(rootDirectory, relativePath);
  if (!filePath.startsWith(rootDirectory) || !["widget-test.html", "admin.html", "public.html"].includes(relativePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  fs.readFile(filePath, (error, content) => {
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
