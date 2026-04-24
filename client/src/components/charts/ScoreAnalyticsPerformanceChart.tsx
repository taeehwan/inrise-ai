interface ScoreAnalyticsPerformanceChartProps {
  performanceData: Array<Record<string, string | number>>;
}

const SERIES = [
  { key: "총점", color: "#3B82F6" },
  { key: "리딩", color: "#10B981" },
  { key: "리스닝", color: "#F59E0B" },
  { key: "스피킹", color: "#EF4444" },
  { key: "라이팅", color: "#8B5CF6" },
];

export default function ScoreAnalyticsPerformanceChart({
  performanceData,
}: ScoreAnalyticsPerformanceChartProps) {
  const width = 720;
  const height = 280;
  const padding = 28;
  const maxValue = 120;
  const stepX =
    performanceData.length > 1
      ? (width - padding * 2) / (performanceData.length - 1)
      : width - padding * 2;

  const getX = (index: number) => padding + index * stepX;
  const getY = (value: number) =>
    height - padding - (Math.max(0, value) / maxValue) * (height - padding * 2);

  return (
    <div className="h-80 space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {[0, 30, 60, 90, 120].map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgba(148,163,184,0.18)"
                strokeDasharray="4 4"
              />
              <text x={8} y={y + 4} fill="rgba(100,116,139,0.8)" fontSize="10">
                {tick}
              </text>
            </g>
          );
        })}

        {SERIES.map((series) => {
          const points = performanceData
            .map((point, index) => {
              const raw = point[series.key];
              const value = typeof raw === "number" ? raw : 0;
              return `${getX(index)},${getY(value)}`;
            })
            .join(" ");

          return (
            <g key={series.key}>
              <polyline
                fill="none"
                stroke={series.color}
                strokeWidth={series.key === "총점" ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {performanceData.map((point, index) => {
                const raw = point[series.key];
                const value = typeof raw === "number" ? raw : 0;
                return (
                  <circle
                    key={`${series.key}-${index}`}
                    cx={getX(index)}
                    cy={getY(value)}
                    r={series.key === "총점" ? 3.5 : 2.5}
                    fill={series.color}
                  />
                );
              })}
            </g>
          );
        })}

        {performanceData.map((point, index) => (
          <text
            key={String(point.date)}
            x={getX(index)}
            y={height - 6}
            textAnchor="middle"
            fill="rgba(100,116,139,0.8)"
            fontSize="10"
          >
            {String(point.date)}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <span>{series.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
