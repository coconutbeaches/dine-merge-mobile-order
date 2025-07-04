import React from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Package,
  LayoutGrid,
  ShoppingCart,
  BarChart,
} from 'lucide-react';

const Admin = () => {
  return (
    <Layout title="Admin Dashboard">
      <div className="p-4 max-w-lg mx-auto">
        
        <div className="grid gap-4 mt-6 mb-8">
          <Link href="/orders-dashboard">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/products-dashboard">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Menu
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/categories-manager">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/customers-dashboard">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/analytics/orders-over-time">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Analytics
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

        </div>
      </div>
    </Layout>
  );
};

export default Admin;
