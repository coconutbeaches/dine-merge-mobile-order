import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useRouter } from 'next/navigation';
import { useOrdersByDate } from "@/hooks/useOrdersByDate";
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
import { useTopProductsByQuantity } from "@/hooks/useTopProductsByQuantity";
import { formatThaiCurrency, formatThaiCurrencyWithComma } from "@/lib/utils";
import Link from "next/link";

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
    // Format with commas and pad to maintain alignment
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
            {item.name === 'hotel_guest' ? 'Guest' : 'Out'}
          </div>
          <div className="text-right">
            {formatAmount(item.value || 0)}
          </div>
        </div>
      ))}
    </div>
  );
};
const OrdersOverTimeChart = () => {
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

  // allow clicking bars to navigate to orders dashboard filtered by date
  const router = useRouter();
  const handleBarClick = (entry: any) => {
    if (entry?.date) {
      const dateStr = entry.date;
      router.push(`/orders-dashboard?startDate=${dateStr}&endDate=${dateStr}`);
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

  const { data, isLoading, error } = useOrdersByDate(
    chartStartDate,
    chartEndDate,
    metric,
  );
  const {
    data: topProducts,
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

  // Determine the max stacked value for a single day so the Y axis ticks can
  // be generated. For revenue we keep the existing thousands rounding while
  // the Orders view shows four ticks with values that are multiples of ten.
  const maxValue = Math.max(
    ...chartData.map((d) => d.hotel_guest + d.non_guest),
  );

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

  return (
    <Layout title="Orders Over Time" showBackButton>
      <div className="p-4 md:p-6">
        <Card className="bg-white text-black dark:bg-black dark:text-white border border-black">
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
                  Guest:{" "}
                  {metric === "revenue"
                    ? formatThaiCurrency(guestTotal)
                    : guestTotal.toLocaleString()}{" "}
                  <span className="ml-2">
                    Out:{" "}
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
              <div className="p-6 text-center text-red-500">Failed to load data</div>
            ) : (
              <ChartContainer
                config={{
                  hotel_guest: { label: "Guest", color: "#ffffff" },
                  non_guest: { label: "Out", color: "#000000" },
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e5e5"
                      vertical={false}
                    />
                    <XAxis dataKey="date" hide />
                    <YAxis
                      ticks={ticks}
                      tickFormatter={(v) => v.toLocaleString()}
                      stroke="#000"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <OrdersTooltip
                          labelFormatter={(value) =>
                            format(new Date(value as string), "MMM d")
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="non_guest"
                      stackId="orders"
                      fill="var(--color-non_guest)"
                      stroke="#000"
                      strokeWidth={1}
                      cursor="pointer"
                      onClick={handleBarClick}
                    />
                    <Bar
                      dataKey="hotel_guest"
                      stackId="orders"
                      fill="var(--color-hotel_guest)"
                      stroke="#000"
                      strokeWidth={1}
                      cursor="pointer"
                      onClick={handleBarClick}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6 bg-white text-black dark:bg-black dark:text-white border border-black">
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
                              href={`/admin/product-orders/${product.product_id}?customerType=guest&startDate=${productsStartDate}&endDate=${format(addDays(productsRange.to ?? new Date(), 1), 'yyyy-MM-dd')}`}
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
                              href={`/admin/product-orders/${product.product_id}?customerType=non-guest&startDate=${productsStartDate}&endDate=${format(addDays(productsRange.to ?? new Date(), 1), 'yyyy-MM-dd')}`}
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
                              href={`/admin/product-orders/${product.product_id}?startDate=${productsStartDate}&endDate=${format(addDays(productsRange.to ?? new Date(), 1), 'yyyy-MM-dd')}`}
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
};

export default OrdersOverTimeChart;
