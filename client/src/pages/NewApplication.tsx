import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { QuickApply } from "@/components/dashboard/QuickApply";

export default function NewApplication() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="pl-64">
        <Header title="New Application" subtitle="Start a new job application" />
        
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <QuickApply />
          </div>
        </main>
      </div>
    </div>
  );
}
