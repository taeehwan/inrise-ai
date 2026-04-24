export interface SystemStatus {
  database: {
    status: "online" | "offline" | "warning";
    connection: boolean;
    responseTime: number;
  };
  api: {
    status: "online" | "offline" | "warning";
    uptime: string;
    requestCount: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}
