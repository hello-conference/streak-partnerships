import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/pipelines
export function usePipelines() {
  return useQuery({
    queryKey: [api.pipelines.list.path],
    queryFn: async () => {
      const res = await fetch(api.pipelines.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pipelines");
      return api.pipelines.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/pipelines/:key
export function usePipeline(key: string | null) {
  return useQuery({
    queryKey: [api.pipelines.get.path, key],
    enabled: !!key,
    queryFn: async () => {
      if (!key) throw new Error("Key is required");
      const url = buildUrl(api.pipelines.get.path, { key });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      return api.pipelines.get.responses[200].parse(await res.json());
    },
  });
}

// GET /api/pipelines/:key/boxes
export function usePipelineBoxes(key: string | null, options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled !== undefined ? options.enabled && !!key : !!key;
  return useQuery({
    queryKey: [api.pipelines.getBoxes.path, key],
    enabled: isEnabled,
    queryFn: async () => {
      if (!key) throw new Error("Key is required");
      const url = buildUrl(api.pipelines.getBoxes.path, { key });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error("Failed to fetch boxes");
      return api.pipelines.getBoxes.responses[200].parse(await res.json());
    },
  });
}
