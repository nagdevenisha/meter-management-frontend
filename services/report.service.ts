/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/report.service.ts
import api from "./api";

export interface ReportEvent {
  id: number;
  device_id: string;
  timestamp: number;
  type: number;
  details: Record<string, any>;
}

export interface ReportFilters {
  type?: string;
  start_time?: number;
  end_time?: number;
  page?: number;
  limit?: number;
  format?: "json" | "csv" | "xlsx" | "xml";
}

class ReportService {
  private baseURL = "/reports";

  async getReport(filters: ReportFilters): Promise<any> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "function") return;
      if (value === "") return;

      if (value instanceof Date) {
        params.append(key, String(Math.floor(value.getTime() / 1000)));
        return;
      }

      params.append(key, String(value));
    });

    const url = `${this.baseURL}?${params.toString()}`;
    console.log("Fetching report:", url);

    const res = await api.get(url, {
      responseType:
        filters.format && filters.format !== "json" ? "blob" : undefined,
    });

    return res.data;
  }
}

export default new ReportService();
