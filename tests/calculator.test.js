const { describe, test, expect } = require("bun:test");
const { stripPrecision, calculateBasic, evaluateExpression } = require("../src/calculator");

describe("Calculator logic", () => {
  test("performs basic addition, subtraction, multiplication, division", () => {
    expect(calculateBasic(10, "+", 5)).toBe(15);
    expect(calculateBasic(10, "-", 4)).toBe(6);
    expect(calculateBasic(6, "*", 7)).toBe(42);
    expect(calculateBasic(20, "/", 4)).toBe(5);
  });

  test("handles floating point precision properly (0.1 + 0.2)", () => {
    expect(calculateBasic(0.1, "+", 0.2)).toBe(0.3);
  });

  test("throws error on division by zero", () => {
    expect(() => calculateBasic(42, "/", 0)).toThrow("Cannot divide by zero");
  });

  test("evaluates expressions with precedence", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("100 / 5 * 2")).toBe(40);
    expect(evaluateExpression("50 + 20%")).toBe(50.2); // 50 + 0.2
  });

  test("evaluates negative numbers and decimals", () => {
    expect(evaluateExpression("-5 + 10")).toBe(5);
    expect(evaluateExpression("3.5 * 2")).toBe(7);
  });

  test("handles stripPrecision", () => {
    expect(stripPrecision(0.30000000000000004)).toBe(0.3);
  });
});
