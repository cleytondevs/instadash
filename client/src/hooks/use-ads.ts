import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

export function useAds() {
  return useQuery({
    queryKey: ["ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useAd(id: number) {
  return useQuery({
    queryKey: ["ads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ad: any) => {
      const { data, error } = await supabase
        .from("ads")
        .insert([ad])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      toast({
        title: "Success",
        description: "Ad campaign created successfully",
      });
    },
    onError: (error: any) => {
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
      // Logic for syncing via Supabase (e.g., calling an Edge Function or updating timestamp)
      const { data, error } = await supabase
        .from("ads")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { newReports: 0 }; // Placeholder matching previous API response structure
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["ads", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      toast({
        title: "Sync Complete",
        description: "Ad data synced successfully.",
      });
    },
    onError: (error: any) => {
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
      const { error } = await supabase
        .from("ads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      toast({
        title: "Deleted",
        description: "Ad campaign removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
