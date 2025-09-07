import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { QuickApply } from "@/components/dashboard/QuickApply";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ApplicationsTable } from "@/components/dashboard/ApplicationsTable";
import { ExtensionInstaller } from "@/components/bookmarklet/BookmarkletInstaller";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="pl-64">
        <Header />
        
        <main className="p-6">
          <StatsCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <QuickApply />
              <ExtensionInstaller />
            </div>
            <RecentActivity />
          </div>
          
          <ApplicationsTable />
        </main>
      </div>
    </div>
  );
}
