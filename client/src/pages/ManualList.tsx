import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Book } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";

const createManualSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type CreateManualForm = z.infer<typeof createManualSchema>;

export function ManualList() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const form = useForm<CreateManualForm>({
    resolver: zodResolver(createManualSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const { data: manuals, isLoading, error } = useQuery({
    queryKey: ['/api/manuals'],
  });

  const createManual = useMutation({
    mutationFn: async (data: CreateManualForm) => {
      const response = await fetch("/api/manuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          createdById: user?.id // Include the user ID in the request
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/manuals'] });
      toast({
        title: "Success",
        description: "Manual created successfully",
      });
      form.reset();
      navigate(`/manuals/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateManualForm) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a manual",
        variant: "destructive",
      });
      return;
    }
    createManual.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading manuals: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Manuals</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Manual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Manual</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter manual title" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter manual description (optional)" 
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={createManual.isPending}>
                    {createManual.isPending ? "Creating..." : "Create Manual"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {manuals?.map((manual) => (
          <Card 
            key={manual.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/manuals/${manual.id}`)}
          >
            <CardHeader>
              <Book className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>{manual.title}</CardTitle>
              <CardDescription>{manual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {manual.sections?.length || 0} sections
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!manuals || manuals.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          No manuals found. Create your first manual to get started.
        </div>
      )}
    </div>
  );
}