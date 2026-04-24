export interface FallbackChartPoint {
  label?: string;
  value?: number;
  category?: string;
  x?: number;
  y?: number;
}

export function generateFallbackChartData(chartType: string): FallbackChartPoint[] {
  const months = ["January", "February", "March", "April", "May", "June"];
  const categories = ["Category A", "Category B", "Category C", "Category D"];

  switch (chartType) {
    case "pie":
      return categories.map((category) => ({
        label: category,
        value: Math.round(100 / categories.length + (Math.random() - 0.5) * 10),
      }));
    case "scatter":
      return Array.from({ length: 8 }, (_, index) => ({
        x: (index + 1) * 10 + Math.round(Math.random() * 5),
        y: (index + 1) * 8 + Math.round(Math.random() * 15),
        label: `Point ${index + 1}`,
      }));
    case "line":
    case "bar":
    case "stacked_bar":
    case "grouped_bar":
    default: {
      const data: FallbackChartPoint[] = [];
      const seriesCount = chartType.includes("stacked") || chartType.includes("grouped") ? 2 : 1;
      const seriesNames = ["Series A", "Series B"];
      for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex++) {
        for (let monthIndex = 0; monthIndex < 4; monthIndex++) {
          data.push({
            label: months[monthIndex],
            value: Math.round(100 + Math.random() * 200),
            category: seriesCount > 1 ? seriesNames[seriesIndex] : undefined,
          });
        }
      }
      return data;
    }
  }
}

export function generateFallbackGeometryDiagram(questionText: string) {
  const lowerText = questionText.toLowerCase();

  if (lowerText.includes("circle") || lowerText.includes("radius") || lowerText.includes("diameter") || lowerText.includes("arc") || lowerText.includes("sector")) {
    return {
      diagramType: "circle",
      elements: [
        { type: "circle", center: { x: 0.5, y: 0.5 }, radius: 0.35, label: "O" },
        { type: "point", id: "O", x: 0.5, y: 0.5, label: "O" },
        { type: "point", id: "A", x: 0.85, y: 0.5, label: "A" },
        { type: "line", from: "O", to: "A", label: "r" },
      ],
    };
  }

  if (lowerText.includes("rectangle") || lowerText.includes("square") || lowerText.includes("parallelogram")) {
    return {
      diagramType: "rectangle",
      elements: [
        { type: "point", id: "A", x: 0.2, y: 0.7, label: "A" },
        { type: "point", id: "B", x: 0.8, y: 0.7, label: "B" },
        { type: "point", id: "C", x: 0.8, y: 0.3, label: "C" },
        { type: "point", id: "D", x: 0.2, y: 0.3, label: "D" },
        { type: "line", from: "A", to: "B", label: "l" },
        { type: "line", from: "B", to: "C", label: "w" },
        { type: "line", from: "C", to: "D" },
        { type: "line", from: "D", to: "A" },
      ],
    };
  }

  if (lowerText.includes("cylinder")) {
    return {
      diagramType: "cylinder",
      elements: [{ type: "cylinder", radius: 0.2, height: 0.5, labels: { radius: "r", height: "h" } }],
    };
  }

  if (lowerText.includes("cone")) {
    return {
      diagramType: "cone",
      elements: [{ type: "cone", radius: 0.25, height: 0.4, labels: { radius: "r", height: "h" } }],
    };
  }

  if (lowerText.includes("sphere")) {
    return {
      diagramType: "sphere",
      elements: [{ type: "sphere", radius: 0.35, label: "r" }],
    };
  }

  if (lowerText.includes("coordinate") || lowerText.includes("slope") || (lowerText.includes("point") && lowerText.includes("line"))) {
    return {
      diagramType: "coordinate_plane",
      elements: [
        { type: "axis", xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        { type: "point", x: 0.7, y: 0.8, label: "P(2,3)", absoluteCoords: { x: 2, y: 3 } },
        { type: "point", x: 0.4, y: 0.6, label: "Q(-1,1)", absoluteCoords: { x: -1, y: 1 } },
      ],
    };
  }

  return {
    diagramType: "triangle",
    elements: [
      { type: "point", id: "A", x: 0.2, y: 0.8, label: "A" },
      { type: "point", id: "B", x: 0.8, y: 0.8, label: "B" },
      { type: "point", id: "C", x: 0.5, y: 0.2, label: "C" },
      { type: "line", from: "A", to: "B" },
      { type: "line", from: "B", to: "C" },
      { type: "line", from: "C", to: "A" },
    ],
  };
}
