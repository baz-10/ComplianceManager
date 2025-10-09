import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistance } from "date-fns";
import type { AnnotationThread } from "@/types/annotations";

interface Props {
  policyVersionId: number;
}

export function AnnotationList({ policyVersionId }: Props) {
  const { data: annotations, isLoading } = useQuery<AnnotationThread[]>({
    queryKey: [`/api/versions/${policyVersionId}/annotations`],
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading annotations...</div>;
  }

  if (!annotations?.length) {
    return <div className="text-muted-foreground">No annotations yet.</div>;
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 p-4">
        {annotations.map((annotation) => (
          <Card key={annotation.id}>
            <CardContent className="pt-4">
              <div className="mb-2">
                <span className="font-medium">{annotation.user.username}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {formatDistance(new Date(annotation.createdAt), new Date(), { addSuffix: true })}
                </span>
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium">Selected text: </span>
                <q className="italic">{annotation.selectedText}</q>
              </div>
              <p className="text-sm">{annotation.content}</p>
              
              {annotation.replies?.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 space-y-4">
                  {annotation.replies.map((reply) => (
                    <div key={reply.id} className="text-sm">
                      <div className="mb-1">
                        <span className="font-medium">{reply.user.username}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatDistance(new Date(reply.createdAt), new Date(), { addSuffix: true })}
                        </span>
                      </div>
                      <p>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
