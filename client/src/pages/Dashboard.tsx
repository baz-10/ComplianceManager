import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Users, Settings, TrendingUp, Shield, Clock, CheckCircle } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalManuals: number;
  totalPolicies: number;
  pendingApprovals: number;
  complianceRate: number;
}

export function Dashboard() {
  const { user } = useUser();
  
  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      if (!response.ok) {
        // Return mock data if API not implemented yet
        return {
          totalManuals: 3,
          totalPolicies: 12,
          pendingApprovals: 2,
          complianceRate: 94.5
        };
      }
      return response.json();
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const quickActions = [
    {
      title: "Create Manual",
      description: "Start a new compliance document",
      icon: FileText,
      href: "/manuals",
      action: "create",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "View All Documents",
      description: "Browse your document library",
      icon: FileText,
      href: "/manuals",
      color: "bg-green-500 hover:bg-green-600"
    },
    ...(user?.role === 'ADMIN' ? [{
      title: "User Management",
      description: "Manage users and permissions",
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500 hover:bg-purple-600"
    }] : []),
    ...(user?.role === 'ADMIN' ? [{
      title: "Compliance Dashboard",
      description: "View audit trails and reports",
      icon: Shield,
      href: "/admin/compliance",
      color: "bg-orange-500 hover:bg-orange-600"
    }] : [])
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {user?.username}!
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome to your compliance management dashboard
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
              <span className="text-sm text-gray-500">
                Last login: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalManuals}</div>
            <p className="text-xs text-muted-foreground">Active compliance documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalPolicies}</div>
            <p className="text-xs text-muted-foreground">Across all documents</p>
          </CardContent>
        </Card>

        {user?.role !== 'READER' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats?.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting your approval</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">Policy acknowledgment rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-white ${action.color}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">Today</span>
              <span>Logged into ComplianceManager</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">Yesterday</span>
              <span>Updated Operations Manual policies</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-muted-foreground">2 days ago</span>
              <span>Acknowledged safety procedures policy</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <Link href="/admin/compliance">
              <Button variant="outline" size="sm" className="w-full">
                View Full Activity Log
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}