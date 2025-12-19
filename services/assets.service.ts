/* eslint-disable import/no-anonymous-default-export */
// services/assets.service.ts
import api from "./api";

export interface MeterFilters {
  search?: string;
  meterType?: string;
  powerHATStatus?: string;
  groupName?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface EnrichedMeter {
  meterId: string;
  assignedHouseholdId?: string | null;
  isAssigned: boolean;
  createdAt: string;
  updatedAt: string;
  groupName: string;
  status: "REGISTERED" | "UNREGISTERED" | "unknown";
  meterType?: string | null;
  assetSerialNumber?: string | null;
  powerHATStatus?: string | null;
}

export interface PaginatedMeters {
  meters: EnrichedMeter[];
  pagination: Pagination;
}

export interface UploadMetersResponse {
  uploaded: number;
  saved: number;
  synced: number;
}

export interface ThingGroup {
  groupName: string;
  groupId: string;
  createdDate: string;
}

export interface PaginatedThingGroups {
  groups: ThingGroup[];
  pagination: Pagination;
}

export interface ThingInGroup {
  thingName: string;
  status: "REGISTERED" | "UNREGISTERED" | "unknown";
}

export interface PaginatedThingsInGroup {
  things: ThingInGroup[];
  pagination: Pagination;
}

class AssetsService {
  // 1. Upload Meters (CSV/XLSX)
  async uploadMeters(file: File, groupName: string): Promise<UploadMetersResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("groupName", groupName);

    const res = await api.post("/assets/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  }

  // 2. Get All Meters (with AWS sync status + extra fields)
  async getMeters(filters: MeterFilters = {}): Promise<PaginatedMeters> {
  const params = new URLSearchParams();
  console.log(filters)

  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.meterType) params.append("meterType", String(filters.meterType));

  if (filters.search) params.append("meterId", filters.search);
  if (filters.status) params.append("status", filters.status);
  if (filters.powerHATStatus)
    params.append("powerHATStatus", filters.powerHATStatus);
  if (filters.groupName) params.append("groupName", filters.groupName);

  const res = await api.get(`/assets/meters?${params.toString()}`);
  return res.data.data;
}


  // 3. Update Meter (by meterId)
  async updateMeter(
    meterId: string,
    data: {
      meterType?: string;
      assetSerialNumber?: string;
      powerHATStatus?: string;
    }
  ): Promise<EnrichedMeter> {
    const res = await api.put(`/assets/meters/${meterId}`, data);
    return res.data.data;
  }

  // 4. Delete Meter
  async deleteMeter(meterId: string): Promise<{ success: boolean; msg: string }> {
    const res = await api.delete(`/assets/meters/${meterId}`);
    return res.data;
  }

  // 5. List AWS Thing Groups
  async getThingGroups(filters: { page?: number; limit?: number } = {}): Promise<PaginatedThingGroups> {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));

    const res = await api.get(`/assets/groups?${params.toString()}`);
    return res.data.data;
  }

  // 6. List Things in a Group
  async getThingsInGroup(
    groupName: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<PaginatedThingsInGroup> {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));

    const res = await api.get(`/assets/groups/${groupName}?${params.toString()}`);
    return res.data.data;
  }

  // 7. Get Unregistered Things in Group
  async getUnregisteredInGroup(groupName: string): Promise<string[]> {
    const res = await api.get(`/assets/groups/${groupName}/unregistered`);
    return res.data.data;
  }
}

export default new AssetsService();