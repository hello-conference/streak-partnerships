import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";

export type PretixOrg = "be" | "nl";

export function useExhibitors(org: PretixOrg) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors', org],
    staleTime: 30000,
    queryFn: async () => {
      const url = buildUrl(api.pretix.getExhibitors.path, { org });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exhibitors");
      return res.json() as Promise<any[]>;
    },
  });
}

export function useExhibitorByName(org: PretixOrg, name: string | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors/by-name', org, name],
    enabled: !!name,
    retry: false,
    queryFn: async () => {
      if (!name) throw new Error("Name is required");
      const url = buildUrl(api.pretix.getExhibitorByName.path, { org, name: encodeURIComponent(name) });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch exhibitor");
      return res.json();
    },
  });
}

export function usePretixItems(org: PretixOrg) {
  return useQuery({
    queryKey: ['/api/pretix/items', org],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const url = buildUrl(api.pretix.getItems.path, { org });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });
}

export function useExhibitorById(org: PretixOrg, exhibitorId: number | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors', org, exhibitorId],
    enabled: !!exhibitorId,
    queryFn: async () => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.getExhibitorById.path, { org, id: exhibitorId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch exhibitor");
      return res.json();
    },
  });
}

export function useExhibitorVouchers(org: PretixOrg, exhibitorId: number | null) {
  return useQuery({
    queryKey: ['/api/pretix/exhibitors/vouchers', org, exhibitorId],
    enabled: !!exhibitorId,
    queryFn: async () => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.getExhibitorVouchers.path, { org, id: exhibitorId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
  });
}

export function useTicketSummary(org: PretixOrg) {
  return useQuery({
    queryKey: ['/api/pretix/ticket-summary', org],
    staleTime: 30000,
    queryFn: async () => {
      const url = buildUrl(api.pretix.getTicketSummary.path, { org });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ticket summary");
      return res.json() as Promise<{
        freeConference: { total: number; claimed: number };
        partner: { total: number; claimed: number };
        paid: { total: number; claimed: number };
        paidRevenue: number;
      }>;
    },
  });
}

export function useCreateExhibitor(org: PretixOrg) {
  return useMutation({
    mutationFn: async (data: { name: string; partnershipLevel: string }) => {
      const url = buildUrl(api.pretix.createExhibitor.path, { org });
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors', org] });
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors/by-name', org] });
    },
  });
}

export function useCreateMissingExhibitors(org: PretixOrg) {
  return useMutation({
    mutationFn: async (data: { partners: { name: string; partnershipLevel: string }[] }) => {
      const url = buildUrl(api.pretix.createMissingExhibitors.path, { org });
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors', org] });
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/exhibitors/by-name', org] });
    },
  });
}

export function useEmailLogs(org: PretixOrg, exhibitorId: number | null) {
  return useQuery({
    queryKey: ['/api/pretix/email-logs', org, exhibitorId],
    enabled: !!exhibitorId,
    queryFn: async () => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.getEmailLogs.path, { org, id: exhibitorId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch email logs");
      return res.json() as Promise<Array<{
        id: number;
        org: string;
        exhibitorId: string;
        exhibitorName: string;
        sentTo: string;
        sentBy: string;
        subject: string;
        sentAt: string;
      }>>;
    },
  });
}

export function useCreateEmailLog(org: PretixOrg, exhibitorId: number | null) {
  return useMutation({
    mutationFn: async (data: { sentTo: string; subject: string; exhibitorName: string }) => {
      if (!exhibitorId) throw new Error("ID is required");
      const url = buildUrl(api.pretix.createEmailLog.path, { org, id: exhibitorId });
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pretix/email-logs', org, exhibitorId] });
    },
  });
}
