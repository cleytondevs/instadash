import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAdSchema } from "@shared/schema";
import { useCreateAd } from "@/hooks/use-ads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";

// Extend schema for form validation if needed, though insertAdSchema is good
const formSchema = insertAdSchema.extend({
  // Ensure default values or specific validations for UI
});

type FormValues = z.infer<typeof formSchema>;

export function CreateAdDialog() {
  const [open, setOpen] = useState(false);
  const createAd = useCreateAd();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      platformIdentifier: "",
      platform: "shopee",
      status: "active",
    },
  });

  const onSubmit = (data: FormValues) => {
    createAd.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Track New Ad</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Connect an existing Shopee ad campaign to start tracking ROI automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">Campaign Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Summer Sale 2024" 
                      className="rounded-xl border-border focus:ring-primary/20 focus:border-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platformIdentifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">Boost ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Shopee/IG Ad ID" 
                      className="rounded-xl border-border focus:ring-primary/20 focus:border-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground font-medium">Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-border focus:ring-primary/20 focus:border-primary">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="shopee">Shopee</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full rounded-xl h-11 bg-primary hover:bg-primary/90 font-semibold text-lg shadow-md"
              disabled={createAd.isPending}
            >
              {createAd.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
