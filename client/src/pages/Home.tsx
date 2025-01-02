import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Book, Layers } from "lucide-react";
import { Link } from "wouter";

export function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Document Manager</h1>
        <p className="text-muted-foreground">
          Manage your organization's documentation with ease.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Book className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Manuals</CardTitle>
            <CardDescription>Create and manage document manuals</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/manuals">
              <Button className="w-full">View Manuals</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Layers className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Sections</CardTitle>
            <CardDescription>Organize content into sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Learn More</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Policies</CardTitle>
            <CardDescription>Manage and track policy documents</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Learn More</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
