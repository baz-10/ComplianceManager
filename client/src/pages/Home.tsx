import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Layers, BarChart3, CheckCircle, AlertCircle, ArrowRight, Users, ClipboardCheck, Plane, Shield, Radar, Compass, Navigation, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

export function Home() {
  const { user } = useUser();
  const [_, navigate] = useLocation();

  const features = [
    {
      icon: Shield,
      title: "CASA Compliance",
      description: "Stay compliant with RPAS regulations and maintain current certifications"
    },
    {
      icon: ClipboardCheck,
      title: "Digital Flight Records",
      description: "Track pilot certifications, aircraft registration, and flight operations"
    },
    {
      icon: Radar,
      title: "Risk Management",
      description: "Automated SORA assessments and operational risk documentation"
    }
  ];

  const stats = [
    { label: "CASA Certified", value: "100%", icon: CheckCircle },
    { label: "Drone Operators", value: "38K+", icon: Plane },
    { label: "Compliance Rate", value: "99.9%", icon: Shield }
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden aviation-hero rounded-xl py-16 px-8 mt-6">
        <div className="relative z-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                <Plane className="mr-2 h-4 w-4" />
                CASA Approved Platform
              </Badge>
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Keep Your RPAS Operations Compliant
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Streamline drone compliance with Australia's leading RPAS documentation platform. 
              Manage certifications, flight records, and risk assessments in one secure location.
            </p>
            
            {/* Stats Row */}
            <div className="flex justify-center space-x-8 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold text-primary">{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                className="px-8 py-3 text-lg aviation-gradient text-white border-0 hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/manuals")}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {user?.role === 'ADMIN' && (
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg border-primary/20 hover:bg-primary/5"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  View Dashboard
                  <BarChart3 className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Modern Background Elements */}
        <div className="absolute top-0 right-0 -mt-32 -mr-32 opacity-5 pointer-events-none">
          <div className="w-96 h-96 rounded-full bg-gradient-to-br from-primary to-secondary"></div>
        </div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 opacity-5 pointer-events-none">
          <Compass className="h-72 w-72 text-primary animate-pulse" />
        </div>
        <div className="absolute top-1/4 right-1/4 opacity-5 pointer-events-none">
          <Navigation className="h-32 w-32 text-secondary rotate-45" />
        </div>
      </div>

      {/* Feature Section */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Built for Australian Drone Operators</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to maintain CASA compliance and manage your RPAS operations efficiently
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="aviation-card group hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-6 text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Manage Your Operations</h2>
          <p className="text-lg text-muted-foreground">
            Access all your drone compliance tools in one centralized platform
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="aviation-card group hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Flight Operations Manual</CardTitle>
                  <CardDescription className="text-sm">Your comprehensive operations guide</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create and maintain your Flight Operations Manual with CASA-compliant procedures and policies.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                View Operations Manual
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="aviation-card group hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Risk Assessments</CardTitle>
                  <CardDescription className="text-sm">SORA and operational risk management</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conduct comprehensive risk assessments using SORA methodology and track hazard mitigation.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                Manage Risk Assessments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="aviation-card group hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-3 rounded-lg">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aircraft & Pilots</CardTitle>
                  <CardDescription className="text-sm">Registration and certification tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track drone registrations, pilot certifications, and maintain current training records.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
                onClick={() => navigate("/manuals")}
              >
                Manage Fleet & Crew
                <ArrowRight className="ml-2 h-4 w-4" />
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