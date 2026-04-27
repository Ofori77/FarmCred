"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useInvestorProfile } from "@/hooks/useInvestorData";

const chartConfig = {
  investments: {
    label: "Investment",
  },
} satisfies ChartConfig;

export function ChartBarInvestmentROI() {
  const { data: profile, loading, error } = useInvestorProfile();

  if (loading)
    return (
      <div className="p-4 text-[#157148]">Loading investment data</div>
    );

  if (error)
    return <div className="p-4 text-red-600">Faailed to load chart data</div>;

  const mockMonthlyInvestments = [
    { month: "Aug", investment: 100 },
    { month: "Sep", investment: 500 },
    { month: "Oct", investment: 400 },
    { month: "Nov", investment: 700 },
    { month: "Dec", investment: 100 },
    { month: "Jan", investment: 600 },
    { month: "Feb", investment: 200 },
    { month: "Mar", investment: 620 },
  ];

  // Find the highest investment value
  const maxInvestmentValue = Math.max(
    ...mockMonthlyInvestments.map((data) => data.investment)
  );

  // Prepare chartData, ensuring each item has a `fillColor` property
  const chartData = mockMonthlyInvestments.map((data) => ({
    ...data,
    // Assign a dynamic color based on whether it's the highest investment month
    fillColor: data.investment === maxInvestmentValue ? "#72bf01" : "#d3d3d3", // Brand color vs. light gray
  }));

  return (
    <Card className="h-full shadow-md flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Monthly Investment</CardTitle>
        <CardDescription>Historical Investment Data</CardDescription>
      </CardHeader>
      <CardContent className="flex=1 min-h-0">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar dataKey="investment" radius={8}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Keep investing to grow your impact and returns
        </div>
      </CardFooter>
    </Card>
  );
}
