'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DailySales {
  totalSales: number;
  walkinSales: number;
  hotelGuestSales: number;
  orderCount: number;
  walkinCount: number;
  hotelGuestCount: number;
}

const DailySalesSummary = () => {
  const [salesData, setSalesData] = useState<DailySales | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodaysSales = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get today's date in local timezone
        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

        // Fetch today's orders
        const { data: orders, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            stay_id,
            guest_user_id,
            user_id,
            customer_name,
            guest_first_name,
            created_at,
            order_status
          `)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString())
          .neq('order_status', 'cancelled'); // Exclude cancelled orders

        console.log('Fetched orders:', orders);
        console.log('Fetch error:', fetchError);

        if (fetchError) {
          throw fetchError;
        }

        // Calculate sales totals
        let totalSales = 0;
        let walkinSales = 0;
        let hotelGuestSales = 0;
        let orderCount = 0;
        let walkinCount = 0;
        let hotelGuestCount = 0;

        orders?.forEach(order => {
          const amount = parseFloat(order.total_amount || '0');
          totalSales += amount;
          orderCount++;

          // Determine customer type
          let isWalkin = false;
          let isHotelGuest = false;

          if (order.stay_id?.toLowerCase().startsWith('walkin') || order.table_number === 'Take Away') {
            isWalkin = true;
          } else if (order.stay_id?.toLowerCase().startsWith('a') || order.user_id) {
            isHotelGuest = true;
          } else if (order.table_number && !isNaN(Number(order.table_number))) { // Numeric table number without 'walkin' or 'A' stay_id
            isWalkin = true; // Assume numeric table numbers are walk-ins unless explicitly hotel guest
          }

          if (isWalkin) {
            walkinSales += amount;
            walkinCount++;
          } else if (isHotelGuest) {
            hotelGuestSales += amount;
            hotelGuestCount++;
          } else {
            // Fallback for uncategorized orders, perhaps add to walkin as a default
            walkinSales += amount;
            walkinCount++;
          }
        });

        setSalesData({
          totalSales,
          walkinSales,
          hotelGuestSales,
          orderCount,
          walkinCount,
          hotelGuestCount
        });
      } catch (err) {
        console.error('Error fetching daily sales:', err);
        setError('Failed to load sales data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodaysSales();
  }, []);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-around gap-2">
            <div className="text-center p-2 rounded-lg border">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            </div>
            <div className="text-center p-2 rounded-lg border">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            </div>
            <div className="text-center p-2 rounded-lg border">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!salesData) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex justify-around gap-2">
          {/* Total Sales */}
          <div className="text-center p-2 rounded-lg border">
            <div className="text-lg font-bold text-black">
              {formatThaiCurrencyWithComma(salesData.totalSales)}
            </div>
            <div className="text-xs font-medium mt-1">
              Total
            </div>
          </div>

          {/* Walkin Sales */}
          <div className="text-center p-2 rounded-lg border">
            <div className="text-lg font-bold text-black">
              {formatThaiCurrencyWithComma(salesData.walkinSales)}
            </div>
            <div className="text-xs font-medium mt-1">
              Walkin
            </div>
          </div>

          {/* Hotel Guest Sales */}
          <div className="text-center p-2 rounded-lg border">
            <div className="text-lg font-bold text-black">
              {formatThaiCurrencyWithComma(salesData.hotelGuestSales)}
            </div>
            <div className="text-xs font-medium mt-1">
              Hotel Guest
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySalesSummary;
