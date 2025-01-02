import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { AnnotationList } from "./AnnotationList";
import { AddAnnotation } from "./AddAnnotation";
import type { PolicyVersion } from "@db/schema";

interface Props {
  version: PolicyVersion;
}

export function PolicyViewer({ version }: Props) {
  const [selection, setSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      setSelection(null);
      return;
    }

    // Calculate offsets relative to the content div
    const content = contentRef.current;
    const start = range.startOffset;
    const end = range.endOffset;

    setSelection({
      text: selection.toString(),
      startOffset: start,
      endOffset: end,
    });
  }, []);

  return (
    <div className="grid md:grid-cols-[2fr,1fr] gap-4">
      <Card>
        <CardContent className="p-6">
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none"
            onMouseUp={handleTextSelection}
          >
            {version.bodyContent}
          </div>

          {selection && !isAddingAnnotation && (
            <div className="fixed bottom-4 right-4">
              <Button
                size="sm"
                onClick={() => setIsAddingAnnotation(true)}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Add Annotation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isAddingAnnotation && selection && (
          <Card>
            <CardContent className="p-4">
              <AddAnnotation
                policyVersionId={version.id}
                selectedText={selection.text}
                startOffset={selection.startOffset}
                endOffset={selection.endOffset}
                onCancel={() => {
                  setIsAddingAnnotation(false);
                  setSelection(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Annotations</h3>
            <AnnotationList policyVersionId={version.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
