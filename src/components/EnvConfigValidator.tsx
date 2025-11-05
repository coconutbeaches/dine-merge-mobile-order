'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface EnvConfigValidatorProps {
  children: React.ReactNode;
}

export function EnvConfigValidator({ children }: EnvConfigValidatorProps) {
  const [configError, setConfigError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Check if required environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const missingVars = [];
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
      missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    if (missingVars.length > 0) {
      setConfigError(missingVars.join(', '));
    }
  }, []);

  // During SSR or if config is valid, render children
  if (!isClient || !configError) {
    return <>{children}</>;
  }

  // Show configuration error page
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-yellow-500">
            <AlertTriangle className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl">Configuration Required</CardTitle>
          <CardDescription>
            This application requires environment variables to be configured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
            <p className="text-sm font-semibold text-red-800 mb-2">
              Missing Environment Variables:
            </p>
            <p className="text-sm text-red-700 font-mono">
              {configError}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md space-y-3">
            <p className="text-sm font-semibold text-blue-900">
              To fix this issue:
            </p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Go to your Vercel project dashboard</li>
              <li>Navigate to <strong>Settings → Environment Variables</strong></li>
              <li>Add the following variables:
                <ul className="ml-6 mt-1 space-y-1 list-disc list-inside font-mono text-xs">
                  <li>NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                </ul>
              </li>
              <li>Make sure to add them for all environments (Production, Preview, Development)</li>
              <li>Redeploy your application</li>
            </ol>
          </div>

          <div className="flex items-center justify-center">
            <a
              href="https://vercel.com/docs/projects/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Learn more about Vercel Environment Variables
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="text-xs text-center text-gray-500 pt-2 border-t">
            <p>If you're a developer, check <code className="bg-gray-200 px-1 py-0.5 rounded">.env.local.example</code> for reference values</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
