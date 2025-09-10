import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PaperPlaneIcon, ClockIcon, CheckCircledIcon } from "@radix-ui/react-icons";

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    totalApplications: number;
    pendingReview: number;
    successRate: number;
  }>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = stats || {
    totalApplications: 0,
    pendingReview: 0,
    successRate: 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="stats-cards">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-total-applications">
                {statsData.totalApplications}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <PaperPlaneIcon className="text-primary h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="text-green-600">+12%</span> from last month
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-review">
                {statsData.pendingReview}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <ClockIcon className="text-yellow-600 h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Awaiting your approval</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-success-rate">
                {statsData.successRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircledIcon className="text-green-600 h-6 w-6" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Auto-fill accuracy</p>
        </CardContent>
      </Card>
    </div>
  );
}
