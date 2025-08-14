"use client";

import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useOrdersByDate } from "@/src/hooks/useOrdersByDate";
import { addDays, format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTopProductsByQuantity } from "@/src/hooks/useTopProductsByQuantity";
import { formatThaiCurrency, formatThaiCurrencyWithComma } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from 'next/navigation';

import type { TooltipProps } from "recharts";

const OrdersTooltip = (props: TooltipProps<number, string>) => {
  const sorted = props.payload?.slice().sort((a, b) => {
    const order = ["hotel_guest", "non_guest"];
    return order.indexOf(a.dataKey as string) - order.indexOf(b.dataKey as string);
  });

  // Calculate grand total
  const grandTotal = props.payload?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;
  const dateLabel = props.label ? new Date(props.label).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }) : '';

  // Format amount with fixed width and thousand separators
  const formatAmount = (value: number, isBold = false) => {
    const formattedValue = value.toLocaleString('en-US');
    const amount = formattedValue.padStart(12, ' ');
    return isBold ? <span className="font-semibold">{amount}</span> : amount;
  };

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm font-mono text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="font-semibold text-left">{dateLabel}</div>
        <div className="text-right">{formatAmount(grandTotal, true)}</div>
      </div>
      {sorted?.map((item) => (
        <div key={item.dataKey} className="grid grid-cols-2 gap-4">
          <div className="text-left">
            {item.name === 'hotel_guest' ? 'Hotel Guest' : 'Walkin'}
          </div>
          <div className="text-right">
            {formatAmount(item.value || 0)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [metric, setMetric] = useState<"revenue" | "count">("revenue");
  const [chartRange, setChartRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [productsRange, setProductsRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  const handleChartRangeSelect = (selected: DateRange | undefined) => {
    if (!selected) return;
    if (selected.to && selected.from && selected.to < selected.from) {
      setChartRange({ from: selected.to, to: selected.from });
    } else {
      setChartRange(selected);
    }
  };

  const handleProductsRangeSelect = (selected: DateRange | undefined) => {
    if (!selected) return;
    if (selected.to && selected.from && selected.to < selected.from) {
      setProductsRange({ from: selected.to, to: selected.from });
    } else {
      setProductsRange(selected);
    }
  };

  const chartEndDate = chartRange.to
    ? format(chartRange.to, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const chartStartDate = chartRange.from
    ? format(chartRange.from, "yyyy-MM-dd")
    : chartEndDate;

  const productsEndDate = productsRange.to
    ? format(productsRange.to, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const productsStartDate = productsRange.from
    ? format(productsRange.from, "yyyy-MM-dd")
    : productsEndDate;

  const { data = [], isLoading, error } = useOrdersByDate(
    chartStartDate,
    chartEndDate,
    metric,
  );
  const {
    data: topProducts = [],
    isLoading: isLoadingProducts,
    error: errorProducts,
  } = useTopProductsByQuantity(productsStartDate, productsEndDate);

  const chartData = [...data]
    .reverse()
    .map((row) => ({
      date: row.order_date,
      hotel_guest:
        metric === "revenue" ? row.hotel_guest_revenue : row.hotel_guest_orders,
      non_guest:
        metric === "revenue"
          ? row.outside_guest_revenue
          : row.outside_guest_orders,
    }));

  // Debug logging
  console.log(`Analytics Debug - Raw data length: ${data.length}`);
  console.log(`Analytics Debug - Chart data length: ${chartData.length}`);
  console.log(`Analytics Debug - Date range: ${chartStartDate} to ${chartEndDate}`);
  if (chartData.length > 0) {
    console.log(`Analytics Debug - First date: ${chartData[0].date}`);
    console.log(`Analytics Debug - Last date: ${chartData[chartData.length - 1].date}`);
  }

  const maxValue = chartData.length > 0 ? Math.max(
    ...chartData.map((d) => d.hotel_guest + d.non_guest),
  ) : 0;

  const ticks = React.useMemo(() => {
    if (metric === "count") {
      const step = Math.ceil(maxValue / 3 / 10) * 10;
      return Array.from({ length: 4 }, (_, i) => i * step);
    }
    const maxTick = Math.ceil(maxValue / 1000) * 1000;
    return Array.from({ length: maxTick / 1000 + 1 }, (_, i) => i * 1000);
  }, [metric, maxValue]);

  const total = chartData.reduce(
    (sum, row) => sum + row.hotel_guest + row.non_guest,
    0,
  );
  const guestTotal = chartData.reduce((sum, row) => sum + row.hotel_guest, 0);
  const outTotal = chartData.reduce((sum, row) => sum + row.non_guest, 0);

  const handleBarClick = (date: string) => {
    // Navigate to orders page with the specific date as both start and end date
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    router.push(`/admin/orders?startDate=${formattedDate}&endDate=${formattedDate}`);
  };

  return (
    <Layout title="Orders Over Time" showBackButton>
      <div className="p-4 md:p-6">
        <Card className="bg-white text-black border border-black">
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <CardTitle>Orders Over Time</CardTitle>
                <ToggleGroup
                  className="gap-0 ml-2"
                  type="single"
                  value={metric}
                  onValueChange={(val) =>
                    val && setMetric(val as "revenue" | "count")
                  }
                >
                  <ToggleGroupItem value="revenue">฿</ToggleGroupItem>
                  <ToggleGroupItem value="count">
                    <ShoppingCart className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2 pt-2 md:pt-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-sm font-normal w-[260px] justify-start"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {chartRange.from ? (
                        chartRange.to ? (
                          <>
                            {format(chartRange.from, "LLL dd, y")} -{" "}
                            {format(chartRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(chartRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={chartRange.from}
                      selected={chartRange}
                      onSelect={handleChartRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="text-lg font-bold md:ml-auto">
                {metric === "revenue"
                  ? formatThaiCurrencyWithComma(total)
                  : total.toLocaleString()}
                <span className="ml-2 text-sm font-normal">
                  Hotel Guest:{" "}
                  {metric === "revenue"
                    ? formatThaiCurrency(guestTotal)
                    : guestTotal.toLocaleString()}{" "}
                  <span className="ml-2">
                    Walkin:{" "}
                    {metric === "revenue"
                      ? formatThaiCurrency(outTotal)
                      : outTotal.toLocaleString()}
                  </span>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading analytics...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                Failed to load data: {error}
                <br />
                <small>Start: {chartStartDate}, End: {chartEndDate}</small>
              </div>
            ) : data.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No data available for the selected date range
                <br />
                <small>Start: {chartStartDate}, End: {chartEndDate}</small>
              </div>
            ) : (
              <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-80 flex flex-col justify-between text-xs text-gray-600 pt-4 pb-8">
                    {Array.from({ length: 4 }, (_, i) => {
                      let value;
                      
                      if (metric === 'revenue') {
                        // For revenue: evenly spaced ticks rounded to nearest 1000
                        const maxTick = Math.ceil(maxValue / 1000) * 1000;
                        value = (maxTick * (3 - i)) / 3;
                        value = Math.ceil(value / 1000) * 1000;
                      } else {
                        // For order count: use Vite version logic - step = Math.ceil(maxValue / 3 / 10) * 10
                        const step = Math.ceil(maxValue / 3 / 10) * 10;
                        value = (3 - i) * step;
                      }
                      
                      return (
                        <div key={i} className="text-right pr-2">
                          {metric === 'revenue' ? `฿${value.toLocaleString()}` : value.toLocaleString()}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chart area */}
                  <div className="ml-16 h-80 bg-white border-b border-gray-300 relative">
                    {/* Horizontal grid lines - only at Y-axis label positions */}
                    <div className="absolute inset-0">
                      {Array.from({ length: 4 }, (_, i) => {
                        let yAxisValue, maxRoundedValue;
                        
                        if (metric === 'revenue') {
                          const maxTick = Math.ceil(maxValue / 1000) * 1000;
                          yAxisValue = (maxTick * (3 - i)) / 3;
                          yAxisValue = Math.ceil(yAxisValue / 1000) * 1000;
                          maxRoundedValue = maxTick;
                        } else {
                          const step = Math.ceil(maxValue / 3 / 10) * 10;
                          yAxisValue = (3 - i) * step;
                          maxRoundedValue = 3 * step;
                        }
                        
                        // Only show grid line if this Y-axis value is not zero
                        if (yAxisValue === 0) {
                          return null;
                        }
                        
                        // Position based on the Y-axis value
                        const position = ((maxRoundedValue - yAxisValue) / maxRoundedValue) * 100;
                        
                        return (
                          <div 
                            key={i} 
                            className="absolute w-full border-t border-gray-200 border-dashed"
                            style={{ top: `${position}%` }}
                          />
                        );
                      }).filter(Boolean)}
                    </div>
                    
                    {/* Bars */}
                    <div className="absolute bottom-0 left-0 right-0 h-72 flex items-end justify-start px-1">
                      {chartData.map((item, index) => {
                        const total = item.hotel_guest + item.non_guest;
                        
                        let maxRoundedValue;
                        if (metric === 'revenue') {
                          maxRoundedValue = Math.ceil(maxValue / 1000) * 1000;
                        } else {
                          const step = Math.ceil(maxValue / 3 / 10) * 10;
                          maxRoundedValue = 3 * step;
                        }
                        
                        const height = Math.max(2, (total / maxRoundedValue) * 270);
                        const guestHeight = total > 0 ? (item.hotel_guest / total) * height : 0;
                        const nonGuestHeight = total > 0 ? (item.non_guest / total) * height : 0;
                        
                        // Calculate bar width to fit all bars in the available space
                        // Reserve space for gaps (0.25rem = 4px per gap)
                        const totalGapSpace = Math.max(0, (chartData.length - 1) * 4); // 4px gap between bars
                        const availableWidthForBars = 100 - (totalGapSpace / 10); // Convert 4px gaps to rough percentage
                        const barWidth = Math.max(1, availableWidthForBars / chartData.length);
                        
                        return (
                          <div 
                            key={index} 
                            className={`relative group cursor-pointer hover:opacity-80 transition-all duration-200 hover:scale-105 ${index < chartData.length - 1 ? 'mr-1' : ''}`}
                            style={{ height: `${height}px`, width: `${barWidth}%` }}
                            onClick={() => handleBarClick(item.date)}
                          >
                            {/* Non-guest (black) bar - bottom */}
                            <div 
                              className="bg-black absolute bottom-0 w-full border-r border-black"
                              style={{ height: `${nonGuestHeight}px` }}
                            />
                            {/* Guest (white) bar - top */}
                            <div 
                              className="bg-white border border-black absolute bottom-0 w-full"
                              style={{ height: `${guestHeight}px`, bottom: `${nonGuestHeight}px` }}
                            />
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                              <div className="font-medium">{format(new Date(item.date), 'MMM d')}</div>
                              <div>Total: {metric === 'revenue' ? `฿${total.toLocaleString()}` : total.toLocaleString()}</div>
                              <div>Guest: {metric === 'revenue' ? `฿${item.hotel_guest.toLocaleString()}` : item.hotel_guest.toLocaleString()}</div>
                              <div>Out: {metric === 'revenue' ? `฿${item.non_guest.toLocaleString()}` : item.non_guest.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6 bg-white text-black border border-black">
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Products by Orders</CardTitle>
              </div>
              <div className="flex items-center gap-2 pt-2 md:pt-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-sm font-normal w-[260px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {productsRange.from ? (
                        productsRange.to ? (
                          <>
                            {format(productsRange.from, "LLL dd, y")} - {format(productsRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(productsRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={productsRange.from}
                      selected={productsRange}
                      onSelect={handleProductsRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingProducts ? (
              <div className="p-6 text-center text-gray-500">Loading top products...</div>
            ) : errorProducts ? (
              <div className="p-6 text-center text-red-500">Failed to load products.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Product</TableHead>
                      <TableHead className="text-right">Guests</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...topProducts]
                      .sort((a, b) => b.total_quantity - a.total_quantity)
                      .map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell className="text-left text-black">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.hotel_guest_quantity > 0 ? (
                              <Link
                                href={`/admin/product-orders/${product.product_id}?customerType=guest&startDate=${productsStartDate}&endDate=${productsEndDate}`}
                                className="hover:underline"
                              >
                                {product.hotel_guest_quantity.toLocaleString()}
                              </Link>
                            ) : (
                              product.hotel_guest_quantity.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.non_guest_quantity > 0 ? (
                              <Link
                                href={`/admin/product-orders/${product.product_id}?customerType=non-guest&startDate=${productsStartDate}&endDate=${productsEndDate}`}
                                className="hover:underline"
                              >
                                {product.non_guest_quantity.toLocaleString()}
                              </Link>
                            ) : (
                              product.non_guest_quantity.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {product.total_quantity > 0 ? (
                              <Link
                                href={`/admin/product-orders/${product.product_id}?startDate=${productsStartDate}&endDate=${productsEndDate}`}
                                className="hover:underline"
                              >
                                {product.total_quantity.toLocaleString()}
                              </Link>
                            ) : (
                              product.total_quantity.toLocaleString()
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
