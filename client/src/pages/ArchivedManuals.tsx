import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive, RotateCcw, Trash2, Clock, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";

interface ArchivedManual {
  id: number;
  title: string;
  description?: string;
  archivedAt: string;
  archiveReason: string;
  archivedBy: {
    username: string;
  };
  scheduledDeletionDate: string;
  daysUntilDeletion: number;
  canBeDeleted: boolean;
}

export function ArchivedManuals() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedManual, setSelectedManual] = useState<ArchivedManual | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: archivedManuals, isLoading, error } = useQuery<ArchivedManual[]>({
    queryKey: ['/api/manuals/archived/list'],
    enabled: user?.role === 'ADMIN',
  });

  const restoreManual = useMutation({
    mutationFn: async (manualId: number) => {
      const response = await fetch(`/api/manuals/${manualId}/restore`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/manuals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/manuals/archived/list'] });
      toast({
        title: "Manual Restored",
        description: `"${data.manual.title}" has been successfully restored.`,
      });
      setIsRestoreOpen(false);
      setSelectedManual(null);
    },
    onError: (error) => {
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore manual",
        variant: "destructive",
      });
    },
  });

  const deleteManual = useMutation({
    mutationFn: async (manualId: number) => {
      const response = await fetch(`/api/manuals/${manualId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manuals/archived/list'] });
      toast({
        title: "Manual Deleted",
        description: "The manual has been permanently deleted.",
      });
      setIsDeleteOpen(false);
      setSelectedManual(null);
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete manual",
        variant: "destructive",
      });
    },
  });

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You don't have permission to view archived manuals.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Loading archived manuals...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading archived manuals: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Archive className="h-8 w-8" />
            Archived Manuals
          </h1>
          <p className="text-muted-foreground mt-1">
            Manuals scheduled for deletion. They can be restored within 30 days of archival.
          </p>
        </div>
      </div>

      {(!archivedManuals || archivedManuals.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No archived manuals found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {archivedManuals.map((manual) => (
            <Card key={manual.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {manual.title}
                    </CardTitle>
                    <CardDescription>{manual.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {manual.daysUntilDeletion === 0 ? (
                      <Badge variant="destructive">
                        Ready for deletion
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {manual.daysUntilDeletion} days remaining
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-muted-foreground">Archived by:</span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {manual.archivedBy.username}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-muted-foreground">Archived on:</span>
                    <span>{format(new Date(manual.archivedAt), 'PPP')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-muted-foreground">Reason:</span>
                    <span className="italic">{manual.archiveReason}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-muted-foreground">Scheduled deletion:</span>
                    <span className={manual.canBeDeleted ? "text-red-600 font-medium" : ""}>
                      {format(new Date(manual.scheduledDeletionDate), 'PPP')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedManual(manual);
                      setIsRestoreOpen(true);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  {manual.canBeDeleted && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedManual(manual);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Manual</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{selectedManual?.title}"? The manual will be moved back to the active manuals list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedManual(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedManual && restoreManual.mutate(selectedManual.id)}
              disabled={restoreManual.isPending}
            >
              {restoreManual.isPending ? "Restoring..." : "Restore Manual"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Manual</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{selectedManual?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedManual(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedManual && deleteManual.mutate(selectedManual.id)}
              disabled={deleteManual.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteManual.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}