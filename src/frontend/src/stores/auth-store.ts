"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, Warehouse } from "@/types";
import { clearTokens, setTokens, clearAuthBounceGuard } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/mock-data";
import {
  companiesForUser,
  resolveUserCompany,
} from "@/lib/companies-scope";

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

function buildDemoUser(email: string, displayName?: string): AuthUser {
  const scoped = resolveUserCompany({
    id: "demo-user",
    email,
    displayName: displayName || email.split("@")[0] || "Operator",
    companyId: "co-1",
    companyName: "",
    roles: ["CompanyAdmin"],
    permissions: ALL_PERMISSIONS,
  });
  return {
    id: "demo-user",
    email,
    displayName: displayName || email.split("@")[0] || "Operator",
    companyId: scoped.companyId,
    companyName: scoped.companyName,
    roles: ["CompanyAdmin"],
    permissions: ALL_PERMISSIONS,
  };
}

function applyCompanyScope(user: AuthUser | null) {
  const scoped = companiesForUser(user);
  return {
    warehouses: scoped,
    selectedWarehouseId: scoped[0]?.id ?? null,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      warehouses: [],
      selectedWarehouseId: null,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      loginDemo: (email, displayName) => {
        const token = "demo-token";
        const user = buildDemoUser(email, displayName);
        setTokens(token);
        clearAuthBounceGuard();
        set({
          user,
          token,
          ...applyCompanyScope(user),
        });
      },
      login: (user, token, refreshToken) => {
        setTokens(token, refreshToken);
        clearAuthBounceGuard();
        // Prefer API warehouses if present later; for now scope to the user's company
        set({
          user: {
            ...user,
            companyId: resolveUserCompany(user).companyId,
            companyName: user.companyName || resolveUserCompany(user).companyName,
          },
          token,
          ...applyCompanyScope(user),
        });
      },
      logout: () => {
        clearTokens();
        set({
          user: null,
          token: null,
          warehouses: [],
          selectedWarehouseId: null,
        });
      },
      hasPermission: (code) => {
        const perms = get().user?.permissions ?? [];
        if (perms.includes("admin.full") || perms.includes("platform.admin")) {
          return true;
        }
        return perms.includes(code);
      },
      setSelectedWarehouse: (id) => {
        const allowed = get().warehouses.some((w) => w.id === id);
        if (!allowed) return;
        set({ selectedWarehouseId: id });
      },
    }),
    {
      name: "logiforge-auth",
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        selectedWarehouseId: state.selectedWarehouseId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setTokens(state.token);
        }
        if (state) {
          const scoped = applyCompanyScope(state.user);
          state.warehouses = scoped.warehouses;
          state.selectedWarehouseId =
            scoped.warehouses.find((w) => w.id === state.selectedWarehouseId)
              ?.id ??
            scoped.selectedWarehouseId;
          if (state.user) {
            const resolved = resolveUserCompany(state.user);
            state.user = {
              ...state.user,
              companyId: resolved.companyId,
              companyName: resolved.companyName,
            };
          }
        }
        state?.setHydrated(true);
      },
    },
  ),
);
