import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { AnnotationThread, CreateAnnotationPayload } from "@/types/annotations";

interface Props {
  policyVersionId: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  onCancel: () => void;
}

export function AddAnnotation({ policyVersionId, selectedText, startOffset, endOffset, onCancel }: Props) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: addAnnotation, isPending } = useMutation<AnnotationThread, Error, CreateAnnotationPayload>({
    mutationFn: async (data) => {
      const response = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/versions/${policyVersionId}/annotations`] 
      });
      toast({
        title: "Annotation added",
        description: "Your annotation has been added successfully.",
      });
      onCancel();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for the annotation.",
        variant: "destructive",
      });
      return;
    }

    addAnnotation({
      policyVersionId,
      content,
      selectedText,
      startOffset,
      endOffset,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <span className="font-medium">Selected text: </span>
        <q className="italic">{selectedText}</q>
      </div>
      <Textarea
        placeholder="Add your annotation..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Adding..." : "Add Annotation"}
        </Button>
      </div>
    </div>
  );
}
