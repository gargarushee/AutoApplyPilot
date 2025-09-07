import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, NotebookPen, Save, Info, Bot, User, CheckCircle, AlertTriangle } from "lucide-react";

interface ReviewModalProps {
  application: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ application, isOpen, onClose }: ReviewModalProps) {
  const [manualData, setManualData] = useState(application.manualData || {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, data, status }: { id: string; data: any; status: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}`, {
        manualData: data,
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAsDraft = () => {
    updateApplicationMutation.mutate({
      id: application.id,
      data: manualData,
      status: 'pending_review',
    });
    toast({
      title: "Draft saved",
      description: "Your changes have been saved as a draft.",
    });
  };

  const handleApproveAndSubmit = () => {
    // Validate required manual fields
    const requiredFields = ['salaryExpectation', 'availability', 'workAuthorization'];
    const missingFields = requiredFields.filter(field => !manualData[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required manual fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    updateApplicationMutation.mutate({
      id: application.id,
      data: manualData,
      status: 'submitted',
    });
    toast({
      title: "Application submitted!",
      description: `Your application for ${application.jobTitle} at ${application.company} has been submitted.`,
    });
  };

  const autoFilledData = application.autoFilledData || {};

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="review-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Review Application
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {application.jobTitle} at {application.company}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Auto-filled Information */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Auto-filled Information</h3>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Full Name</Label>
                  <Input
                    type="text"
                    value={autoFilledData.fullName || 'Alex Johnson'}
                    readOnly
                    className="bg-muted"
                    data-testid="input-full-name"
                  />
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Bot className="mr-1 h-3 w-3" />
                    Auto-filled from resume
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Email Address</Label>
                  <Input
                    type="email"
                    value={autoFilledData.email || 'alex@example.com'}
                    readOnly
                    className="bg-muted"
                    data-testid="input-email"
                  />
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Bot className="mr-1 h-3 w-3" />
                    Auto-filled from resume
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Phone Number</Label>
                  <Input
                    type="tel"
                    value={autoFilledData.phone || '+1 (555) 123-4567'}
                    readOnly
                    className="bg-muted"
                    data-testid="input-phone"
                  />
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Bot className="mr-1 h-3 w-3" />
                    Auto-filled from resume
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Years of Experience</Label>
                  <Select value={autoFilledData.experience || '5-7 years'} disabled>
                    <SelectTrigger className="bg-muted" data-testid="select-experience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-2 years">0-2 years</SelectItem>
                      <SelectItem value="3-5 years">3-5 years</SelectItem>
                      <SelectItem value="5-7 years">5-7 years</SelectItem>
                      <SelectItem value="7-10 years">7-10 years</SelectItem>
                      <SelectItem value="10+ years">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Bot className="mr-1 h-3 w-3" />
                    Auto-filled from resume
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Cover Letter</Label>
                  <Textarea
                    rows={4}
                    value={`Dear Hiring Manager,

I am excited to apply for the ${application.jobTitle} position at ${application.company}. With over 6 years of experience in React, TypeScript, and modern web technologies, I believe I would be a valuable addition to your team...

Best regards,
Alex Johnson`}
                    readOnly
                    className="bg-muted"
                    data-testid="textarea-cover-letter"
                  />
                  <span className="text-xs text-green-600 flex items-center mt-1">
                    <Bot className="mr-1 h-3 w-3" />
                    Auto-generated based on job requirements
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Fields & Validation */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Manual Review Required</h3>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Salary Expectation</Label>
                  <Input
                    type="text"
                    placeholder="Enter your expected salary"
                    value={manualData.salaryExpectation || ''}
                    onChange={(e) => setManualData({ ...manualData, salaryExpectation: e.target.value })}
                    data-testid="input-salary-expectation"
                  />
                  <span className="text-xs text-yellow-600 flex items-center mt-1">
                    <User className="mr-1 h-3 w-3" />
                    Manual input required
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Availability to Start</Label>
                  <Select
                    value={manualData.availability || ''}
                    onValueChange={(value) => setManualData({ ...manualData, availability: value })}
                  >
                    <SelectTrigger data-testid="select-availability">
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="2-weeks">2 weeks notice</SelectItem>
                      <SelectItem value="1-month">1 month notice</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-yellow-600 flex items-center mt-1">
                    <User className="mr-1 h-3 w-3" />
                    Manual input required
                  </span>
                </div>

                <div>
                  <Label className="block text-sm font-medium text-foreground mb-1">Work Authorization</Label>
                  <RadioGroup
                    value={manualData.workAuthorization || ''}
                    onValueChange={(value) => setManualData({ ...manualData, workAuthorization: value })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="citizen" id="citizen" data-testid="radio-citizen" />
                      <Label htmlFor="citizen" className="text-sm">US Citizen</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="permanent" id="permanent" data-testid="radio-permanent" />
                      <Label htmlFor="permanent" className="text-sm">Permanent Resident</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="visa" id="visa" data-testid="radio-visa" />
                      <Label htmlFor="visa" className="text-sm">Require Visa Sponsorship</Label>
                    </div>
                  </RadioGroup>
                  <span className="text-xs text-yellow-600 flex items-center mt-1">
                    <User className="mr-1 h-3 w-3" />
                    Manual input required
                  </span>
                </div>

                {/* Validation Summary */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-2">Validation Summary</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="text-green-600 mr-2 h-4 w-4" />
                      <span className="text-foreground">All required fields detected</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="text-green-600 mr-2 h-4 w-4" />
                      <span className="text-foreground">Resume successfully parsed</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <AlertTriangle className="text-yellow-600 mr-2 h-4 w-4" />
                      <span className="text-foreground">3 fields require manual input</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center text-sm text-muted-foreground">
              <Info className="mr-2 h-4 w-4" />
              <span>Form will be submitted automatically after your approval</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={updateApplicationMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveAndSubmit}
                disabled={updateApplicationMutation.isPending}
                data-testid="button-approve-submit"
              >
                <NotebookPen className="mr-2 h-4 w-4" />
                {updateApplicationMutation.isPending ? "Submitting..." : "Approve & Submit"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
