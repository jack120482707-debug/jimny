const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 8000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function send(response, status, body, type = "text/plain; charset=utf-8") {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const cleanPath = decodeURIComponent(url.pathname);
  const relativePath = cleanPath === "/" ? "/app/index.html" : cleanPath;
  const filePath = path.resolve(root, `.${relativePath}`);

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError) {
      send(response, 404, "Not found");
      return;
    }

    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        send(response, 404, "Not found");
        return;
      }

      const type = mimeTypes[path.extname(finalPath).toLowerCase()] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": type });
      response.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Jimny DB App is running at http://localhost:${port}/app/`);
});
