import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Plus, GripVertical } from "lucide-react";
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
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from 'react';
import { PolicyAITools } from "@/components/PolicyAITools";
import { Loader2 } from "lucide-react";

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
  currentVersion?: {
    bodyContent: string;
  };
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

const createSectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

function SortablePolicy({ policy, sectionIndex, policyIndex, children }: {
  policy: Policy;
  sectionIndex: number;
  policyIndex: number;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: policy.id });

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
          effectiveDate: data.effectiveDate,
          createdById: user.id,
          authorId: user.id,
          versionNumber: 1,
          policyId: 0
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
        effectiveDate: new Date().toISOString().split('T')[0],
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
        title: "Success",
        description: "Policies reordered successfully",
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

  function SortableSection({ section, sectionIndex, children }: {
    section: Section;
    sectionIndex: number;
    children: React.ReactNode;
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} >
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
                    reorderPolicies.mutate({
                      sectionId: section.id,
                      policyIds: newPolicies.map((policy) => policy.id),
                    });
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
                          <CardTitle className="text-base mb-1">{policy.title}</CardTitle>
                          <CardDescription className="text-xs mb-2">
                            Status: {policy.status}
                          </CardDescription>
                          {policy.currentVersion && (
                            <div className="prose prose-sm max-w-none">
                              {policy.currentVersion.bodyContent}
                            </div>
                          )}
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
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Policy</DialogTitle>
                  <DialogDescription>
                    Add a new policy to this section.
                  </DialogDescription>
                </DialogHeader>
                <Form {...policyForm}>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    policyForm.handleSubmit(onSubmitPolicy(section.id))();
                  }} className="space-y-4">
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
                              {...field}
                              rows={6}
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
                    <DialogFooter>
                      <Button type="submit" disabled={createPolicy.isPending}>
                        {createPolicy.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Policy"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
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

      {/* AI Policy Tools */}
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
                >
                </SortableSection>
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