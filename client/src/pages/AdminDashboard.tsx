import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Loader2, Users, FileText, CheckSquare, GitCommit, AlertTriangle } from "lucide-react";

interface Analytics {
  totalStats: {
    total_policies: number;
    total_users: number;
    total_acknowledgements: number;
    total_versions: number;
  };
  userCompliance: Array<{
    user_id: number;
    username: string;
    total_required: number;
    total_acknowledged: number;
    compliance_rate: number;
  }>;
  policiesNeedingAttention: Array<{
    id: number;
    title: string;
    acknowledgement_count: number;
    section_title: string;
    manual_title: string;
    total_users: number;
    completion_rate: number;
  }>;
  recentActivity: Array<{
    username: string;
    policy_title: string;
    acknowledged_at: string;
    activity_type: string;
  }>;
  userEngagement: Array<{
    date: string;
    count: number;
  }>;
  sectionStats: Array<{
    id: number;
    title: string;
    manual_title: string;
    total_policies: number;
    total_acknowledgements: number;
    completion_rate: number;
  }>;
}

export function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ['/api/admin/performance'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Policy Compliance Dashboard</h1>
      </div>

      {/* Overview Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalStats?.total_policies ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalStats?.total_users ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledgements</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalStats?.total_acknowledgements ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policy Versions</CardTitle>
            <GitCommit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalStats?.total_versions ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* User Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>User Compliance</CardTitle>
            <CardDescription>Individual user policy acknowledgement rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.userCompliance ?? []).map((user) => (
                <div key={user.user_id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{user.username}</span>
                    <span className="text-muted-foreground">
                      {user.total_acknowledged} / {user.total_required} policies
                    </span>
                  </div>
                  <Progress value={user.compliance_rate} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Policies Needing Attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>Policies Needing Attention</CardTitle>
            </div>
            <CardDescription>Policies with lowest completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.policiesNeedingAttention ?? []).map((policy) => (
                <div key={policy.id} className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{policy.title}</span>
                      <span className="text-muted-foreground">
                        {policy.acknowledgement_count} / {policy.total_users} users
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {policy.manual_title} - {policy.section_title}
                    </p>
                  </div>
                  <Progress value={policy.completion_rate} className="bg-warning/20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Completion Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Section Completion Rates</CardTitle>
            <CardDescription>Policy acknowledgement rates by section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.sectionStats ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion_rate" fill="hsl(var(--primary))" name="Completion Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest policy acknowledgements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics?.recentActivity ?? []).map((activity, index) => (
                <div key={index} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.username} acknowledged {activity.policy_title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.acknowledged_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Engagement Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Acknowledgements</CardTitle>
            <CardDescription>Policy acknowledgements over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.userEngagement ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}