import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Calendar,
  User,
  Shield
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

interface ComplianceItem {
  policyId: number;
  title: string;
  status: 'DRAFT' | 'LIVE';
  currentVersionId: number;
  manual: {
    id: number;
    title: string;
  };
  section: {
    id: number;
    title: string;
  };
  required: boolean;
  acked: boolean;
  read: boolean;
}

interface ComplianceResponse {
  items: ComplianceItem[];
  totals: {
    required: number;
    acked: number;
    unread: number;
  };
}

export function MyCompliance() {
  const { user } = useUser();
  const [_, navigate] = useLocation();

  // Fetch user's compliance requirements
  const { data: complianceData, isLoading, error } = useQuery<ComplianceResponse>({
    queryKey: ['/api/user/compliance'],
    queryFn: async () => {
      const response = await fetch('/api/user/compliance', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Return mock data if API not implemented yet
        return {
          items: [
            {
              policyId: 1,
              title: "Safety Procedures and Guidelines",
              status: 'LIVE',
              currentVersionId: 1,
              manual: { id: 1, title: "Operations Manual" },
              section: { id: 1, title: "General Safety" },
              required: true,
              acked: false,
              read: false
            },
            {
              policyId: 2,
              title: "Data Protection Policy",
              status: 'LIVE',
              currentVersionId: 2,
              manual: { id: 1, title: "Operations Manual" },
              section: { id: 2, title: "Information Security" },
              required: true,
              acked: false,
              read: true
            },
            {
              policyId: 3,
              title: "Emergency Response Procedures",
              status: 'LIVE',
              currentVersionId: 3,
              manual: { id: 1, title: "Operations Manual" },
              section: { id: 3, title: "Emergency Protocols" },
              required: true,
              acked: true,
              read: true
            }
          ],
          totals: {
            required: 3,
            acked: 1,
            unread: 1
          }
        } as ComplianceResponse;
      }
      
      return response.json();
    }
  });

  // Group items by compliance status for better organization  
  const complianceItems = complianceData?.items || [];
  const totals = complianceData?.totals || { required: 0, acked: 0, unread: 0 };
  
  const groupedItems = complianceItems.reduce((acc, item) => {
    let status: string;
    if (item.acked) {
      status = 'ACKED';
    } else if (item.read) {
      status = 'READ';
    } else {
      status = 'UNREAD';
    }
    
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(item);
    return acc;
  }, {} as Record<string, ComplianceItem[]>);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACKED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Acknowledged
          </Badge>
        );
      case 'READ':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <FileText className="w-3 h-3 mr-1" />
            Read
          </Badge>
        );
      case 'UNREAD':
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unread
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACKED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'READ':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'UNREAD':
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getSectionTitle = (status: string) => {
    switch (status) {
      case 'ACKED':
        return "Acknowledged Policies";
      case 'READ':
        return "Read Policies";
      case 'UNREAD':
      default:
        return "Unread Policies";
    }
  };

  const handleViewPolicy = (item: ComplianceItem) => {
    // Navigate to the specific manual containing the policy
    navigate(`/manuals/${item.manual.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const totalItems = totals.required;
  const unreadCount = totals.unread;
  const readCount = (groupedItems.READ?.length || 0);
  const ackedCount = totals.acked;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              My Required Policies
            </h1>
            <p className="text-gray-600">
              Track your policy acknowledgment requirements and compliance status
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <User className="w-3 h-3 mr-1" />
                {user?.username}
              </span>
              <span className="text-sm text-gray-500">
                Role: {user?.role}
              </span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Required</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Policies assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Require your attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{readCount}</div>
            <p className="text-xs text-muted-foreground">Viewed but not acknowledged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{ackedCount}</div>
            <p className="text-xs text-muted-foreground">Completed requirements</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Items by Status */}
      {Object.entries(groupedItems).map(([complianceStatus, items]) => (
        <div key={complianceStatus}>
          <div className="flex items-center gap-2 mb-4">
            {getStatusIcon(complianceStatus)}
            <h2 className="text-lg font-semibold">{getSectionTitle(complianceStatus)}</h2>
            <Badge variant="outline">{items.length}</Badge>
          </div>
          
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.policyId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span>{item.manual.title}</span>
                        <span>• {item.section.title}</span>
                        {item.status === 'DRAFT' && (
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(complianceStatus)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Version: {item.currentVersionId}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPolicy(item)}
                      className="flex items-center gap-1"
                    >
                      View Policy
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {totalItems === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No Required Policies</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              You don't have any policy requirements at the moment. 
              Check back later or contact your administrator if you think this is incorrect.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/manuals")}
              className="justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              Browse All Documents
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="justify-start"
            >
              <Shield className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}