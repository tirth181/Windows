"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, Warehouse } from "@/types";
import { clearTokens, setTokens } from "@/lib/auth";
import { ALL_PERMISSIONS, DEMO_WAREHOUSES } from "@/lib/mock-data";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  warehouses: Warehouse[];
  selectedWarehouseId: string | null;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  loginDemo: (email: string, displayName?: string) => void;
  login: (user: AuthUser, token: string, refreshToken?: string) => void;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  setSelectedWarehouse: (id: string) => void;
}

const demoUser = (email: string, displayName?: string): AuthUser => ({
  id: "demo-user",
  email,
  displayName: displayName || email.split("@")[0] || "Operator",
  companyId: "co-1",
  companyName: "LogiForge Demo 3PL",
  roles: ["CompanyAdmin"],
  permissions: ALL_PERMISSIONS,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      warehouses: DEMO_WAREHOUSES,
      selectedWarehouseId: DEMO_WAREHOUSES[0]?.id ?? null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      loginDemo: (email, displayName) => {
        const token = "demo-token";
        setTokens(token);
        set({
          user: demoUser(email, displayName),
          token,
          warehouses: DEMO_WAREHOUSES,
          selectedWarehouseId: DEMO_WAREHOUSES[0]?.id ?? null,
        });
      },
      login: (user, token, refreshToken) => {
        setTokens(token, refreshToken);
        set({ user, token });
      },
      logout: () => {
        clearTokens();
        set({
          user: null,
          token: null,
          selectedWarehouseId: DEMO_WAREHOUSES[0]?.id ?? null,
        });
      },
      hasPermission: (code) => {
        const perms = get().user?.permissions ?? [];
        if (perms.includes("admin.full") || perms.includes("platform.admin")) {
          return true;
        }
        return perms.includes(code);
      },
      setSelectedWarehouse: (id) => set({ selectedWarehouseId: id }),
    }),
    {
      name: "logiforge-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        warehouses: state.warehouses,
        selectedWarehouseId: state.selectedWarehouseId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
