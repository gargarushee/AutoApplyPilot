import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Dashboard", subtitle = "Manage your automated job applications" }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border" data-testid="header">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="header-title">{title}</h1>
            <p className="text-sm text-muted-foreground" data-testid="header-subtitle">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/new">
              <Button data-testid="button-new-application">
                <Plus className="mr-2 h-4 w-4" />
                New Application
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
