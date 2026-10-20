const http = require("http");
const { evaluateExpression, calculateBasic } = require("./calculator");

const port = Number(process.env.PORT || 3000);

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Request payload too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url || "/", "http://127.0.0.1");
  const { pathname } = parsedUrl;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Health endpoint
  if (pathname === "/health" || pathname === "/api/health") {
    return sendJson(res, 200, { ok: true });
  }

  // API endpoints
  if (pathname === "/api/calculate" && req.method === "POST") {
    try {
      const payload = await parseJsonBody(req);
      if (payload.expr !== undefined) {
        const result = evaluateExpression(String(payload.expr));
        return sendJson(res, 200, {
          ok: true,
          expression: String(payload.expr),
          result,
        });
      }

      if (payload.a !== undefined && payload.op !== undefined && payload.b !== undefined) {
        const result = calculateBasic(payload.a, payload.op, payload.b);
        return sendJson(res, 200, {
          ok: true,
          expression: `${payload.a} ${payload.op} ${payload.b}`,
          result,
        });
      }

      return sendJson(res, 400, {
        ok: false,
        error: "Missing required 'expr' or ('a', 'op', 'b') parameters",
      });
    } catch (err) {
      return sendJson(res, 400, {
        ok: false,
        error: err.message || "Failed to evaluate calculation",
      });
    }
  }

  // HTML page served at /
  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderCalculatorHtml());
    return;
  }

  // 404
  sendJson(res, 404, { ok: false, error: "Not found" });
}

function renderCalculatorHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simple Calculator</title>
</head>
<body>
  <h1>Simple Calculator</h1>
</body>
</html>`;
}

let server;
if (require.main === module || process.env.NODE_ENV !== "test") {
  server = http.createServer(handleRequest);
  server.listen(port, "0.0.0.0", () => {
    console.log("listening on :" + port);
  });
}

module.exports = {
  handleRequest,
  server,
  renderCalculatorHtml,
};
