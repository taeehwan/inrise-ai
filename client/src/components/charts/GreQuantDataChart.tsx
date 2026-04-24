import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  x?: number;
  y?: number;
}

interface GreQuantDataChartProps {
  type: string;
  title: string;
  data: ChartDataPoint[];
}

const CHART_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#1e40af", "#1d4ed8"];

export default function GreQuantDataChart({ type, title, data }: GreQuantDataChartProps) {
  if (!data || data.length === 0) return null;

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 25, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" stroke="#374151" fontSize={14} fontWeight={500} tick={{ fill: "#1f2937" }} axisLine={{ stroke: "#374151", strokeWidth: 2 }} />
              <YAxis stroke="#374151" fontSize={14} fontWeight={500} tick={{ fill: "#1f2937" }} axisLine={{ stroke: "#374151", strokeWidth: 2 }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151", borderRadius: "4px", fontSize: "14px", fontWeight: 500 }} labelStyle={{ color: "#1f2937", fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: "14px", fontWeight: 500 }} />
              <Bar dataKey="value" fill="#2563eb" stroke="#1e40af" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 25, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" stroke="#374151" fontSize={14} fontWeight={500} tick={{ fill: "#1f2937" }} axisLine={{ stroke: "#374151", strokeWidth: 2 }} />
              <YAxis stroke="#374151" fontSize={14} fontWeight={500} tick={{ fill: "#1f2937" }} axisLine={{ stroke: "#374151", strokeWidth: 2 }} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151", borderRadius: "4px", fontSize: "14px", fontWeight: 500 }} labelStyle={{ color: "#1f2937", fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: "14px", fontWeight: 500 }} />
              <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={3} dot={{ fill: "#1e40af", r: 5, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#2563eb"
                dataKey="value"
                stroke="#1f2937"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151", fontSize: "14px" }} />
              <Legend wrapperStyle={{ fontSize: "14px", fontWeight: 500 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-base text-left border-collapse border-2 border-gray-800">
              <thead className="bg-gray-100 text-gray-900 font-semibold uppercase text-sm">
                <tr>
                  <th className="px-6 py-4 border-2 border-gray-800">Category</th>
                  <th className="px-6 py-4 border-2 border-gray-800">Value</th>
                  {data[0]?.category && <th className="px-6 py-4 border-2 border-gray-800">Type</th>}
                </tr>
              </thead>
              <tbody className="text-gray-900 bg-white">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border border-gray-600 font-medium">{row.label}</td>
                    <td className="px-6 py-4 border border-gray-600 font-semibold">{row.value.toLocaleString()}</td>
                    {row.category && <td className="px-6 py-4 border border-gray-600">{row.category}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "scatter": {
        const scatterData = data.map((d) => ({ x: d.x ?? d.value, y: d.y ?? d.value, label: d.label }));
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 25, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis type="number" dataKey="x" name="X" stroke="#374151" fontSize={14} fontWeight={500} />
              <YAxis type="number" dataKey="y" name="Y" stroke="#374151" fontSize={14} fontWeight={500} />
              <ZAxis type="number" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151" }} />
              <Legend />
              <Scatter name="Data Points" data={scatterData} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      }
      case "stacked_bar":
      case "grouped_bar": {
        const categories = [...new Set(data.map((d) => d.category).filter(Boolean))] as string[];
        const labels = [...new Set(data.map((d) => d.label))];
        const groupedData = labels.map((label) => {
          const entry: Record<string, string | number> = { label };
          categories.forEach((cat) => {
            const item = data.find((d) => d.label === label && d.category === cat);
            entry[cat] = item?.value ?? 0;
          });
          return entry;
        });

        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={groupedData} margin={{ top: 25, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" stroke="#374151" fontSize={14} fontWeight={500} />
              <YAxis stroke="#374151" fontSize={14} fontWeight={500} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151" }} />
              <Legend />
              {categories.map((cat, idx) => (
                <Bar key={cat} dataKey={cat} fill={CHART_COLORS[idx % CHART_COLORS.length]} stackId={type === "stacked_bar" ? "stack" : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }
      default:
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 25, right: 40, left: 30, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="label" stroke="#374151" fontSize={14} fontWeight={500} />
              <YAxis stroke="#374151" fontSize={14} fontWeight={500} />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #374151" }} />
              <Legend />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 mb-6 border-2 border-gray-800 shadow-lg">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-300">
        <BarChart3 className="h-6 w-6 text-gray-800" />
        <h4 className="text-gray-900 font-bold text-lg uppercase tracking-wide">{title}</h4>
      </div>
      {renderChart()}
    </div>
  );
}
