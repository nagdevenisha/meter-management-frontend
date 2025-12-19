/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/ota.service.ts
import api from "./api"; // your axios instance

export interface OtaJob {
  id: number;
  version: string;
  fileName: string;
  s3UrlUpdate: string;
  s3UrlJobDoc: string;
  downloadPath: string;
  targets: string[];
  jobId: string;
  jobArn: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOtaJobDTO {
  version: string;
  bucketName?: string;
  thingGroupName?: string;
  thingNames?: string;
  downloadPath: string;
}

export interface OtaJobsResponse {
  jobs: OtaJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class OtaService {
  private baseURL = "/ota";

  async createJob(file: File, data: CreateOtaJobDTO): Promise<OtaJob> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("version", data.version);
    if (data.bucketName) formData.append("bucketName", data.bucketName);
    if (data.thingGroupName) formData.append("thingGroupName", data.thingGroupName);
    if (data.thingNames) formData.append("thingNames", data.thingNames);
    formData.append("downloadPath", data.downloadPath);

    const res = await api.post(`${this.baseURL}/create-job`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  }

    async getMyJobs(
      page = 1,
      limit = 10,
      search?: string
     ): Promise<OtaJobsResponse> {
      const res = await api.get(`${this.baseURL}/my-jobs`, {
        params: {
          page,
          limit,
          ...(search ? { search } : {}), // ✅ send only if present
        },
      });

      return res.data.data;
    }

}

export default new OtaService();