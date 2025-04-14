import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Layers, BarChart3, CheckCircle, AlertCircle, ArrowRight, Users, ClipboardCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

export function Home() {
  const { user } = useUser();
  const [_, navigate] = useLocation();

  const features = [
    {
      icon: BookOpen,
      title: "Centralized Documentation",
      description: "Store all your policies, procedures, and guidelines in one secure location"
    },
    {
      icon: ClipboardCheck,
      title: "Compliance Tracking",
      description: "Monitor who has acknowledged and read critical documents"
    },
    {
      icon: AlertCircle,
      title: "Version Control",
      description: "Track changes and maintain history of all policy updates"
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg py-8 px-8 mt-6">
        <div className="relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Document Management System
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Streamline your organization's documentation with powerful tools for creating, managing, and tracking policies.
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                onClick={() => navigate("/manuals")}
              >
                Browse Manuals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {user?.role === 'ADMIN' && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  View Analytics
                  <BarChart3 className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Background Elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 opacity-10">
          <FileText className="h-64 w-64 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 opacity-10">
          <CheckCircle className="h-48 w-48 text-primary" />
        </div>
      </div>

      {/* Feature Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-center">Key Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="border border-primary/20 bg-white hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="bg-primary/10 p-3 rounded-full w-fit">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-center">Quick Access</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border hover:border-primary/30 transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Manuals
              </CardTitle>
              <CardDescription>Organize your policies into manuals</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create structured manuals to categorize your organization's policies and procedures.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                View Manuals
              </Button>
            </CardFooter>
          </Card>

          <Card className="border hover:border-primary/30 transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Sections
              </CardTitle>
              <CardDescription>Organize content into sections</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Divide your manuals into logical sections for better organization and navigation.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                Browse Sections
              </Button>
            </CardFooter>
          </Card>

          <Card className="border hover:border-primary/30 transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Policies
              </CardTitle>
              <CardDescription>Manage and track policy documents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create, edit, and publish policy documents with version control and acknowledgment tracking.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                View Policies
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Admin Section */}
      {user?.role === 'ADMIN' && (
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-center">Administrative Tools</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 border hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>Track policy compliance and user activity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get insights into policy compliance rates, user engagement, and overall documentation status.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  View Dashboard
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-primary/20 border hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add, edit, and manage user accounts with different permission levels and access rights.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/admin/users")}
                >
                  Manage Users
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}