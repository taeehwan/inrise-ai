interface MyPageScoreHistoryChartProps {
  chartData: Array<{ date: string; score: number }>;
  maxScore: number;
}

export default function MyPageScoreHistoryChart({
  chartData,
  maxScore,
}: MyPageScoreHistoryChartProps) {
  const width = 560;
  const height = 180;
  const padding = 20;
  const stepX =
    chartData.length > 1 ? (width - padding * 2) / (chartData.length - 1) : width - padding * 2;
  const getX = (index: number) => padding + index * stepX;
  const getY = (value: number) =>
    height - padding - (Math.max(0, value) / Math.max(1, maxScore)) * (height - padding * 2);

  const polylinePoints = chartData
    .map((point, index) => `${getX(index)},${getY(point.score)}`)
    .join(" ");

  return (
    <div style={{ height: 180, marginBottom: 8 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padding + (height - padding * 2) * ratio;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,.08)"
              strokeDasharray="4 4"
            />
          );
        })}

        <polyline
          fill="none"
          stroke="#00BBFF"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polylinePoints}
        />

        {chartData.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={getX(index)} cy={getY(point.score)} r="3" fill="#00BBFF" />
            <text
              x={getX(index)}
              y={height - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,.35)"
              fontSize="10"
            >
              {point.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
