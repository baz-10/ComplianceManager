import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

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
  const [search, setSearch] = useState("");

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
      <div className="container max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 mb-2"><Skeleton className="h-8 w-40" /></div>
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          ))}
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

  const filtered = (manuals || []).filter((m: any) =>
    [m.title, m.description].filter(Boolean).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Manuals</h1>
          <p className="text-sm text-muted-foreground">Browse, create, and manage your operations manuals.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search manuals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button aria-label="Create new manual">
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
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((manual: any) => (
          <Card 
            key={manual.id}
            className="cursor-pointer transition-all border hover:border-primary/30 hover:shadow-md"
            onClick={() => navigate(`/manuals/${manual.id}`)}
          >
            <CardHeader>
              <Book className="h-6 w-6 mb-1 text-primary" />
              <CardTitle className="text-lg">{manual.title}</CardTitle>
              <CardDescription className="line-clamp-2">{manual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {manual.sections?.length || 0} sections
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 border rounded-lg">
          <div className="mx-auto w-12 h-12 mb-3 text-muted-foreground">
            <Book className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-muted-foreground mb-2">No manuals found{search ? ` for "${search}"` : ''}.</p>
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first manual
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
                            <Textarea placeholder="Enter manual description (optional)" {...field} />
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
          )}
        </div>
      )}
    </div>
  );
}
