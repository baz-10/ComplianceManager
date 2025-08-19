import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  Users, 
  Settings, 
  Shield, 
  Plus,
  Edit2,
  Trash2,
  Crown,
  User,
  Eye,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface Organization {
  id: number;
  name: string;
  description?: string;
  domain?: string;
  settings: {
    allowSelfRegistration?: boolean;
    defaultUserRole?: "ADMIN" | "EDITOR" | "READER";
    maxUsers?: number;
    features?: string[];
  };
  users?: OrganizationUser[];
  createdAt: string;
}

interface OrganizationUser {
  id: number;
  username: string;
  role: "ADMIN" | "EDITOR" | "READER";
  createdAt: string;
}

interface OrganizationStats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalManuals: number;
  organizationId: number;
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'ADMIN': return <Crown className="h-4 w-4 text-yellow-600" />;
    case 'EDITOR': return <Edit2 className="h-4 w-4 text-blue-600" />;
    case 'READER': return <Eye className="h-4 w-4 text-gray-600" />;
    default: return <User className="h-4 w-4" />;
  }
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'ADMIN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'EDITOR': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'READER': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function OrganizationSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', description: '', domain: '' });

  // Only allow admins to access this page
  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground">
              You need admin permissions to access organization settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch organization data
  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ['/api/organization'],
  });

  // Fetch organization users
  const { data: orgUsers, isLoading: usersLoading } = useQuery<OrganizationUser[]>({
    queryKey: ['/api/organization/users'],
  });

  // Fetch organization stats
  const { data: orgStats } = useQuery<OrganizationStats>({
    queryKey: ['/api/organization/stats'],
  });

  // Update organization mutation
  const updateOrganization = useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization'] });
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      setEditingOrg(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/organization/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/stats'] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove user mutation
  const removeUser = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/organization/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organization/stats'] });
      toast({
        title: "Success",
        description: "User removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOrgEdit = () => {
    if (organization) {
      setOrgForm({
        name: organization.name,
        description: organization.description || '',
        domain: organization.domain || ''
      });
      setEditingOrg(true);
    }
  };

  const handleOrgSave = () => {
    updateOrganization.mutate(orgForm);
  };

  if (orgLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Organization Not Found</h3>
            <p className="text-muted-foreground">
              Unable to load organization settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's settings and members
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-2">
          <Building2 className="h-4 w-4 mr-2" />
          {organization.name}
        </Badge>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization Details
                </CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOrgEdit}
                disabled={updateOrganization.isPending}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Organization Name</Label>
              <p className="text-lg font-semibold">{organization.name}</p>
            </div>
            
            {organization.description && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-muted-foreground">{organization.description}</p>
              </div>
            )}
            
            {organization.domain && (
              <div>
                <Label className="text-sm font-medium">Email Domain</Label>
                <p className="text-muted-foreground">{organization.domain}</p>
              </div>
            )}
            
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-muted-foreground">
                {new Date(organization.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organization Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Overview
            </CardTitle>
            <CardDescription>
              Quick stats about your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {orgStats?.totalUsers || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {orgStats?.totalManuals || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Manuals</div>
              </div>
            </div>
            
            {orgStats?.usersByRole && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Users by Role</Label>
                <div className="space-y-2">
                  {Object.entries(orgStats.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        <span className="text-sm">{role}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organization Members
              </CardTitle>
              <CardDescription>
                Manage users and their roles within your organization
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orgUsers?.map((orgUser) => (
                <div
                  key={orgUser.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {getRoleIcon(orgUser.role)}
                    </div>
                    <div>
                      <div className="font-medium">{orgUser.username}</div>
                      <div className="text-sm text-muted-foreground">
                        Joined {new Date(orgUser.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(orgUser.role)}>
                      {orgUser.role}
                    </Badge>
                    
                    {orgUser.id !== user?.id && (
                      <div className="flex gap-1">
                        <Select
                          value={orgUser.role}
                          onValueChange={(role) => updateUserRole.mutate({ userId: orgUser.id, role })}
                          disabled={updateUserRole.isPending}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="EDITOR">Editor</SelectItem>
                            <SelectItem value="READER">Reader</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {orgUser.username} from the organization?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeUser.mutate(orgUser.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                    
                    {orgUser.id === user?.id && (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        You
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={editingOrg} onOpenChange={setEditingOrg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update your organization's basic information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                placeholder="Enter organization name"
              />
            </div>
            
            <div>
              <Label htmlFor="orgDescription">Description</Label>
              <Textarea
                id="orgDescription"
                value={orgForm.description}
                onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                placeholder="Describe your organization"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="orgDomain">Email Domain (Optional)</Label>
              <Input
                id="orgDomain"
                value={orgForm.domain}
                onChange={(e) => setOrgForm({ ...orgForm, domain: e.target.value })}
                placeholder="@company.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Users with this email domain can auto-join the organization
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingOrg(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOrgSave}
              disabled={updateOrganization.isPending}
            >
              {updateOrganization.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}