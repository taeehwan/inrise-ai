import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminStudentResultsChartsProps {
  scoreDistribution: Array<{ range: string; count: number }>;
  sectionDistribution: Array<{ name: string; value: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  colors: string[];
}

function SimpleBars({
  data,
  color,
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[64px_1fr_40px] items-center gap-3">
          <div className="truncate text-xs text-slate-300">{item.label}</div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/40">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%`, background: color }}
            />
          </div>
          <div className="text-right text-xs font-semibold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleDonut({
  data,
  colors,
}: {
  data: Array<{ name: string; value: number }>;
  colors: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = total
    ? `conic-gradient(${data
        .map((item, index) => {
          const start = (data.slice(0, index).reduce((sum, d) => sum + d.value, 0) / total) * 100;
          const end = (data.slice(0, index + 1).reduce((sum, d) => sum + d.value, 0) / total) * 100;
          return `${colors[index % colors.length]} ${start}% ${end}%`;
        })
        .join(", ")})`
    : "conic-gradient(rgba(255,255,255,.1) 0 100%)";

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-8 flex items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {total}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="flex-1 text-slate-300">{item.name}</span>
            <span className="font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleLineTrend({ data }: { data: Array<{ date: string; count: number }> }) {
  const width = 360;
  const height = 200;
  const padding = 20;
  const maxValue = Math.max(1, ...data.map((item) => item.count));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : width - padding * 2;
  const getX = (index: number) => padding + index * stepX;
  const getY = (value: number) =>
    height - padding - (value / maxValue) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full">
      {[0.25, 0.5, 0.75].map((ratio) => {
        const y = padding + (height - padding * 2) * ratio;
        return (
          <line
            key={ratio}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="#374151"
            strokeDasharray="4 4"
          />
        );
      })}
      <polyline
        fill="none"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={data.map((item, index) => `${getX(index)},${getY(item.count)}`).join(" ")}
      />
      {data.map((item, index) => (
        <g key={`${item.date}-${index}`}>
          <circle cx={getX(index)} cy={getY(item.count)} r="3" fill="#f59e0b" />
          <text x={getX(index)} y={height - 6} textAnchor="middle" fill="#9ca3af" fontSize="10">
            {item.date}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AdminStudentResultsCharts({
  scoreDistribution,
  sectionDistribution,
  dailyTrend,
  colors,
}: AdminStudentResultsChartsProps) {
  return (
    <div className="mb-8 grid gap-6 md:grid-cols-3">
      <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            점수 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleBars
            data={scoreDistribution.map((item) => ({ label: item.range, value: item.count }))}
            color="#3b82f6"
          />
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <PieChartIcon className="h-5 w-5 text-green-400" />
            섹션별 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleDonut data={sectionDistribution} colors={colors} />
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            일일 제출 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleLineTrend data={dailyTrend} />
        </CardContent>
      </Card>
    </div>
  );
}
