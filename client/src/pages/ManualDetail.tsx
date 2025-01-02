import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

const createSectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

// Update policy schema to handle date properly
const createPolicySchema = z.object({
  title: z.string().min(1, "Title is required"),
  bodyContent: z.string().min(1, "Content is required"),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;
type CreatePolicyForm = z.infer<typeof createPolicySchema>;

interface Policy {
  id: number;
  title: string;
  status: string;
}

interface Section {
  id: number;
  title: string;
  description?: string;
  policies?: Policy[];
}

interface Manual {
  id: number;
  title: string;
  description?: string;
  sections?: Section[];
}

export function ManualDetail() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sectionForm = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Initialize form with today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const policyForm = useForm<CreatePolicyForm>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      title: "",
      bodyContent: "",
      effectiveDate: today,
    },
  });

  const { data: manual, isLoading, error } = useQuery<Manual>({
    queryKey: [`/api/manuals/${id}`],
  });

  const createSection = useMutation({
    mutationFn: async (data: CreateSectionForm) => {
      const response = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          manualId: Number(id),
          createdById: user?.id,
          orderIndex: manual?.sections?.length ?? 0,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/manuals/${id}`] });
      toast({
        title: "Success",
        description: "Section created successfully",
      });
      sectionForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPolicy = useMutation({
    mutationFn: async ({ sectionId, data }: { sectionId: number; data: CreatePolicyForm }) => {
      if (!user?.id) {
        throw new Error("User ID is required");
      }

      const policyData = {
        policy: {
          title: data.title,
          sectionId: sectionId,
          createdById: user.id,
          authorId: user.id,
          status: "DRAFT",
        },
        version: {
          bodyContent: data.bodyContent,
          effectiveDate: data.effectiveDate, // Using the validated YYYY-MM-DD string directly
          createdById: user.id,
          authorId: user.id,
          versionNumber: 1,
          policyId: 0 // Will be set by server
        }
      };

      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorText);
        } catch {
          throw new Error(errorText);
        }
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/manuals/${id}`] });
      toast({
        title: "Success",
        description: "Policy created successfully",
      });
      policyForm.reset({
        title: "",
        bodyContent: "",
        effectiveDate: new Date().toISOString().split('T')[0], // Reset to today's date
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

  const onSubmitSection = (data: CreateSectionForm) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a section",
        variant: "destructive",
      });
      return;
    }
    createSection.mutate(data);
  };

  const onSubmitPolicy = (sectionId: number) => {
    return (data: CreatePolicyForm) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a policy",
          variant: "destructive",
        });
        return;
      }
      createPolicy.mutate({ sectionId, data });
    };
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading manual: {error.message}
      </div>
    );
  }

  if (!manual) {
    return <div>Manual not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/manuals">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{manual.title}</h1>
      </div>

      <p className="text-muted-foreground">{manual.description}</p>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Sections</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Section</DialogTitle>
              </DialogHeader>
              <Form {...sectionForm}>
                <form onSubmit={sectionForm.handleSubmit(onSubmitSection)} className="space-y-4">
                  <FormField
                    control={sectionForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter section title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sectionForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter section description (optional)"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createSection.isPending}>
                      {createSection.isPending ? "Creating..." : "Create Section"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {manual.sections?.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {section.policies?.length || 0} policies
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Policy
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Policy</DialogTitle>
                        </DialogHeader>
                        <Form {...policyForm}>
                          <form onSubmit={policyForm.handleSubmit(onSubmitPolicy(section.id))} className="space-y-4">
                            <FormField
                              control={policyForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter policy title" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={policyForm.control}
                              name="bodyContent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter policy content"
                                      className="min-h-[200px]"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={policyForm.control}
                              name="effectiveDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Effective Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end">
                              <Button type="submit" disabled={createPolicy.isPending}>
                                {createPolicy.isPending ? "Creating..." : "Create Policy"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {section.policies?.map((policy) => (
                    <Card key={policy.id} className="bg-accent">
                      <CardHeader>
                        <CardTitle className="text-base">{policy.title}</CardTitle>
                        <CardDescription className="text-xs">
                          Status: {policy.status}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!manual.sections || manual.sections.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No sections found. Add your first section to get started.
          </div>
        )}
      </div>
    </div>
  );
}