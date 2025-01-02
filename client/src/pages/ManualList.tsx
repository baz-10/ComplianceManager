import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Book } from "lucide-react";

export function ManualList() {
  const { data: manuals, isLoading, error } = useQuery({
    queryKey: ['/api/manuals'],
  });

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Manual
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {manuals?.map((manual) => (
          <Link key={manual.id} href={`/manuals/${manual.id}`}>
            <Card className="cursor-pointer hover:bg-accent transition-colors">
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
          </Link>
        ))}
      </div>

      {manuals?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No manuals found. Create your first manual to get started.
        </div>
      )}
    </div>
  );
}
