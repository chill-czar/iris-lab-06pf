// Pure calculator logic and expression evaluator

function stripPrecision(num, precision = 12) {
  if (typeof num !== "number" || !Number.isFinite(num)) return num;
  return parseFloat(num.toPrecision(precision));
}

function calculateBasic(a, op, b) {
  const numA = Number(a);
  const numB = Number(b);

  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    throw new Error("Invalid number input");
  }

  let result;
  switch (op) {
    case "+":
      result = numA + numB;
      break;
    case "-":
      result = numA - numB;
      break;
    case "*":
    case "×":
      result = numA * numB;
      break;
    case "/":
    case "÷":
      if (numB === 0) {
        throw new Error("Cannot divide by zero");
      }
      result = numA / numB;
      break;
    default:
      throw new Error(`Unsupported operator: ${op}`);
  }

  return stripPrecision(result);
}

// Tokenize and evaluate arithmetic expressions with standard precedence (+, -, *, /)
function evaluateExpression(expr) {
  if (!expr || typeof expr !== "string") {
    throw new Error("Expression must be a non-empty string");
  }

  // Normalize operators
  const sanitized = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .trim();

  // Basic validation - only allow digits, decimals, basic operators, spaces, parentheses
  if (!/^[0-9+\-*/().\s%]+$/.test(sanitized)) {
    throw new Error("Expression contains invalid characters");
  }

  // Simple tokenization
  const rawTokens = [];
  let i = 0;
  while (i < sanitized.length) {
    const char = sanitized[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if ("+-*/()%".includes(char)) {
      rawTokens.push(char);
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
        numStr += sanitized[i];
        i++;
      }
      if ((numStr.match(/\./g) || []).length > 1) {
        throw new Error(`Invalid number format: ${numStr}`);
      }
      rawTokens.push(parseFloat(numStr));
      continue;
    }
    throw new Error(`Unexpected character: ${char}`);
  }

  // Handle unary percent: number followed by % becomes (number / 100)
  const tokens = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const t = rawTokens[idx];
    if (t === "%") {
      if (tokens.length === 0 || typeof tokens[tokens.length - 1] !== "number") {
        throw new Error("Invalid percentage placement");
      }
      tokens[tokens.length - 1] = stripPrecision(tokens[tokens.length - 1] / 100);
    } else {
      tokens.push(t);
    }
  }

  // Handle unary plus and minus
  const processedTokens = [];
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    const prev = processedTokens[processedTokens.length - 1];
    const isUnary = (token === "+" || token === "-") &&
      (t === 0 || (typeof prev === "string" && prev !== ")"));
    if (isUnary) {
      const next = tokens[t + 1];
      if (typeof next === "number") {
        processedTokens.push(token === "-" ? -next : next);
        t++;
      } else {
        processedTokens.push(token === "-" ? -1 : 1);
        processedTokens.push("*");
      }
    } else {
      processedTokens.push(token);
    }
  }

  // Shunting-yard algorithm to evaluate infix to RPN
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const outputQueue = [];
  const opStack = [];

  for (const token of processedTokens) {
    if (typeof token === "number") {
      outputQueue.push(token);
    } else if (token in precedence) {
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] in precedence &&
        precedence[opStack[opStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(opStack.pop());
      }
      opStack.push(token);
    } else if (token === "(") {
      opStack.push(token);
    } else if (token === ")") {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== "(") {
        outputQueue.push(opStack.pop());
      }
      if (opStack.length === 0) {
        throw new Error("Mismatched parentheses");
      }
      opStack.pop(); // pop '('
    }
  }

  while (opStack.length > 0) {
    const op = opStack.pop();
    if (op === "(" || op === ")") {
      throw new Error("Mismatched parentheses");
    }
    outputQueue.push(op);
  }

  // Evaluate RPN
  const evalStack = [];
  for (const token of outputQueue) {
    if (typeof token === "number") {
      evalStack.push(token);
    } else {
      if (evalStack.length < 2) {
        throw new Error("Malformed expression");
      }
      const b = evalStack.pop();
      const a = evalStack.pop();
      evalStack.push(calculateBasic(a, token, b));
    }
  }

  if (evalStack.length !== 1) {
    throw new Error("Malformed expression");
  }

  return stripPrecision(evalStack[0]);
}

module.exports = {
  stripPrecision,
  calculateBasic,
  evaluateExpression
};
