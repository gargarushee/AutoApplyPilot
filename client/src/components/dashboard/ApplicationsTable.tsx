import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Search, Eye, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { ReviewModal } from "@/components/modals/ReviewModal";

export function ApplicationsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/applications'],
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      toast({
        title: "Application deleted",
        description: "The application has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredApplications = applications.filter((app: any) => {
    const matchesSearch = app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      pending_review: { variant: "outline", color: "bg-yellow-100 text-yellow-800" },
      submitted: { variant: "default", color: "bg-green-100 text-green-800" },
      failed: { variant: "destructive", color: "bg-red-100 text-red-800" },
      parsing: { variant: "secondary", color: "bg-blue-100 text-blue-800" },
    };

    const config = variants[status] || variants.parsing;
    
    return (
      <Badge className={config.color}>
        {status === 'pending_review' && '⏱️ '}
        {status === 'submitted' && '✅ '}
        {status === 'failed' && '❌ '}
        {status === 'parsing' && '🔄 '}
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const handleReviewApplication = async (app: any) => {
    setSelectedApplication(app);
    setShowReviewModal(true);
  };

  const handleDeleteApplication = (id: string) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      deleteApplicationMutation.mutate(id);
    }
  };

  const handleRetryApplication = (app: any) => {
    // For demo purposes, just show a toast
    toast({
      title: "Retry initiated",
      description: `Retrying application for ${app.jobTitle} at ${app.company}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="applications-table">
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Applications</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64"
                    data-testid="input-search-applications"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No applications found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((application: any) => (
                    <tr key={application.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground" data-testid={`job-title-${application.id}`}>
                          {application.jobTitle}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`job-location-${application.id}`}>
                          {application.location || 'Location not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-medium text-muted-foreground">
                              {application.company[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-foreground" data-testid={`company-${application.id}`}>
                            {application.company}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" data-testid={`platform-${application.id}`}>
                          {application.platform}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" data-testid={`status-${application.id}`}>
                        {getStatusBadge(application.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`date-${application.id}`}>
                        {formatDistanceToNow(new Date(application.createdAt || ''), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {application.status === 'pending_review' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReviewApplication(application)}
                              data-testid={`button-review-${application.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {application.status === 'submitted' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(application.jobUrl, '_blank')}
                              data-testid={`button-view-${application.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {application.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetryApplication(application)}
                              data-testid={`button-retry-${application.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteApplication(application.id)}
                            data-testid={`button-delete-${application.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {filteredApplications.length > 0 && (
            <div className="px-6 py-4 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredApplications.length} of {applications.length} applications
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showReviewModal && selectedApplication && (
        <ReviewModal
          application={selectedApplication}
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedApplication(null);
          }}
        />
      )}
    </>
  );
}
