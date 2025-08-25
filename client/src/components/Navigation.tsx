import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, BookOpen, Home, LogOut, Users, FileText, CheckCircle, Shield, Archive, Building2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location === href || location.startsWith(href + '/');
  };

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

  const isAdminActive = adminItems.some(item => isActive(item.href));

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
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <nav role="navigation" aria-label="Primary" className="flex h-16 items-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            ComplianceManager
            <Badge variant="secondary" className="ml-1">App</Badge>
          </div>

          {/* Primary links */}
          <div className="flex gap-2 ml-2">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  "text-sm font-medium transition-colors flex items-center gap-2 py-2 px-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}

            {/* Admin group */}
            {user?.role === 'ADMIN' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isAdminActive ? 'secondary' : 'ghost'}
                    className={cn(
                      "py-2 px-3 text-sm font-medium flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isAdminActive && "text-primary"
                    )}
                    aria-current={isAdminActive ? 'page' : undefined}
                    aria-label="Admin navigation"
                  >
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Admin</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminItems.map((item) => (
                    <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                      <DropdownMenuItem className={cn(isActive(item.href) && 'text-primary') }>
                        <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                        {item.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* User menu */}
          {user && (
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-sm font-medium">
                  {user.username.split('@')[0]}
                </span>
                <span className="text-xs text-muted-foreground flex items-center">
                  {user.role === 'ADMIN' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-primary" />
                      Admin
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
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
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
