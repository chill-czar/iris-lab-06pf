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
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --screen-bg: #0b1120;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --btn-num-bg: #334155;
      --btn-num-hover: #475569;
      --btn-op-bg: #f59e0b;
      --btn-op-hover: #d97706;
      --btn-fn-bg: #475569;
      --btn-fn-hover: #64748b;
      --btn-eq-bg: #10b981;
      --btn-eq-hover: #059669;
      --border-color: #334155;
      --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top, #1e293b, var(--bg));
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text-main);
      padding: 1.5rem 1rem;
    }

    .container {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .calculator {
      background: var(--card-bg);
      border-radius: 1.5rem;
      padding: 1.5rem;
      box-shadow: var(--shadow);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.25rem;
    }

    .title {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-mem {
      display: none;
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      background: #3b82f6;
      color: white;
      font-weight: 700;
    }

    .badge-mem.active {
      display: inline-block;
    }

    .display-box {
      background: var(--screen-bg);
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-end;
      min-height: 96px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
      word-break: break-all;
    }

    .sub-display {
      font-size: 0.95rem;
      color: var(--text-muted);
      min-height: 1.4rem;
      width: 100%;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .main-display {
      font-size: 2.25rem;
      font-weight: 600;
      color: var(--text-main);
      width: 100%;
      text-align: right;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .keypad {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
    }

    .keypad-aux {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    button {
      border: none;
      outline: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--text-main);
      border-radius: 0.85rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s ease;
      user-select: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    button:active {
      transform: scale(0.96);
      filter: brightness(0.9);
    }

    .btn-num {
      background: var(--btn-num-bg);
    }
    .btn-num:hover {
      background: var(--btn-num-hover);
    }

    .btn-op {
      background: var(--btn-op-bg);
      font-weight: 600;
      font-size: 1.35rem;
    }
    .btn-op:hover {
      background: var(--btn-op-hover);
    }

    .btn-fn {
      background: var(--btn-fn-bg);
      font-size: 1.05rem;
    }
    .btn-fn:hover {
      background: var(--btn-fn-hover);
    }

    .btn-mem {
      background: #1e293b;
      border: 1px solid var(--border-color);
      height: 2.2rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .btn-mem:hover {
      background: #334155;
      color: var(--text-main);
    }

    .btn-eq {
      background: var(--btn-eq-bg);
      font-weight: 700;
      font-size: 1.4rem;
    }
    .btn-eq:hover {
      background: var(--btn-eq-hover);
    }

    .btn-clear {
      color: #f87171;
    }

    .history-card {
      background: var(--card-bg);
      border-radius: 1rem;
      border: 1px solid var(--border-color);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .btn-clear-history {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.8rem;
      cursor: pointer;
      height: auto;
      box-shadow: none;
      padding: 0.2rem 0.4rem;
    }
    .btn-clear-history:hover {
      color: #f87171;
      text-decoration: underline;
    }

    .history-list {
      list-style: none;
      max-height: 120px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0.6rem;
      background: var(--screen-bg);
      border-radius: 0.5rem;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .history-item:hover {
      background: #172554;
    }
    .history-item .expr {
      color: var(--text-muted);
    }
    .history-item .res {
      font-weight: 600;
      color: #34d399;
    }

    .empty-history {
      color: var(--text-muted);
      font-size: 0.85rem;
      text-align: center;
      padding: 0.5rem 0;
    }

    .footer {
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .copy-toast {
      position: absolute;
      top: 0.5rem;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: #10b981;
      color: white;
      font-size: 0.75rem;
      padding: 0.25rem 0.65rem;
      border-radius: 1rem;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
    }
    .copy-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <main class="container">
    <div class="calculator" role="region" aria-label="Simple Calculator">
      <div class="header">
        <div class="title">
          <span>Calculator</span>
          <span id="mem-indicator" class="badge-mem">M</span>
        </div>
        <button id="copy-btn" class="btn-mem" style="height:auto; padding:0.25rem 0.5rem;" title="Copy current value">
          📋 Copy
        </button>
      </div>

      <div class="display-box" id="display-container">
        <div id="copy-toast" class="copy-toast">Copied!</div>
        <div id="sub-display" class="sub-display" aria-label="Expression history"></div>
        <div id="main-display" class="main-display" role="status" aria-live="polite">0</div>
      </div>

      <div class="keypad-aux">
        <button class="btn-mem" data-action="mc" title="Memory Clear">MC</button>
        <button class="btn-mem" data-action="mr" title="Memory Recall">MR</button>
        <button class="btn-mem" data-action="m-plus" title="Memory Add">M+</button>
        <button class="btn-mem" data-action="m-minus" title="Memory Subtract">M-</button>
      </div>

      <div class="keypad">
        <button class="btn-fn btn-clear" data-action="clear" aria-label="Clear All">AC</button>
        <button class="btn-fn" data-action="backspace" aria-label="Backspace">⌫</button>
        <button class="btn-fn" data-action="percent" aria-label="Percent">%</button>
        <button class="btn-op" data-action="op" data-value="/" aria-label="Divide">÷</button>

        <button class="btn-num" data-action="num" data-value="7">7</button>
        <button class="btn-num" data-action="num" data-value="8">8</button>
        <button class="btn-num" data-action="num" data-value="9">9</button>
        <button class="btn-op" data-action="op" data-value="*" aria-label="Multiply">×</button>

        <button class="btn-num" data-action="num" data-value="4">4</button>
        <button class="btn-num" data-action="num" data-value="5">5</button>
        <button class="btn-num" data-action="num" data-value="6">6</button>
        <button class="btn-op" data-action="op" data-value="-" aria-label="Subtract">−</button>

        <button class="btn-num" data-action="num" data-value="1">1</button>
        <button class="btn-num" data-action="num" data-value="2">2</button>
        <button class="btn-num" data-action="num" data-value="3">3</button>
        <button class="btn-op" data-action="op" data-value="+" aria-label="Add">+</button>

        <button class="btn-fn" data-action="negate" aria-label="Negate">±</button>
        <button class="btn-num" data-action="num" data-value="0">0</button>
        <button class="btn-num" data-action="decimal" data-value=".">.</button>
        <button class="btn-eq" data-action="calculate" aria-label="Calculate Equals">=</button>
      </div>
    </div>

    <div class="history-card">
      <div class="history-header">
        <span>Recent History</span>
        <button id="clear-history" class="btn-clear-history">Clear</button>
      </div>
      <ul id="history-list" class="history-list">
        <li class="empty-history">No calculations yet</li>
      </ul>
    </div>

    <footer class="footer">
      Keyboard shortcuts enabled (0-9, +, -, *, /, Enter, Backspace, Esc)
    </footer>
  </main>

  <script>
    (function () {
      let currentInput = "0";
      let previousExpression = "";
      let resetOnNextInput = false;
      let memoryValue = 0;
      let history = [];

      const mainDisplay = document.getElementById("main-display");
      const subDisplay = document.getElementById("sub-display");
      const memIndicator = document.getElementById("mem-indicator");
      const copyBtn = document.getElementById("copy-btn");
      const copyToast = document.getElementById("copy-toast");
      const historyList = document.getElementById("history-list");
      const clearHistoryBtn = document.getElementById("clear-history");

      function updateDisplay() {
        mainDisplay.textContent = currentInput;
        subDisplay.textContent = previousExpression;
        if (memoryValue !== 0) {
          memIndicator.classList.add("active");
        } else {
          memIndicator.classList.remove("active");
        }
      }

      function appendDigit(digit) {
        if (resetOnNextInput) {
          currentInput = digit;
          resetOnNextInput = false;
        } else {
          if (currentInput === "0") {
            currentInput = digit;
          } else {
            currentInput += digit;
          }
        }
        updateDisplay();
      }

      function appendDecimal() {
        if (resetOnNextInput) {
          currentInput = "0.";
          resetOnNextInput = false;
          updateDisplay();
          return;
        }
        // Check if current number segment already has a decimal
        const parts = currentInput.split(/[+\\-*\\/]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes(".")) {
          currentInput += ".";
          updateDisplay();
        }
      }

      function appendOperator(op) {
        if (resetOnNextInput) {
          resetOnNextInput = false;
        }
        const lastChar = currentInput.slice(-1);
        if (["+", "-", "*", "/"].includes(lastChar)) {
          currentInput = currentInput.slice(0, -1) + op;
        } else {
          currentInput += op;
        }
        updateDisplay();
      }

      function clearAll() {
        currentInput = "0";
        previousExpression = "";
        resetOnNextInput = false;
        updateDisplay();
      }

      function backspace() {
        if (resetOnNextInput) {
          clearAll();
          return;
        }
        if (currentInput.length > 1) {
          currentInput = currentInput.slice(0, -1);
        } else {
          currentInput = "0";
        }
        updateDisplay();
      }

      function negate() {
        if (currentInput === "0" || currentInput === "Error") return;
        // If it's a simple number
        if (/^-?\\d*\\.?\\d+$/.test(currentInput)) {
          if (currentInput.startsWith("-")) {
            currentInput = currentInput.slice(1);
          } else {
            currentInput = "-" + currentInput;
          }
        } else {
          // Complex expression, negate via parens
          currentInput = "-(" + currentInput + ")";
        }
        updateDisplay();
      }

      function applyPercent() {
        if (currentInput === "Error") return;
        try {
          const num = parseFloat(currentInput);
          if (!isNaN(num)) {
            const res = num / 100;
            currentInput = String(Number(res.toFixed(10)));
            updateDisplay();
          }
        } catch (e) {}
      }

      async function calculate() {
        if (currentInput === "Error") return;
        const expr = currentInput;

        try {
          // Send to API endpoint for evaluation
          const response = await fetch("/api/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expr }),
          });

          const data = await response.json();
          if (data.ok) {
            previousExpression = expr + " =";
            currentInput = String(data.result);
            resetOnNextInput = true;
            addHistory(expr, data.result);
          } else {
            previousExpression = expr + " =";
            currentInput = data.error.includes("divide by zero") ? "Cannot divide by 0" : "Error";
            resetOnNextInput = true;
          }
        } catch (err) {
          // Fallback to client-side evaluation if offline
          try {
            // Clean sanitize expression
            if (/^[0-9+\\-*\\/().\\s%]+$/.test(expr)) {
              const sanitized = expr.replace(/(\\d+)%/g, "($1/100)");
              const res = Function('"use strict";return (' + sanitized + ")")();
              if (!isFinite(res)) {
                currentInput = "Cannot divide by 0";
              } else {
                const rounded = Number(res.toFixed(10));
                previousExpression = expr + " =";
                currentInput = String(rounded);
                addHistory(expr, rounded);
              }
              resetOnNextInput = true;
            } else {
              currentInput = "Error";
              resetOnNextInput = true;
            }
          } catch (e) {
            currentInput = "Error";
            resetOnNextInput = true;
          }
        }
        updateDisplay();
      }

      function addHistory(expr, result) {
        history.unshift({ expr, result });
        if (history.length > 10) history.pop();
        renderHistory();
      }

      function renderHistory() {
        if (history.length === 0) {
          historyList.innerHTML = '<li class="empty-history">No calculations yet</li>';
          return;
        }
        historyList.innerHTML = history
          .map(
            (item, index) =>
              '<li class="history-item" data-index="' +
              index +
              '"><span class="expr">' +
              escapeHtml(item.expr) +
              '</span><span class="res">' +
              escapeHtml(String(item.result)) +
              "</span></li>"
          )
          .join("");

        historyList.querySelectorAll(".history-item").forEach((el) => {
          el.addEventListener("click", () => {
            const idx = Number(el.dataset.index);
            if (history[idx]) {
              currentInput = String(history[idx].result);
              previousExpression = history[idx].expr + " =";
              resetOnNextInput = true;
              updateDisplay();
            }
          });
        });
      }

      function escapeHtml(str) {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      // Keypad button handling
      document.querySelectorAll(".keypad button, .keypad-aux button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          const val = btn.dataset.value;

          if (action === "num") appendDigit(val);
          else if (action === "decimal") appendDecimal();
          else if (action === "op") appendOperator(val);
          else if (action === "calculate") calculate();
          else if (action === "clear") clearAll();
          else if (action === "backspace") backspace();
          else if (action === "negate") negate();
          else if (action === "percent") applyPercent();
          else if (action === "mc") {
            memoryValue = 0;
            updateDisplay();
          } else if (action === "mr") {
            currentInput = String(memoryValue);
            resetOnNextInput = true;
            updateDisplay();
          } else if (action === "m-plus") {
            const val = parseFloat(currentInput);
            if (!isNaN(val)) memoryValue += val;
            resetOnNextInput = true;
            updateDisplay();
          } else if (action === "m-minus") {
            const val = parseFloat(currentInput);
            if (!isNaN(val)) memoryValue -= val;
            resetOnNextInput = true;
            updateDisplay();
          }
        });
      });

      // Clear history
      clearHistoryBtn.addEventListener("click", () => {
        history = [];
        renderHistory();
      });

      // Copy result
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(currentInput);
          copyToast.classList.add("show");
          setTimeout(() => copyToast.classList.remove("show"), 1500);
        } catch (e) {
          // Fallback
          const ta = document.createElement("textarea");
          ta.value = currentInput;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          copyToast.classList.add("show");
          setTimeout(() => copyToast.classList.remove("show"), 1500);
        }
      });

      // Keyboard support
      window.addEventListener("keydown", (e) => {
        if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          appendDigit(e.key);
        } else if (e.key === ".") {
          e.preventDefault();
          appendDecimal();
        } else if (["+", "-", "*", "/"].includes(e.key)) {
          e.preventDefault();
          appendOperator(e.key);
        } else if (e.key === "Enter" || e.key === "=") {
          e.preventDefault();
          calculate();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          backspace();
        } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
          e.preventDefault();
          clearAll();
        } else if (e.key === "%") {
          e.preventDefault();
          applyPercent();
        }
      });

      updateDisplay();
    })();
  </script>
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
