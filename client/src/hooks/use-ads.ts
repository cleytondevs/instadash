import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertAd } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAds() {
  return useQuery({
    queryKey: [api.ads.list.path],
    queryFn: async () => {
      const res = await fetch(api.ads.list.path);
      if (!res.ok) throw new Error("Failed to fetch ads");
      return api.ads.list.responses[200].parse(await res.json());
    },
  });
}

export function useAd(id: number) {
  return useQuery({
    queryKey: [api.ads.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.ads.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch ad details");
      return api.ads.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAd) => {
      const res = await fetch(api.ads.create.path, {
        method: api.ads.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.ads.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create ad");
      }
      return api.ads.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ads.list.path] });
      toast({
        title: "Success",
        description: "Ad campaign created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSyncAd() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.ads.sync.path, { id });
      const res = await fetch(url, { method: api.ads.sync.method });
      
      if (!res.ok) throw new Error("Failed to sync ad data");
      return api.ads.sync.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: [api.ads.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.ads.list.path] });
      toast({
        title: "Sync Complete",
        description: `Synced ${data.newReports} new daily reports.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.ads.delete.path, { id });
      const res = await fetch(url, { method: api.ads.delete.method });
      if (!res.ok) throw new Error("Failed to delete ad");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.ads.list.path] });
      toast({
        title: "Deleted",
        description: "Ad campaign removed successfully",
      });
    },
  });
}
