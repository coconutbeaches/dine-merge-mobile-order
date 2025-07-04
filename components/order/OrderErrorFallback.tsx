import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, History, HelpCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrderErrorFallbackProps {
  orderId?: string | null;
  error?: Error | null;
  onRetry?: () => void;
  showRetry?: boolean;
}

const OrderErrorFallback: React.FC<OrderErrorFallbackProps> = ({
  orderId,
  error,
  onRetry,
  showRetry = false
}) => {
  const router = useRouter();

  // Determine error type and appropriate message
  const getErrorInfo = () => {
    if (!orderId) {
      return {
        title: 'No Order Found',
        message: 'No order ID was provided or the order ID is invalid.',
        isNetworkError: false
      };
    }

    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      const isNetworkError = errorMessage.includes('network') || 
                            errorMessage.includes('connection') || 
                            errorMessage.includes('timeout') ||
                            errorMessage.includes('fetch');
      
      return {
        title: isNetworkError ? 'Connection Error' : 'Order Not Found',
        message: isNetworkError 
          ? 'Unable to connect to our servers. Please check your internet connection and try again.'
          : `Order #${orderId} could not be found or you don't have permission to view it.`,
        isNetworkError
      };
    }

    return {
      title: 'Order Not Found',
      message: `Order #${orderId} could not be found.`,
      isNetworkError: false
    };
  };

  const { title, message, isNetworkError } = getErrorInfo();

  const handleViewOrderHistory = () => {
    router.push('/profile'); // Navigate to profile which contains order history
  };

  const handleContactSupport = () => {
    // WhatsApp support with pre-filled message about order issue
    const phoneNumber = '66631457299';
    const supportMessage = orderId 
      ? `Hi, I'm having trouble accessing my order #${orderId}. Could you please help me?`
      : 'Hi, I need help with an order issue. Could you please assist me?';
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(supportMessage)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="container py-12 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>

          {orderId && (
            <div className="text-center py-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Looking for order details?
              </p>
              <p className="text-xs text-muted-foreground">
                Order ID: <span className="font-mono font-medium">#{orderId}</span>
              </p>
            </div>
          )}

          {isNetworkError && (
            <div className="text-center text-sm text-muted-foreground">
              <p>This might be a temporary connection issue.</p>
              <p>Please try again or contact support if the problem persists.</p>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <div className="w-full space-y-3">
            {/* Primary action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {showRetry && onRetry && (
                <Button 
                  onClick={onRetry}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
              
              <Button 
                onClick={handleViewOrderHistory}
                variant={showRetry ? "outline" : "default"}
                className="flex-1"
              >
                <History className="mr-2 h-4 w-4" />
                View Order History
              </Button>
            </div>

            {/* Secondary action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleContactSupport}
                variant="outline"
                className="flex-1"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Menu
              </Button>
            </div>

            {/* Help text */}
            <div className="text-center pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Need immediate assistance? Contact us via WhatsApp for faster support.
              </p>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderErrorFallback;
