"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useFarmerTransactionsChart } from "@/hooks/useFarmerData";

const chartConfig = {
  income: {
    label: "Income",
    color: "#72BF01",
  },
  expenses: {
    label: "Expenses",
    color: "#158F20",
  },
} satisfies ChartConfig;

export function IncomeExpensesLineChart() {
  const { data: chartData, loading, error } = useFarmerTransactionsChart();

  if (loading) {
    return <div className="text-[#157148] p-4">Loading line chart data...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">Failed to load line chart data</div>
    );
  }

  const transformedData = (chartData || [])
    .map((item: any, index: number) => ({
      week: item.period || `Week ${index + 1}`,
      income: parseFloat(item.income) || 0,
      expenses: parseFloat(item.expenses) || 0,
    }))
    .slice(-6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income & Expenses Trend</CardTitle>
        <CardDescription>Last 6 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[320px]">
          <LineChart
            accessibilityLayer
            data={transformedData}
            margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              className="text-[#157148] text-sm"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-[#157148] text-sm"
              tickFormatter={(value) => `₵ ${value}`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#72BF01"
              strokeWidth={2}
              dot={{ fill: "#72BF01" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#158F20"
              strokeWidth={2}
              dot={{ fill: "#158F20" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium">
          Spending and earnings trend <TrendingUp className="w-4 h-4" />
        </div>
        <div className="text-muted-foreground">
          Showing data from your last 6 weeks of activity
        </div>
      </CardFooter>
    </Card>
  );
}
