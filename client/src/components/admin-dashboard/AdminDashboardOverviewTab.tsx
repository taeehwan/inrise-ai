import { BookOpen, Headphones, Mic, PenTool } from "lucide-react";
import { OverviewStatsCards, TestCard, type AdminStats } from "./shared";

export default function AdminDashboardOverviewTab({
  realStats,
  onSelectTab,
}: {
  realStats: AdminStats;
  onSelectTab: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TestCard
          title="Reading Tests"
          icon={BookOpen}
          stats={realStats.reading}
          onAdd={() => onSelectTab("reading")}
          onManage={() => onSelectTab("reading")}
        />
        <TestCard
          title="Listening Tests"
          icon={Headphones}
          stats={realStats.listening}
          onAdd={() => onSelectTab("listening")}
          onManage={() => onSelectTab("listening")}
        />
        <TestCard
          title="Speaking Tests"
          icon={Mic}
          stats={realStats.speaking}
          onAdd={() => onSelectTab("speaking")}
          onManage={() => onSelectTab("speaking")}
        />
        <TestCard
          title="Writing Tests"
          icon={PenTool}
          stats={realStats.writing}
          onAdd={() => onSelectTab("writing")}
          onManage={() => onSelectTab("writing")}
        />
      </div>

      <OverviewStatsCards realStats={realStats} />
    </div>
  );
}
