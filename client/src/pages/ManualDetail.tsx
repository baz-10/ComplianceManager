import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Plus, GripVertical, Loader2, Edit2, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PolicyAITools } from "@/components/PolicyAITools";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ExportDialog } from "@/components/ExportDialog";

// Schema definitions
const createPolicySchema = z.object({
  title: z.string().min(1, "Title is required"),
  bodyContent: z.string().min(1, "Content is required"),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

const createSectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;
type CreatePolicyForm = z.infer<typeof createPolicySchema>;

// Interface definitions
interface Policy {
  id: number;
  title: string;
  status: "DRAFT" | "LIVE";
  currentVersionId: number | null;
  currentVersion?: {
    bodyContent: string;
  };
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
}

interface Section {
  id: number;
  title: string;
  description?: string;
  policies: Policy[];
}

interface Manual {
  id: number;
  title: string;
  description?: string;
  sections: Section[];
}

// Component definitions
function AddPolicyDialog({ sectionId, onSubmit }: { sectionId: number; onSubmit: (data: CreatePolicyForm) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const form = useForm<CreatePolicyForm>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      title: "",
      bodyContent: "",
      effectiveDate: today,
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>
            Add a new policy to this section.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-y-auto pr-1">
            <FormField
              control={form.control}
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
              control={form.control}
              name="bodyContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      className="min-h-[300px] max-h-[350px] overflow-y-auto"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
            <div className="h-4"></div> {/* Spacer to ensure footer visibility */}
            <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t mt-4">
              <Button type="submit">
                Create Policy
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SortablePolicy({ policy, sectionIndex, policyIndex, children }: {
  policy: Policy;
  sectionIndex: number;
  policyIndex: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: policy.id });
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { id } = useParams();

  const acknowledgeMutation = useMutation({
    mutationFn: async (policyId: number) => {
      const response = await fetch(`/api/policies/${policyId}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
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
        description: "Policy acknowledged successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="group bg-accent">
        <CardHeader>
          <div className="flex items-start gap-2">
            <span
              className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </span>
            <span className="text-sm font-medium text-muted-foreground mt-1">
              {sectionIndex + 1}.{policyIndex + 1}
            </span>
            {children}
          </div>
        </CardHeader>
        {policy.currentVersion && (
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: policy.currentVersion.bodyContent }}
            />
            {user && policy.status === "LIVE" && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {policy.isAcknowledged ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Acknowledged on {new Date(policy.acknowledgedAt!).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Acknowledgment required
                    </span>
                  )}
                </div>
                {!policy.isAcknowledged && (
                  <Button
                    onClick={() => acknowledgeMutation.mutate(policy.id)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    {acknowledgeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Acknowledging...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Acknowledge
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function SortableSection({
  section,
  sectionIndex,
  onReorderPolicies,
  onUpdatePolicy,
  onDeletePolicy,
  onCreatePolicy,
}: {
  section: Section;
  sectionIndex: number;
  onReorderPolicies: (sectionId: number, policyIds: number[]) => void;
  onUpdatePolicy: (policyId: number, data: { title: string; bodyContent?: string; status?: "DRAFT" | "LIVE" }) => void;
  onDeletePolicy: (policyId: number) => void;
  onCreatePolicy: (sectionId: number, data: CreatePolicyForm) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="group">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span
              className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {sectionIndex + 1}.
            </span>
            <div>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {section.policies?.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;

                if (!over || active.id === over.id || !section.policies) {
                  return;
                }

                const oldIndex = section.policies.findIndex((policy) => policy.id === active.id);
                const newIndex = section.policies.findIndex((policy) => policy.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                  const newPolicies = arrayMove(section.policies, oldIndex, newIndex);
                  onReorderPolicies(section.id, newPolicies.map((policy) => policy.id));
                }
              }}
            >
              <SortableContext
                items={section.policies.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {section.policies.map((policy, policyIndex) => (
                    <SortablePolicy
                      key={policy.id}
                      policy={policy}
                      sectionIndex={sectionIndex}
                      policyIndex={policyIndex}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <CardTitle className="text-base">{policy.title}</CardTitle>
                            <CardDescription className="text-xs">
                              Status: {policy.status}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                  <DialogTitle>Edit Policy</DialogTitle>
                                  <DialogDescription>
                                    Update the policy details below.
                                  </DialogDescription>
                                </DialogHeader>
                                {policy.currentVersion && (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const formData = new FormData(e.currentTarget);
                                      const title = formData.get('title') as string;
                                      const bodyContent = formData.get('bodyContent') as string;
                                      onUpdatePolicy(policy.id, {
                                        title,
                                        bodyContent: bodyContent
                                      });
                                    }}
                                    className="space-y-4 flex-1 overflow-y-auto pr-1"
                                  >
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Title</label>
                                      <Input
                                        name="title"
                                        defaultValue={policy.title}
                                        placeholder="Enter policy title"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Content</label>
                                      <input
                                        type="hidden"
                                        name="bodyContent"
                                        id="bodyContent"
                                      />
                                      <RichTextEditor
                                        content={policy.currentVersion.bodyContent}
                                        onChange={(html) => {
                                          const element = document.getElementById('bodyContent');
                                          if (element) {
                                            (element as HTMLInputElement).value = html;
                                          }
                                        }}
                                        className="min-h-[250px] max-h-[350px] overflow-y-auto"
                                      />
                                    </div>
                                    <div className="h-4"></div> {/* Spacer to ensure footer visibility */}
                                    <DialogFooter className="sticky bottom-0 bg-background pt-2 border-t mt-4">
                                      <Button type="submit">
                                        Update Policy
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                )}
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this policy? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDeletePolicy(policy.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Policy
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </SortablePolicy>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {(!section.policies || section.policies.length === 0) && (
            <div className="text-center py-4 text-muted-foreground">
              No policies in this section yet.
            </div>
          )}
          <AddPolicyDialog
            sectionId={section.id}
            onSubmit={(data) => onCreatePolicy(section.id, data)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ManualDetail() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form
  const sectionForm = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Queries and Mutations
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
    mutationFn: async ({ sectionId, formData }: { sectionId: number; formData: CreatePolicyForm }) => {
      if (!user?.id) {
        throw new Error("Authentication required");
      }

      const policyData = {
        policy: {
          title: formData.title,
          sectionId: sectionId,
          createdById: user.id,
          status: "DRAFT",
        },
        version: {
          bodyContent: formData.bodyContent,
          effectiveDate: formData.effectiveDate,
          createdById: user.id,
          authorId: user.id,
          versionNumber: 1,
        }
      };

      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyData),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/manuals/${id}`] });
      toast({
        title: "Policy Created",
        description: `"${data.policy.title}" has been created and saved as a draft`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Policy",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
        duration: 7000,
      });
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ policyId, data }: {
      policyId: number;
      data: {
        title: string;
        bodyContent?: string;
        status?: "DRAFT" | "LIVE"
      }
    }) => {
      // If we have bodyContent, we need to create a new version
      if (data.bodyContent) {
        // First update the policy title if needed
        await fetch(`/api/policies/${policyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            status: data.status
          }),
          credentials: 'include',
        });

        // Then create a new version with the updated content
        const versionResponse = await fetch(`/api/policies/${policyId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bodyContent: data.bodyContent,
            effectiveDate: new Date().toISOString().split('T')[0], // Today
            changeSummary: "Updated policy content"
          }),
          credentials: 'include',
        });

        if (!versionResponse.ok) {
          throw new Error(await versionResponse.text());
        }

        // Get the updated policy with the new version
        const policyResponse = await fetch(`/api/policies/${policyId}`, {
          credentials: 'include',
        });

        if (!policyResponse.ok) {
          throw new Error(await policyResponse.text());
        }

        return policyResponse.json();
      }
      else {
        // Just update the policy title/status
        const response = await fetch(`/api/policies/${policyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/manuals/${id}`] });
      toast({
        title: "Policy Updated",
        description: `"${data.title}" has been updated successfully`,
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update policy",
        variant: "destructive",
        duration: 7000,
      });
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (policyId: number) => {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/manuals/${id}`] });
      toast({
        title: "Policy Deleted",
        description: "The policy has been successfully deleted",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete policy",
        variant: "destructive",
        duration: 7000,
      });
    },
  });

  const reorderPolicies = useMutation({
    mutationFn: async ({ sectionId, policyIds }: { sectionId: number; policyIds: number[] }) => {
      const response = await fetch(`/api/sections/${sectionId}/policies/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderMap: policyIds }),
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
        title: "Policies Reordered",
        description: "The policy order has been updated successfully.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Reorder Failed",
        description: `Failed to reorder policies: ${error instanceof Error ? error.message : 'Please try again'}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const reorderSections = useMutation({
    mutationFn: async (sectionIds: number[]) => {
      const response = await fetch(`/api/manuals/${id}/sections/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderMap: sectionIds }),
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
        description: "Sections reordered successfully",
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !manual?.sections) {
      return;
    }

    const oldIndex = manual.sections.findIndex((section) => section.id === active.id);
    const newIndex = manual.sections.findIndex((section) => section.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSections = arrayMove(manual.sections, oldIndex, newIndex);
      reorderSections.mutate(newSections.map((section) => section.id));
    }
  };

  // Loading and Error States
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading manual: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!manual) {
    return <div>Manual not found</div>;
  }

  // Render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/manuals">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{manual.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog manualTitle={manual.title} sections={manual.sections} />
        </div>
      </div>

      <p className="text-muted-foreground">{manual.description}</p>

      <PolicyAITools />

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
                <form onSubmit={sectionForm.handleSubmit(data => createSection.mutate(data))} className="space-y-4">
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={manual.sections?.map((s) => s.id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {manual.sections?.map((section, sectionIndex) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  onReorderPolicies={(sectionId, policyIds) => {
                    reorderPolicies.mutate({ sectionId, policyIds });
                  }}
                  onUpdatePolicy={(policyId, data) => {
                    updatePolicy.mutate({ policyId, data });
                  }}
                  onDeletePolicy={(policyId) => {
                    deletePolicy.mutate(policyId);
                  }}
                  onCreatePolicy={(sectionId, formData) => {
                    createPolicy.mutate({ sectionId, formData });
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {(!manual.sections || manual.sections.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No sections found. Add your first section to get started.
          </div>
        )}
      </div>
    </div>
  );
}