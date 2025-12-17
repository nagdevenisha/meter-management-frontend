/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-anonymous-default-export */
// services/auth.service.ts
import api from "./api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  role?: "admin" | "developer" | "viewer"; // Match your backend UserRole enum
}

export interface UpdateUserData {
  name?: string;
  role?: "admin" | "developer" | "viewer";
}

export interface User {
  id: string; // UUID string from backend
  email: string;
  name: string;
  role: "admin" | "developer" | "viewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "developer" | "viewer";
  isActive?: boolean;
  sortBy?: "name" | "email" | "role" | "createdAt" | "updatedAt";
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedUsersResponse {
  success: boolean;
  data: {
    data: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  msg: string;
}

interface AuthResponse {
  success: boolean;
  data: any;
  msg: string;
}

class AuthService {
  // 1. Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await api.post("/auth/login", credentials);
    return res.data;
  }

  // 2. Refresh Token (called automatically by interceptor)
  async refreshToken(): Promise<void> {
    await api.post("/auth/refresh-token");
  }

  // 3. Get Current User
  async getMe(): Promise<AuthResponse> {
    const res = await api.get("/auth/me");
    return res.data;
  }

  // 4. Change Password
  async changePassword(data: ChangePasswordData): Promise<AuthResponse> {
    const res = await api.post("/auth/change-password", {
      oldPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return res.data;
  }

  // 5. Create User (Admin only)
  async createUser(data: CreateUserData): Promise<AuthResponse> {
    const res = await api.post("/auth/create-user", data);
    return res.data;
  }

  // 6. Update User (Admin only)
  async updateUser(id: string, data: UpdateUserData): Promise<AuthResponse> {
    const res = await api.patch(`/auth/users/${id}`, data);
    return res.data;
  }

  // 7. Delete User (Admin only)
  async deleteUser(id: string): Promise<AuthResponse> {
    const res = await api.delete(`/auth/users/${id}`);
    return res.data;
  }
  
  // 8. Change Password via Forgot Password
  async forgotPassword(email: string): Promise<AuthResponse> {
    const data = { email };  // create the payload
    const res = await api.post("/auth/forgot-password", data);
    return res.data;
}
  // NEW: Get All Users with filters, search, pagination
  async getAllUsers(params: GetAllUsersParams = {}): Promise<PaginatedUsersResponse> {
    const res = await api.get("/auth/users", { params });
    return res.data;
  }


}

export default new AuthService();