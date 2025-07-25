import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  Shield, 
  AlertTriangle, 
  FileText, 
  Users, 
  Calendar as CalendarIcon,
  Download,
  Filter,
  Search,
  Eye,
  RefreshCw
} from "lucide-react";

interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  change_details: string;
  ip_address: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  compliance_flags: string[];
  created_at: string;
  username: string;
  role: string;
}

interface ComplianceReport {
  overview: {
    critical_events: number;
    high_events: number;
    export_events: number;
    publish_events: number;
    acknowledgment_events: number;
    casa_events: number;
  };
  userActivity: Array<{
    username: string;
    role: string;
    total_actions: number;
    high_risk_actions: number;
    last_activity: string;
  }>;
  policyCompliance: Array<{
    policy_title: string;
    section_title: string;
    manual_title: string;
    total_users: number;
    acknowledged_users: number;
    compliance_percentage: number;
    recent_acknowledgments: number;
  }>;
}

export function ComplianceDashboard() {
  const [auditFilters, setAuditFilters] = useState({
    entityType: '',
    action: '',
    severity: '',
    userId: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    page: 1
  });

  const [reportDateRange, setReportDateRange] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null
  });

  // Fetch audit trail data
  const { data: auditData, refetch: refetchAudit, isLoading: auditLoading } = useQuery({
    queryKey: ['/api/admin/audit-trail', auditFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditFilters.entityType) params.set('entityType', auditFilters.entityType);
      if (auditFilters.action) params.set('action', auditFilters.action);
      if (auditFilters.severity) params.set('severity', auditFilters.severity);
      if (auditFilters.userId) params.set('userId', auditFilters.userId);
      if (auditFilters.startDate) params.set('startDate', auditFilters.startDate.toISOString());
      if (auditFilters.endDate) params.set('endDate', auditFilters.endDate.toISOString());
      params.set('page', auditFilters.page.toString());
      
      const response = await fetch(`/api/admin/audit-trail?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      return response.json();
    }
  });

  // Fetch compliance report
  const { data: complianceData, refetch: refetchCompliance, isLoading: complianceLoading } = useQuery<ComplianceReport>({
    queryKey: ['/api/admin/compliance-report', reportDateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportDateRange.startDate) params.set('startDate', reportDateRange.startDate.toISOString());
      if (reportDateRange.endDate) params.set('endDate', reportDateRange.endDate.toISOString());
      
      const response = await fetch(`/api/admin/compliance-report?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch compliance report');
      return response.json();
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT': return <Users className="h-4 w-4" />;
      case 'EXPORT': return <Download className="h-4 w-4" />;
      case 'PUBLISH': return <FileText className="h-4 w-4" />;
      case 'ACKNOWLEDGE': return <Shield className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">CASA Compliance Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => refetchAudit()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="compliance-report">Compliance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {complianceData && (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {complianceData.overview.critical_events}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CASA Compliance Events</CardTitle>
                    <Shield className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceData.overview.casa_events}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Policy Publications</CardTitle>
                    <FileText className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceData.overview.publish_events}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Top User Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>User Activity Summary</CardTitle>
                  <CardDescription>Most active users and their compliance actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Total Actions</TableHead>
                        <TableHead>High Risk Actions</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceData.userActivity.slice(0, 10).map((user, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.total_actions}</TableCell>
                          <TableCell>
                            {user.high_risk_actions > 0 && (
                              <Badge variant="destructive">{user.high_risk_actions}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_activity ? new Date(user.last_activity).toLocaleString() : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          {/* Audit Trail Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Audit Trail Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Select
                  value={auditFilters.entityType}
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, entityType: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="policy_version">Policy Version</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={auditFilters.action}
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, action: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="PUBLISH">Publish</SelectItem>
                    <SelectItem value="ACKNOWLEDGE">Acknowledge</SelectItem>
                    <SelectItem value="EXPORT">Export</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={auditFilters.severity}
                  onValueChange={(value) => setAuditFilters(prev => ({ ...prev, severity: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Severities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {auditFilters.startDate ? format(auditFilters.startDate, "PPP") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={auditFilters.startDate}
                      onSelect={(date) => setAuditFilters(prev => ({ ...prev, startDate: date, page: 1 }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Audit Log Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Log Entries</CardTitle>
              <CardDescription>
                Complete audit trail for CASA compliance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8">Loading audit trail...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Compliance Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData?.auditLogs?.map((log: AuditLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.username || 'System'}</div>
                            <div className="text-xs text-muted-foreground">{log.role}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            {log.action}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{log.entity_type}</div>
                            <div className="text-muted-foreground">ID: {log.entity_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {log.change_details}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.compliance_flags?.map((flag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {auditData?.pagination && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Total: {auditData.pagination.totalItems} entries
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!auditData.pagination.hasPrev}
                      onClick={() => setAuditFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!auditData.pagination.hasNext}
                      onClick={() => setAuditFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-report" className="space-y-4">
          {complianceData && (
            <>
              {/* Policy Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Policy Compliance Status</CardTitle>
                  <CardDescription>
                    Individual policy acknowledgment rates and compliance tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Manual</TableHead>
                        <TableHead>Acknowledged Users</TableHead>
                        <TableHead>Compliance Rate</TableHead>
                        <TableHead>Recent Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceData.policyCompliance.map((policy, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{policy.policy_title}</TableCell>
                          <TableCell>{policy.section_title}</TableCell>
                          <TableCell>{policy.manual_title}</TableCell>
                          <TableCell>
                            {policy.acknowledged_users} / {policy.total_users}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16">
                                <div 
                                  className="h-2 bg-gray-200 rounded-full overflow-hidden"
                                >
                                  <div 
                                    className={`h-full ${
                                      policy.compliance_percentage >= 80 
                                        ? 'bg-green-500' 
                                        : policy.compliance_percentage >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${policy.compliance_percentage}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-medium">
                                {policy.compliance_percentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {policy.recent_acknowledgments} this period
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}