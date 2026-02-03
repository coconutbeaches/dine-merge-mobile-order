"use client";

import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <Layout title="Forgot Password" showBackButton>
      <div className="page-container py-12">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground">
            Password reset is not available from the app yet. Please contact staff to regain access.
          </p>
          <Button asChild className="bg-black text-white hover:bg-gray-800">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
