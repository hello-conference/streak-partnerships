import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";

export function useExhibitors() {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors'],
    staleTime: 30000,
    queryFn: async () => {
      const res = await fetch(api.pretix.getExhibitors.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exhibitors");
      return res.json() as Promise<any[]>;
    },
  });
}

export function useExhibitorByName(name: string | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors/by-name', name],
    enabled: !!name,
    retry: false,
    queryFn: async () => {
      if (!name) throw new Error("Name is required");
      const url = buildUrl(api.pretix.getExhibitorByName.path, { name: encodeURIComponent(name) });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch exhibitor");
      return res.json();
    },
  });
}

export function usePretixItems() {
  return useQuery({
    queryKey: ['/api/pretix/items'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(api.pretix.getItems.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
}

export function useExhibitorById(exhibitorId: number | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors', exhibitorId],
    enabled: !!exhibitorId,
    queryFn: async () => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.getExhibitorById.path, { id: exhibitorId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch exhibitor");
      return res.json();
    },
  });
}

export function useExhibitorVouchers(exhibitorId: number | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors/vouchers', exhibitorId],
    enabled: !!exhibitorId,
    queryFn: async () => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.getExhibitorVouchers.path, { id: exhibitorId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
  });
}

export function useCreateExhibitor() {
  return useMutation({
    mutationFn: async (data: { name: string; partnershipLevel: string }) => {
      const res = await apiRequest("POST", api.pretix.createExhibitor.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors/by-name'] });
    },
  });
}
