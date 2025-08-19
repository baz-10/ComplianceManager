import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, BookOpen, Home, LogOut, Users, FileText, CheckCircle, Shield, Archive, Plane, Compass, Building2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/manuals", label: "Operations Manual", icon: BookOpen },
  ];

  const adminItems = [
    { href: "/admin/dashboard", label: "Analytics", icon: Activity },
    { href: "/admin/users", label: "Pilot Management", icon: Users },
    { href: "/organization/settings", label: "Organization", icon: Building2 },
    { href: "/admin/compliance", label: "CASA Compliance", icon: Shield },
    { href: "/admin/archived-manuals", label: "Archived", icon: Archive }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Get user initials for avatar
  const getInitials = (username: string) => {
    // Extract first letter if it's an email
    if (username.includes('@')) {
      return username.split('@')[0][0].toUpperCase();
    }
    return username[0].toUpperCase();
  };

  return (
    <header className="border-b border-purple-100/50 shadow-lg bg-white/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav className="flex h-18 items-center gap-8">
          <div className="text-2xl font-black flightdocs-text-gradient flex items-center gap-3">
            <div className="relative p-2 rounded-xl flightdocs-card-gradient border border-purple-200/30">
              <Plane className="h-8 w-8 text-purple-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <Compass className="h-2 w-2 text-white" />
              </div>
            </div>
            FlightDocs Pro
            <Badge className="ml-2 px-2 py-1 text-xs glass-card border-purple-200/30">
              Pro
            </Badge>
          </div>
          
          <div className="flex gap-6 ml-8">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 py-1 px-2 rounded-md",
                  location === item.href 
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            {user?.role === 'ADMIN' && (
              <>
                <div className="h-8 w-px bg-border mx-1" />
                {adminItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 py-1 px-2 rounded-md",
                      location === item.href 
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>
          
          {user && (
            <div className="ml-auto flex items-center gap-3">
              <div className="flex flex-col items-end mr-2">
                <span className="text-sm font-medium">
                  {user.username.split('@')[0]}
                </span>
                <span className="text-xs text-muted-foreground flex items-center">
                  {user.role === 'ADMIN' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-primary" />
                      Administrator
                    </>
                  ) : user.role === 'EDITOR' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-blue-500" />
                      Editor
                    </>
                  ) : (
                    <>Reader</>
                  )}
                </span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 bg-primary/10">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user ? getInitials(user.username) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}