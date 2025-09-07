import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export function RecentActivity() {
  const { data: activity, isLoading } = useQuery<any[]>({
    queryKey: ['/api/dashboard/activity'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-2 h-2 bg-muted rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activities = activity || [];

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'submitted':
        return 'bg-green-500';
      case 'parsed':
        return 'bg-blue-500';
      case 'uploaded':
        return 'bg-primary';
      case 'pending_review':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <Card data-testid="recent-activity-card">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          ) : (
            activities.map((activityItem: any) => (
              <div key={activityItem.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activityItem.action)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground" data-testid={`activity-message-${activityItem.id}`}>
                    {activityItem.message}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`activity-time-${activityItem.id}`}>
                    {formatDistanceToNow(new Date(activityItem.createdAt || ''), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
