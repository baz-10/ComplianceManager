import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export function ManualDetail() {
  const { id } = useParams();
  const { data: manual, isLoading, error } = useQuery({
    queryKey: [`/api/manuals/${id}`],
  });

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
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        <div className="grid gap-4">
          {manual.sections?.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {section.policies?.length || 0} policies
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
