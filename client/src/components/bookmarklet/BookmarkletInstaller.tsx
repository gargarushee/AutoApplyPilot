import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Chrome, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ExtensionInstaller() {
  const { toast } = useToast();

  const downloadExtension = () => {
    // For now, show instructions since we can't auto-download
    toast({
      title: "Extension Files Ready",
      description: "Copy the browser-extension folder from your project to install",
    });
  };

  const openChromeExtensions = () => {
    window.open('chrome://extensions/', '_blank');
  };

  return (
    <Card data-testid="extension-installer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-5 w-5 text-primary" />
          JobFlow Auto-Fill Chrome Extension
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Install the JobFlow Chrome extension to automatically fill job applications with your resume data on any website.
        </p>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            🚀 Browser Extension Benefits:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Runs automatically on job sites - no clicking needed</li>
            <li>• Better form detection and compatibility</li>
            <li>• Visual popup interface with status updates</li>
            <li>• Works on all major job boards and career sites</li>
            <li>• Secure and always up-to-date</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Quick Installation:</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Copy the <code className="bg-background px-1 rounded">browser-extension</code> folder from your project</li>
            <li>Open Chrome and go to <code className="bg-background px-1 rounded">chrome://extensions/</code></li>
            <li>Enable "Developer mode" (top-right toggle)</li>
            <li>Click "Load unpacked" and select the extension folder</li>
            <li>Visit any job site and start auto-filling!</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={openChromeExtensions}
            className="flex-1"
            data-testid="button-open-extensions"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Open Chrome Extensions
          </Button>
          <Button
            onClick={() => window.open('/browser-extension/README.md', '_blank')}
            variant="outline"
            data-testid="button-view-instructions"
          >
            <FileText className="mr-2 h-4 w-4" />
            View Instructions
          </Button>
        </div>

        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
            ✨ How the extension works:
          </h4>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• Automatically detects job application pages</li>
            <li>• Shows a floating blue "Auto-Fill" button</li>
            <li>• One-click to fill all form fields instantly</li>
            <li>• Visual feedback shows what was filled</li>
            <li>• Compatible with Lever, Greenhouse, Workday, and more</li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
            📁 Extension Location:
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            The extension files are located in your project at:
          </p>
          <code className="text-xs bg-background px-2 py-1 rounded border block">
            /browser-extension/
          </code>
        </div>

        <Button
          onClick={() => window.open('https://developer.chrome.com/docs/extensions/mv3/getstarted/', '_blank')}
          variant="outline"
          className="w-full"
          data-testid="button-extension-help"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Learn More About Installing Extensions
        </Button>
      </CardContent>
    </Card>
  );
}