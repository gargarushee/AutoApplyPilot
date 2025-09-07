import { Link, useLocation } from "wouter";
import { 
  Zap, 
  LayoutDashboard, 
  Plus, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Settings, 
  User 
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, current: location === '/' },
    { name: 'New Application', href: '/new', icon: Plus, current: location === '/new' },
    { name: 'All Jobs', href: '/jobs', icon: Briefcase, current: location === '/jobs' },
    { name: 'Resumes', href: '/resumes', icon: FileText, current: location === '/resumes' },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp, current: location === '/analytics' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location === '/settings' },
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border" data-testid="sidebar">
      <div className="flex flex-col h-full">
        {/* Logo and Brand */}
        <div className="flex items-center h-16 px-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="text-primary-foreground text-sm" />
            </div>
            <span className="text-xl font-semibold text-foreground">JobFlow</span>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <a 
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground" data-testid="user-name">Alex Johnson</p>
              <p className="text-xs text-muted-foreground" data-testid="user-email">alex@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
