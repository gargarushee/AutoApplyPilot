import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function BookmarkletInstaller() {
  const { toast } = useToast();

  const bookmarkletCode = `javascript:(function(){
    if(window.jobFlowInjected) return;
    window.jobFlowInjected = true;
    
    const script = document.createElement('script');
    script.src = '${window.location.origin}/bookmarklet.js?v=' + Date.now();
    script.onload = function() {
      if(window.JobFlowAutoFill) {
        window.JobFlowAutoFill.init();
      }
    };
    document.head.appendChild(script);
  })();`;

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    toast({
      title: "Copied!",
      description: "Bookmarklet code copied to clipboard",
    });
  };

  return (
    <Card data-testid="bookmarklet-installer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          JobFlow Auto-Fill Plugin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Install this bookmarklet in your browser to auto-fill job applications with your resume data on any website.
        </p>
        
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">How to install:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Copy the bookmarklet code below</li>
            <li>Create a new bookmark in your browser</li>
            <li>Paste the code as the URL/location</li>
            <li>Name it "JobFlow Auto-Fill"</li>
            <li>Visit any job application page and click the bookmark</li>
          </ol>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bookmarklet Code:</label>
          <div className="flex gap-2">
            <textarea
              value={bookmarkletCode}
              readOnly
              className="flex-1 p-2 text-xs bg-muted rounded border font-mono resize-none"
              rows={4}
              data-testid="bookmarklet-code"
            />
            <Button
              onClick={copyBookmarklet}
              variant="outline"
              size="sm"
              data-testid="button-copy-bookmarklet"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 How it works:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Automatically detects form fields on job sites</li>
            <li>• Fills in your name, email, phone, and other details</li>
            <li>• Works on Lever, Greenhouse, Workday, and most job boards</li>
            <li>• Shows a preview before submitting any forms</li>
          </ul>
        </div>

        <Button
          onClick={() => window.open('https://support.google.com/chrome/answer/188842', '_blank')}
          variant="outline"
          className="w-full"
          data-testid="button-bookmark-help"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Learn How to Add Bookmarks in Your Browser
        </Button>
      </CardContent>
    </Card>
  );
}