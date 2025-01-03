import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, LogOut, Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/manuals", label: "Manuals" },
  ];

  const adminItems = [
    { href: "/admin/dashboard", label: "Performance", icon: Activity },
    { href: "/admin/users", label: "User Management", icon: Users }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <nav className="flex h-16 items-center gap-6">
          <div className="text-lg font-semibold">
            Document Manager
          </div>
          <div className="flex gap-4">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                  location === item.href 
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ))}

            {user?.role === 'ADMIN' && (
              <>
                <div className="h-4 w-px bg-border mx-2" />
                {adminItems.map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                      location === item.href 
                        ? "text-primary"
                        : "text-muted-foreground"
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
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.username} ({user.role})
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}