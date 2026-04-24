import test from "node:test";
import assert from "node:assert/strict";

import { generateFallbackChartData, generateFallbackGeometryDiagram } from "../../server/lib/questionFallbacks";

test("generateFallbackChartData returns structured series for grouped bar", () => {
  const result = generateFallbackChartData("grouped_bar");
  assert.equal(result.length, 8);
  assert.ok(result.every((point) => typeof point.label === "string"));
  assert.ok(result.some((point) => point.category === "Series A"));
  assert.ok(result.some((point) => point.category === "Series B"));
});

test("generateFallbackChartData returns scatter coordinates", () => {
  const result = generateFallbackChartData("scatter");
  assert.equal(result.length, 8);
  assert.ok(result.every((point) => typeof point.x === "number" && typeof point.y === "number"));
});

test("generateFallbackGeometryDiagram detects circle prompts", () => {
  const result = generateFallbackGeometryDiagram("In the circle, what is the radius?");
  assert.equal(result.diagramType, "circle");
  assert.ok(result.elements.some((element: { type: string }) => element.type === "circle"));
});

test("generateFallbackGeometryDiagram falls back to triangle", () => {
  const result = generateFallbackGeometryDiagram("Find the value of x in the triangle.");
  assert.equal(result.diagramType, "triangle");
  assert.equal(result.elements.filter((element: { type: string }) => element.type === "point").length, 3);
});
