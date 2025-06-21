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
import { useOrdersByDate } from "@/hooks/useOrdersByDate";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatThaiCurrency } from "@/lib/utils";

import type { TooltipProps } from "recharts";

const OrdersTooltip = (props: TooltipProps<number, string>) => {
  const sorted = props.payload?.slice().sort((a, b) => {
    const order = ["hotel_guest", "non_guest"];
    return order.indexOf(a.dataKey as string) - order.indexOf(b.dataKey as string);
  });
  return <ChartTooltipContent {...props} payload={sorted} />;
};

const OrdersOverTimeChart = () => {
  const [metric, setMetric] = useState<"revenue" | "count">("revenue");
  const [range, setRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const handleRangeSelect = (selected: DateRange | undefined) => {
    if (!selected) return;
    if (selected.to && selected.from && selected.to < selected.from) {
      setRange({ from: selected.to, to: selected.from });
    } else {
      setRange(selected);
    }
  };

  const endDate = range.to
    ? format(range.to, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const startDate = range.from ? format(range.from, "yyyy-MM-dd") : endDate;

  const { data, isLoading, error } = useOrdersByDate(startDate, endDate, metric);

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

  // Determine the max stacked value for a single day so the Y axis ticks
  // are rounded to the nearest thousand. This ensures the chart displays
  // values like 5,000 or 10,000 rather than uneven numbers.
  const maxValue = Math.max(
    ...chartData.map((d) => d.hotel_guest + d.non_guest),
  );
  const maxTick = Math.ceil(maxValue / 1000) * 1000;
  const ticks = Array.from({ length: maxTick / 1000 + 1 }, (_, i) => i * 1000);

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
            <CardTitle>Orders Over Time</CardTitle>
            <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-sm font-normal w-[260px] justify-start"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {range.from ? (
                        range.to ? (
                          <>
                            {format(range.from, "LLL dd, y")} -{" "}
                            {format(range.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(range.from, "LLL dd, y")
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
                      defaultMonth={range.from}
                      selected={range}
                      onSelect={handleRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <ToggleGroup
                  type="single"
                  value={metric}
                  onValueChange={(val) =>
                    val && setMetric(val as "revenue" | "count")
                  }
                  className="ml-2"
                >
                  <ToggleGroupItem value="revenue">THB</ToggleGroupItem>
                  <ToggleGroupItem value="count">Orders</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="text-lg font-bold md:ml-auto">
                {metric === "revenue"
                  ? formatThaiCurrency(total)
                  : total.toLocaleString()}
                <span className="ml-2 text-sm font-normal">
                  Guest:
                  {metric === "revenue"
                    ? formatThaiCurrency(guestTotal)
                    : guestTotal.toLocaleString()}
                  {" | "}Out:
                  {metric === "revenue"
                    ? formatThaiCurrency(outTotal)
                    : outTotal.toLocaleString()}
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
                    />
                    <Bar
                      dataKey="hotel_guest"
                      stackId="orders"
                      fill="var(--color-hotel_guest)"
                      stroke="#000"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdersOverTimeChart;
