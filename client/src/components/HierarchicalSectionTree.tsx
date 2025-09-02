import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  Plus, 
  Trash2, 
  FileText,
  Indent,
  Outdent,
  CheckCircle
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  rectIntersection,
  getFirstCollision,
  pointerWithin,
  Active,
  Over,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Schema for creating sections
const createSectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type CreateSectionForm = z.infer<typeof createSectionSchema>;

// Enhanced interface for hierarchical sections
export interface HierarchicalSection {
  id: number;
  title: string;
  description?: string;
  level: number;
  sectionNumber: string;
  parentSectionId?: number | null;
  isCollapsed: boolean;
  children: HierarchicalSection[];
  policies: Policy[];
  orderIndex: number;
}

interface Policy {
  id: number;
  title: string;
  status: "DRAFT" | "LIVE";
  currentVersionId: number | null;
  currentVersion?: {
    bodyContent: string;
  };
  isAcknowledged?: boolean;
}

function PolicyRow({
  policy,
  canManage,
  canPublish,
  onUpdatePolicy,
  onDeletePolicy,
}: {
  policy: Policy;
  canManage: boolean;
  canPublish: boolean;
  onUpdatePolicy?: (policyId: number, data: { title: string; status?: 'DRAFT' | 'LIVE'; bodyContent?: string }) => void;
  onDeletePolicy?: (policyId: number) => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [title, setTitle] = useState(policy.title);
  const [content, setContent] = useState<string>(policy.currentVersion?.bodyContent || "");

  return (
    <div className="bg-background rounded-lg p-3 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-foreground">{policy.title}</h4>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              policy.status === 'LIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {policy.status}
          </span>
          {canManage && (
            <>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsEditOpen(true)}>
                Edit
              </Button>
              {canPublish && onUpdatePolicy && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onUpdatePolicy(policy.id, { title: policy.title, status: policy.status === 'DRAFT' ? 'LIVE' : 'DRAFT' })}
                >
                  {policy.status === 'DRAFT' ? 'Publish' : 'Unpublish'}
                </Button>
              )}
              {onDeletePolicy && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeletePolicy(policy.id)}
                  title="Delete policy"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {policy.currentVersion?.bodyContent && (
        <div className="text-sm text-muted-foreground">
          <div className="prose prose-sm max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: policy.currentVersion.bodyContent.substring(0, 200) + '...' }} />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>Update the policy title and content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter policy title" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor content={content} onChange={setContent} className="min-h-[250px] max-h-[350px] overflow-y-auto" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            {onUpdatePolicy && (
              <Button
                onClick={() => {
                  onUpdatePolicy(policy.id, { title, bodyContent: content });
                  setIsEditOpen(false);
                }}
              >
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface HierarchicalSectionTreeProps {
  sections: HierarchicalSection[];
  manualId: number;
  onCreateSection: (data: CreateSectionForm & { parentSectionId?: number }) => void;
  onUpdateSection: (sectionId: number, data: Partial<HierarchicalSection>) => void;
  onDeleteSection: (sectionId: number) => void;
  onMoveSection: (sectionId: number, parentSectionId: number | null, orderIndex: number) => void;
  onToggleCollapse: (sectionId: number) => void;
  onReorderSections: (hierarchicalOrder: any[]) => void;
  onCreatePolicy?: (sectionId: number, data: any) => void;
  onUpdatePolicy?: (policyId: number, data: { title: string; status?: 'DRAFT' | 'LIVE'; bodyContent?: string }) => void;
  onDeletePolicy?: (policyId: number) => void;
}

// Simple AddPolicyButton component
const createPolicySchema = z.object({
  title: z.string().min(1, "Title is required"),
  bodyContent: z.string().min(1, "Content is required"),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  aiTopic: z.string().optional(),
  aiContext: z.string().optional(),
  publishNow: z.boolean().optional(),
});

type CreatePolicyForm = z.infer<typeof createPolicySchema>;

function AddPolicyButton({ sectionId, onCreatePolicy }: { sectionId: number; onCreatePolicy?: (sectionId: number, data: CreatePolicyForm) => Promise<any> | void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<CreatePolicyForm>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      title: "",
      bodyContent: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      aiTopic: "",
      aiContext: "",
      publishNow: false,
    },
  });
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!onCreatePolicy) {
    return (
      <Button variant="outline" size="sm" className="w-full mt-3" disabled>
        <Plus className="h-4 w-4 mr-2" />
        Add Policy
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3 text-primary hover:bg-primary/10 border-primary/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              try {
                await Promise.resolve(onCreatePolicy(sectionId, data));
                form.reset();
                setOpen(false);
              } catch (e) {
                // Error toasts handled upstream
              }
            })}
            className="space-y-4 flex-1 overflow-y-auto pr-1"
          >
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

            {/* AI drafting (optional) */}
            <Accordion type="single" collapsible>
              <AccordionItem value="ai-draft">
                <AccordionTrigger>Use AI to draft (optional)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="aiTopic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Flight Safety" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="aiContext"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Context</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Audience, scope, constraints…" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {aiError && (
                      <p className="text-sm text-destructive">{aiError}</p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isGenerating}
                        onClick={async () => {
                          const topic = (form.getValues() as any).aiTopic as string;
                          const context = (form.getValues() as any).aiContext as string;
                          if (!topic || topic.trim().length === 0) {
                            setAiError('Topic is required to generate a draft.');
                            return;
                          }
                          setAiError(null);
                          try {
                            setIsGenerating(true);
                            const res = await fetch('/api/policies/generate-draft', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ topic, context: context || '' })
                            });
                            if (!res.ok) throw new Error(await res.text());
                            const data = await res.json();
                            const draft = (data && typeof data.draft === 'string') ? data.draft : '';
                            if (!draft) {
                              setAiError('No draft text was returned. Please refine the topic or try again.');
                            } else {
                              form.setValue('bodyContent', draft);
                              toast({ title: 'AI draft added', description: 'Review and edit before saving.' });
                            }
                          } catch (err) {
                            setAiError(err instanceof Error ? err.message : 'Unable to generate draft');
                            toast({ title: 'Generation failed', description: aiError ?? 'Unable to generate draft', variant: 'destructive' });
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                      >
                        {isGenerating ? 'Generating…' : 'Generate with AI'}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm">Content</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isGenerating}
                onClick={async () => {
                  const topic = (form.getValues() as any).aiTopic as string;
                  const context = (form.getValues() as any).aiContext as string;
                  if (!topic || topic.trim().length === 0) {
                    toast({ title: 'Topic required', description: 'Enter a topic above before generating.' });
                    return;
                  }
                  try {
                    setIsGenerating(true);
                    const res = await fetch('/api/policies/generate-draft', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ topic, context: context || '' })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    form.setValue('bodyContent', data.draft || '');
                    toast({ title: 'AI draft added', description: 'Review and edit before saving.' });
                  } catch (err) {
                    toast({ title: 'Generation failed', description: err instanceof Error ? err.message : 'Unable to generate draft', variant: 'destructive' });
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                {isGenerating ? 'Generating…' : 'Generate with AI'}
              </Button>
            </div>
            <FormField
              control={form.control}
              name="bodyContent"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      className="min-h-[250px] max-h-[350px] overflow-y-auto"
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
            <FormField
              control={form.control}
              name="publishNow"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Publish now</FormLabel>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit">Create Policy</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Sortable section item component
function SortableHierarchicalSection({
  section,
  level = 0,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onToggleCollapse,
  onMoveSection,
  onCreatePolicy,
  onUpdatePolicy,
  onDeletePolicy,
}: {
  section: HierarchicalSection;
  level?: number;
  onCreateSection: (data: CreateSectionForm & { parentSectionId?: number }) => void;
  onUpdateSection: (sectionId: number, data: Partial<HierarchicalSection>) => void;
  onDeleteSection: (sectionId: number) => void;
  onToggleCollapse: (sectionId: number) => void;
  onMoveSection: (sectionId: number, parentSectionId: number | null, orderIndex: number) => void;
  onCreatePolicy?: (sectionId: number, data: any) => void;
  onUpdatePolicy?: (policyId: number, data: { title: string; status?: 'DRAFT' | 'LIVE'; bodyContent?: string }) => void;
  onDeletePolicy?: (policyId: number) => void;
}) {
  const { user } = useUser();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddSubsectionOpen, setIsAddSubsectionOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const form = useForm<CreateSectionForm>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleCreateSubsection = (data: CreateSectionForm) => {
    onCreateSection({ ...data, parentSectionId: section.id });
    form.reset();
    setIsAddSubsectionOpen(false);
  };

  const indentationLevel = Math.min(level, 4); // Max 4 levels of visual indentation
  const indentationClass = `ml-${indentationLevel * 6}`;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const interactiveTags = ["input", "textarea", "select", "button", "a"];
    if (target && (target.isContentEditable || interactiveTags.includes(target.tagName.toLowerCase()))) {
      return; // ignore typing inside inputs/editors
    }
    if (e.target !== e.currentTarget) {
      return; // only when card itself focused
    }
    // Keyboard support for expand/collapse on tree items
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse(section.id);
    }
    if (e.key === 'ArrowRight') {
      if (section.isCollapsed && section.children.length > 0) {
        e.preventDefault();
        onToggleCollapse(section.id);
      }
    }
    if (e.key === 'ArrowLeft') {
      if (!section.isCollapsed && section.children.length > 0) {
        e.preventDefault();
        onToggleCollapse(section.id);
      }
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`${indentationClass} transition-all duration-200`}>
      <Card
        role="treeitem"
        aria-level={level + 1}
        aria-expanded={!section.isCollapsed}
        aria-label={`${section.sectionNumber} ${section.title}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`group border-l-4 border-l-primary/30 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${isDragging ? 'ring-2 ring-primary/50' : ''}`}
      >
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-3">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <span
              className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1.5 rounded-full shadow-sm"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-primary" />
            </span>

            {/* Collapse/Expand Button */}
            {section.children.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onToggleCollapse(section.id)}
              >
                {section.isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Section Number Badge */}
            <div className="bg-primary/10 rounded-full flex items-center justify-center px-3 py-1 shadow-sm">
              <span className="text-sm font-semibold text-primary">
                {section.sectionNumber}
              </span>
            </div>

            {/* Section Title */}
            <div className="flex-1">
              <CardTitle className="text-primary text-lg">{section.title}</CardTitle>
              {section.description && (
                <CardDescription className="mt-1">{section.description}</CardDescription>
              )}
            </div>

            {/* Policy Count - Clickable */}
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(section.id);
              }}
              title="Click to view policies"
            >
              <FileText className="h-4 w-4" />
              <span>{section.policies.length} policies</span>
              {section.policies.length > 0 && (
                section.isCollapsed ? 
                  <ChevronRight className="h-3 w-3" /> : 
                  <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {/* Action Buttons */}
            {user?.role !== 'READER' && (
              <div className="flex items-center gap-1">
                {/* Add Subsection */}
                <Dialog open={isAddSubsectionOpen} onOpenChange={setIsAddSubsectionOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      title="Add Subsection"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Subsection to "{section.title}"</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleCreateSubsection)} className="space-y-4">
                        <FormField
                          control={form.control}
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
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter section description" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddSubsectionOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Create Subsection</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {/* Indent/Outdent Buttons */}
                {level > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onMoveSection(section.id, null, section.orderIndex)}
                    title="Move to Top Level"
                  >
                    <Outdent className="h-4 w-4" />
                  </Button>
                )}

                {/* Delete Button */}
                {user?.role === 'ADMIN' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setIsDeleteOpen(true)}
                    title="Delete Section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Policy Details - Expandable */}
        {!section.isCollapsed && section.policies.length > 0 && (
          <CardContent className="space-y-3 bg-muted/20">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              Policies in this section:
            </div>
            {section.policies.map((policy) => (
              <PolicyRow
                key={policy.id}
                policy={policy}
                canManage={user?.role === 'ADMIN' || user?.role === 'EDITOR'}
                canPublish={user?.role === 'ADMIN'}
                onUpdatePolicy={onUpdatePolicy}
                onDeletePolicy={onDeletePolicy}
              />
            ))}
          </CardContent>
        )}

        {/* Add Policy Button */}
        {!section.isCollapsed && user?.role !== 'READER' && (
          <CardContent className="pt-0">
            <AddPolicyButton sectionId={section.id} onCreatePolicy={onCreatePolicy} />
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{section.title}"? This will also delete all subsections and policies within this section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSection(section.id);
                setIsDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Child Sections */}
        {!section.isCollapsed && section.children.length > 0 && (
        <div className="mt-2 space-y-2" role="group" aria-label={`Subsections of ${section.title}`}>
          {section.children.map((childSection) => (
            <SortableHierarchicalSection
              key={childSection.id}
              section={childSection}
              level={level + 1}
              onCreateSection={onCreateSection}
              onUpdateSection={onUpdateSection}
              onDeleteSection={onDeleteSection}
              onToggleCollapse={onToggleCollapse}
              onMoveSection={onMoveSection}
              onCreatePolicy={onCreatePolicy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Drop zone component for better UX
function DropZone({ 
  id, 
  level, 
  isActive, 
  label 
}: { 
  id: string; 
  level: number; 
  isActive: boolean; 
  label: string; 
}) {
  const { setNodeRef } = useDroppable({ id });
  const indentationClass = `ml-${Math.min(level, 4) * 6}`;
  
  return (
    <div 
      ref={setNodeRef}
      className={`${indentationClass} transition-all duration-200 ${
        isActive 
          ? 'h-8 bg-primary/20 border-2 border-primary border-dashed rounded-lg' 
          : 'h-2 bg-transparent'
      }`}
      data-testid={`drop-zone-${id}`}
    >
      {isActive && (
        <div className="text-xs text-primary font-medium px-2 py-1 flex items-center">
          {label}
        </div>
      )}
    </div>
  );
}

// Main component
export function HierarchicalSectionTree({
  sections,
  manualId,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onMoveSection,
  onToggleCollapse,
  onReorderSections,
  onCreatePolicy,
}: HierarchicalSectionTreeProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [draggedSection, setDraggedSection] = useState<HierarchicalSection | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      }
    })
  );

  // Flatten sections for easy lookup
  const flattenSections = (sections: HierarchicalSection[]): Map<number, HierarchicalSection> => {
    const result = new Map<number, HierarchicalSection>();
    
    const traverse = (sectionList: HierarchicalSection[]) => {
      sectionList.forEach(section => {
        result.set(section.id, section);
        if (section.children.length > 0) {
          traverse(section.children);
        }
      });
    };
    
    traverse(sections);
    return result;
  };

  const sectionMap = flattenSections(sections);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as number);
    setDraggedSection(sectionMap.get(active.id as number) || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    setDraggedSection(null);

    if (!over || active.id === over.id) {
      return;
    }

    const draggedSectionId = active.id as number;
    const overId = over.id as string;
    
    // Parse drop target
    if (overId.startsWith('drop-zone-')) {
      const [, , type, targetId, position] = overId.split('-');
      
      if (type === 'section') {
        const targetSectionId = parseInt(targetId);
        const targetSection = sectionMap.get(targetSectionId);
        
        if (!targetSection) return;
        
        let newParentId: number | null = null;
        let newOrderIndex = 0;
        
        if (position === 'child') {
          // Drop as child of target section
          newParentId = targetSectionId;
          newOrderIndex = targetSection.children.length;
        } else if (position === 'after') {
          // Drop after target section at same level
          newParentId = targetSection.parentSectionId || null;
          newOrderIndex = targetSection.orderIndex + 1;
        } else if (position === 'before') {
          // Drop before target section at same level
          newParentId = targetSection.parentSectionId || null;
          newOrderIndex = targetSection.orderIndex;
        }
        
        // Prevent dropping section as child of itself or its descendants
        if (newParentId && isDescendant(newParentId, draggedSectionId, sectionMap)) {
          console.warn('Cannot drop section as child of itself or its descendants');
          return;
        }
        
        onMoveSection(draggedSectionId, newParentId, newOrderIndex);
      } else if (type === 'root') {
        // Drop at root level
        const rootSections = sections.filter(s => !s.parentSectionId);
        const newOrderIndex = position === 'end' ? rootSections.length : 0;
        onMoveSection(draggedSectionId, null, newOrderIndex);
      }
    } else {
      // Direct drop on section - make it a child
      const targetSectionId = parseInt(overId);
      const targetSection = sectionMap.get(targetSectionId);
      
      if (targetSection && !isDescendant(targetSectionId, draggedSectionId, sectionMap)) {
        onMoveSection(draggedSectionId, targetSectionId, targetSection.children.length);
      }
    }
  };

  // Helper function to check if a section is a descendant of another
  const isDescendant = (
    ancestorId: number, 
    descendantId: number, 
    sectionMap: Map<number, HierarchicalSection>
  ): boolean => {
    const descendant = sectionMap.get(descendantId);
    if (!descendant || !descendant.parentSectionId) return false;
    
    if (descendant.parentSectionId === ancestorId) return true;
    
    return isDescendant(ancestorId, descendant.parentSectionId, sectionMap);
  };

  // Flatten sections for sortable context IDs
  const flatSectionIds = Array.from(sectionMap.keys());

  // Generate drop zones
  const generateDropZones = (sectionList: HierarchicalSection[], level: number = 0): JSX.Element[] => {
    const dropZones: JSX.Element[] = [];
    
    sectionList.forEach((section, index) => {
      // Drop zone before section
      if (index === 0) {
        dropZones.push(
          <DropZone
            key={`drop-zone-section-${section.id}-before`}
            id={`drop-zone-section-${section.id}-before`}
            level={level}
            isActive={overId === `drop-zone-section-${section.id}-before`}
            label={`Drop before "${section.title}"`}
          />
        );
      }
      
      // The section itself
      dropZones.push(
        <div key={`section-${section.id}`}>
          <SortableHierarchicalSection
            section={section}
            level={level}
            onCreateSection={onCreateSection}
            onUpdateSection={onUpdateSection}
            onDeleteSection={onDeleteSection}
            onToggleCollapse={onToggleCollapse}
            onMoveSection={onMoveSection}
            onCreatePolicy={onCreatePolicy}
          />
          
          {/* Drop zone for children */}
          {!section.isCollapsed && (
            <div className="relative">
              <DropZone
                key={`drop-zone-section-${section.id}-child`}
                id={`drop-zone-section-${section.id}-child`}
                level={level + 1}
                isActive={overId === `drop-zone-section-${section.id}-child`}
                label={`Drop as subsection of "${section.title}"`}
              />
              
              {/* Render children */}
              {section.children.length > 0 && (
                <div className="space-y-2">
                  {generateDropZones(section.children, level + 1)}
                </div>
              )}
            </div>
          )}
        </div>
      );
      
      // Drop zone after section
      dropZones.push(
        <DropZone
          key={`drop-zone-section-${section.id}-after`}
          id={`drop-zone-section-${section.id}-after`}
          level={level}
          isActive={overId === `drop-zone-section-${section.id}-after`}
          label={`Drop after "${section.title}"`}
        />
      );
    });
    
    return dropZones;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={flatSectionIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2" role="tree" aria-label="Document sections">
          {/* Root level drop zone */}
          <DropZone
            id="drop-zone-root-start"
            level={0}
            isActive={overId === "drop-zone-root-start"}
            label="Drop at beginning"
          />
          
          {sections.length > 0 ? (
            <>
              {generateDropZones(sections)}
              
              {/* Final root drop zone */}
              <DropZone
                id="drop-zone-root-end"
                level={0}
                isActive={overId === "drop-zone-root-end"}
                label="Drop at end"
              />
            </>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first section to start organizing your manual.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </SortableContext>
      
      {/* Drag overlay */}
      <DragOverlay>
        {activeId && draggedSection ? (
          <Card className="opacity-90 shadow-lg border-primary/50 transform rotate-3">
            <CardHeader className="py-2">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full flex items-center justify-center px-3 py-1">
                  <span className="text-sm font-semibold text-primary">
                    {draggedSection.sectionNumber}
                  </span>
                </div>
                <CardTitle className="text-primary text-sm">{draggedSection.title}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
