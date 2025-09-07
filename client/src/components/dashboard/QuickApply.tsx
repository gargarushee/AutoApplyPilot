import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, FileText, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

export function QuickApply() {
  const [jobUrl, setJobUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: resumes } = useQuery<any[]>({
    queryKey: ['/api/resumes'],
  });

  const currentResume = resumes?.[0]; // Get the most recent resume

  const parseJobMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/jobs/parse", { jobUrl: url });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Job parsed successfully!",
        description: `Found ${data.jobInfo.title} at ${data.jobInfo.company}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      setJobUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to parse job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleParseJob = () => {
    if (!jobUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a job URL to continue",
        variant: "destructive",
      });
      return;
    }

    parseJobMutation.mutate(jobUrl);
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      // Create form data for the resume upload
      const formData = new FormData();
      formData.append('resume', result.successful[0].data);

      try {
        const response = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/resumes'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
          toast({
            title: "Resume uploaded successfully!",
            description: "Your resume has been processed and is ready to use.",
          });
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to process resume. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card data-testid="quick-apply-card">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Apply</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="job-url" className="block text-sm font-medium text-foreground mb-2">
              Job URL
            </Label>
            <div className="flex space-x-3">
              <Input
                id="job-url"
                type="url"
                placeholder="https://jobs.lever.co/..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="flex-1"
                data-testid="input-job-url"
              />
              <Button
                onClick={handleParseJob}
                disabled={parseJobMutation.isPending}
                data-testid="button-parse-job"
              >
                <Search className="mr-2 h-4 w-4" />
                {parseJobMutation.isPending ? "Parsing..." : "Parse"}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="text-primary text-lg h-5 w-5" />
              <div>
                <p className="text-sm font-medium text-foreground" data-testid="current-resume-name">
                  {currentResume?.filename || "No resume uploaded"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentResume 
                    ? `Uploaded ${new Date(currentResume.createdAt || '').toLocaleDateString()}`
                    : "Upload a resume to get started"
                  }
                </p>
              </div>
            </div>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="text-sm text-primary hover:underline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {currentResume ? "Change Resume" : "Upload Resume"}
            </ObjectUploader>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
