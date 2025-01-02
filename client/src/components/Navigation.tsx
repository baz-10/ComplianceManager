import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/manuals", label: "Manuals" },
    ...(user?.role === 'ADMIN' ? [
      { href: "/admin/dashboard", label: "Performance", icon: Activity }
    ] : [])
  ];

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
          </div>
          {user && (
            <div className="ml-auto text-sm text-muted-foreground">
              {user.username} ({user.role})
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}