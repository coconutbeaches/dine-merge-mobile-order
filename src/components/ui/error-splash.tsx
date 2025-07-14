import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorSplashProps {
  msg: string;
  onRetry?: () => void;
  showRetry?: boolean;
  retryLabel?: string;
}

export function ErrorSplash({ msg, onRetry, showRetry = true, retryLabel = "Retry" }: ErrorSplashProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Authentication Error</CardTitle>
          <CardDescription>{msg}</CardDescription>
        </CardHeader>
        {showRetry && (
          <CardContent className="text-center">
            <Button
              onClick={onRetry || (() => window.location.reload())}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default ErrorSplash;
