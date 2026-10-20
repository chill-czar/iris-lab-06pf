const { describe, test, expect, beforeAll, afterAll } = require("bun:test");
const http = require("http");
const { handleRequest } = require("../src/index");

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(handleRequest);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("API & Server Endpoints", () => {
  test("GET /health returns { ok: true }", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  test("GET /api/health alias returns { ok: true }", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  test("GET / serves the interactive HTML calculator UI", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Simple Calculator");
    expect(html).toContain("main-display");
    expect(html).toContain("keypad");
    expect(html).not.toContain("Scaffold is running");
  });

  test("POST /api/calculate with expression evaluates correctly", async () => {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expr: "15 * (4 + 6) / 2" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result).toBe(75);
    expect(json.expression).toBe("15 * (4 + 6) / 2");
  });

  test("POST /api/calculate with a, op, b evaluates correctly", async () => {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 12.5, op: "*", b: 4 }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.result).toBe(50);
  });

  test("POST /api/calculate returns 400 on division by zero", async () => {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expr: "10 / 0" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("Cannot divide by zero");
  });

  test("POST /api/calculate returns 400 on invalid expression", async () => {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expr: "abc + 12" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  test("OPTIONS /api/calculate responds with CORS headers", async () => {
    const res = await fetch(`${baseUrl}/api/calculate`, {
      method: "OPTIONS",
    });
    expect(res.status).toBe(204);
  });

  test("GET /nonexistent returns 404 JSON", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
