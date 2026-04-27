"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarmerTransactionsChart } from "@/hooks/useFarmerData";
import { useMemo } from "react";

const chartConfig = {
  income: {
    label: "Income",
    color: "#72BF01",
  },
  expenses: {
    label: "Expenses",
    color: "#158F20",
  },
};

export default function IncomeExpensesChart() {
  const { data: chartData, loading, error } = useFarmerTransactionsChart();

  const processedData = useMemo(() => {
    if (!Array.isArray(chartData)) {
      return [];
    }
    
    return chartData.map((item, index) => {
      return {
        week: item.period || `Week ${index + 1}`,
        income: parseFloat(item.income?.toString()) || 0,
        expenses: parseFloat(item.expenses?.toString()) || 0
      };
    });
  }, [chartData]);

  if (loading)
    return <div className="p-4 text-[#157148]">Loading income vs expenses data...</div>;

  if (error)
    return <div className="p-4 text-red-600">Failed to load chart data</div>;

  return (
    <Card className="p-6 flex flex-col w-full dark:bg-card rounded-[12px] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
        <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No chart data available
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₵${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="income"
                stroke={chartConfig.income.color}
                strokeWidth={2}
                dot={{ r: 4, fill: chartConfig.income.color }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={chartConfig.expenses.color}
                strokeWidth={2}
                dot={{ r: 4, fill: chartConfig.expenses.color }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
