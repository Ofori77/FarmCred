import { FarmerOverview, Transaction, Transfer } from "@/lib/types";
import {
  format,
  startOfWeek,
  addWeeks,
  startOfMonth,
  addMonths,
} from "date-fns";
import {
  ArrowUpRight,
  BadgeDollarSign,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Insight = {
  icon: React.ElementType;
  title: string;
  message: string;
};

export function generateFarmerInsights(
  overview: FarmerOverview,
  transactions: Transaction[],
  transfers: Transfer[]
): Insight[] {
  const insights: Insight[] = [];

  // Helper to parse dd/mm/yyyy format dates
  const parseDate = (dateString: string): Date => {
    try {
      // Handle empty or invalid strings
      if (!dateString || typeof dateString !== 'string') {
        console.warn("Invalid date string:", dateString);
        return new Date(); // fallback to current date
      }

      // Parse dd/mm/yyyy format
      const parts = dateString.trim().split('/');
      if (parts.length !== 3) {
        console.warn("Date string not in dd/mm/yyyy format:", dateString);
        return new Date(); // fallback to current date
      }

      const [day, month, year] = parts;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Validate parsed values
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        console.warn("Failed to parse date components:", dateString);
        return new Date(); // fallback to current date
      }

      const date = new Date(yearNum, monthNum - 1, dayNum);
      
      // Check if the created date is valid
      if (isNaN(date.getTime())) {
        console.warn("Created invalid date:", dateString);
        return new Date(); // fallback to current date
      }

      return date;
    } catch (error) {
      console.warn("Failed to parse date:", dateString, error);
      return new Date(); // fallback to current date
    }
  };

  // Helper to get a consistent week identifier (e.g., 'YYYY-MM-DD' for start of week)
  const getWeekIdentifier = (dateString: string) => {
    const date = parseDate(dateString);
    // Additional check to ensure date is valid before formatting
    if (isNaN(date.getTime())) {
      console.warn("Invalid date in getWeekIdentifier:", dateString);
      return format(new Date(), "yyyy-MM-dd"); // fallback to current date
    }
    return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  };

  // Helper to get a consistent month identifier (e.g., 'YYYY-MM')
  const getMonthIdentifier = (dateString: string) => {
    const date = parseDate(dateString);
    // Additional check to ensure date is valid before formatting
    if (isNaN(date.getTime())) {
      console.warn("Invalid date in getMonthIdentifier:", dateString);
      return format(new Date(), "yyyy-MM"); // fallback to current date
    }
    return format(startOfMonth(date), "yyyy-MM");
  };

  // Helper to safely convert to number
  const safeToNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // 1. Peak Income Week
  const incomeByWeek: Record<string, number> = {};
  transactions
    .filter((tx) => tx.status === "income")
    .forEach((tx) => {
      const weekId = getWeekIdentifier(tx.date);
      const amount = safeToNumber(tx.amount);
      console.log("Processing income transaction:", { date: tx.date, amount: tx.amount, parsedAmount: amount, weekId });
      incomeByWeek[weekId] = (incomeByWeek[weekId] || 0) + amount;
    });

  console.log("Income by week:", incomeByWeek);

  const sortedIncomeWeeks = Object.entries(incomeByWeek).sort(
    ([, amountA], [, amountB]) => amountB - amountA
  );

  if (sortedIncomeWeeks.length > 0) {
    const [peakWeekId, peakAmount] = sortedIncomeWeeks[0];
    console.log("Peak week data:", { peakWeekId, peakAmount });
    
    if (peakAmount > 0) {
      insights.push({
        icon: BadgeDollarSign,
        title: `Peak Income Week: ${format(new Date(peakWeekId), "MMM do")}`,
        message: `You earned the most in the week starting ${format(
          new Date(peakWeekId),
          "MMM do"
        )}, totaling GHS ${peakAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}. Great job!`,
      });
    }
  }

  // 2. Lower Expenses (comparing last week to the week before)
  const expensesByWeek: Record<string, number> = {};
  transactions
    .filter((t) => t.status === "expense")
    .forEach((tx) => {
      const weekId = getWeekIdentifier(tx.date);
      const amount = safeToNumber(tx.amount);
      expensesByWeek[weekId] = (expensesByWeek[weekId] || 0) + amount;
    });

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const previousWeekStart = addWeeks(currentWeekStart, -1);

  const currentWeekExpenses =
    expensesByWeek[format(currentWeekStart, "yyyy-MM-dd")] || 0;
  const previousWeekExpenses =
    expensesByWeek[format(previousWeekStart, "yyyy-MM-dd")] || 0;

  if (previousWeekExpenses > 0 && currentWeekExpenses < previousWeekExpenses) {
    const drop =
      ((previousWeekExpenses - currentWeekExpenses) / previousWeekExpenses) *
      100;
    insights.push({
      icon: TrendingDown,
      title: "Expenses Managed",
      message: `Your expenses dropped by ${drop.toFixed(
        1
      )}% this week compared to last week. Keep it up!`,
    });
  } else if (currentWeekExpenses > 0 && previousWeekExpenses === 0) {
    insights.push({
      icon: TrendingDown,
      title: "New Expenses This Week",
      message: `You have expenses this week, with none recorded last week.`,
    });
  }

  // 3. Transfers Up (comparing current month to previous month)
  const transferTotalsByMonth: Record<string, number> = {};
  transfers.forEach((t) => {
    const monthId = getMonthIdentifier(t.date);
    const amount = safeToNumber(t.amount);
    transferTotalsByMonth[monthId] =
      (transferTotalsByMonth[monthId] || 0) + amount;
  });

  const currentMonthStart = startOfMonth(now);
  const previousMonthStart = addMonths(currentMonthStart, -1);

  const currentMonthId = format(currentMonthStart, "yyyy-MM");
  const previousMonthId = format(previousMonthStart, "yyyy-MM");

  const currentMonthTransfers = transferTotalsByMonth[currentMonthId] || 0;
  const previousMonthTransfers = transferTotalsByMonth[previousMonthId] || 0;

  if (
    previousMonthTransfers > 0 &&
    currentMonthTransfers > previousMonthTransfers
  ) {
    const increase =
      ((currentMonthTransfers - previousMonthTransfers) /
        previousMonthTransfers) *
      100;
    insights.push({
      icon: TrendingUp,
      title: "Transfers Increasing",
      message: `You've received ${increase.toFixed(
        1
      )}% more transfers this month compared to last month. Great!`,
    });
  }

  // 4. Savings Trend / Positive Financial Outlook
  const netProfit = safeToNumber(overview.total_income_last_12_months) - safeToNumber(overview.total_expenses);

  if (netProfit > 0) {
    insights.push({
      icon: PiggyBank,
      title: "Positive Financial Outlook",
      message: `You've earned more than you've spent in the last 12 months, with a net gain of GHS ${Number(netProfit).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}.`,
    });
  } else if (netProfit < 0) {
    insights.push({
      icon: TrendingDown,
      title: "Review Spending",
      message: `Your expenses have exceeded your income by GHS ${Number(Math.abs(netProfit)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} over the last 12 months.`,
    });
  } else {
    insights.push({
      icon: PiggyBank,
      title: "Balanced Finances",
      message: "Your income and expenses are balanced over the last 12 months.",
    });
  }

  // 5. Income Trending Up
  const incomeTrendWeeks: Record<string, number> = {};
  transactions
    .filter((tx) => tx.status === "income")
    .forEach((tx) => {
      const weekId = getWeekIdentifier(tx.date);
      const amount = safeToNumber(tx.amount);
      incomeTrendWeeks[weekId] = (incomeTrendWeeks[weekId] || 0) + amount;
    });

  const weekKeys = Object.keys(incomeTrendWeeks).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (weekKeys.length >= 4) {
    const recentWeekIds = weekKeys.slice(-4);

    const period1Sum =
      (incomeTrendWeeks[recentWeekIds[2]] || 0) +
      (incomeTrendWeeks[recentWeekIds[3]] || 0);
    const period2Sum =
      (incomeTrendWeeks[recentWeekIds[0]] || 0) +
      (incomeTrendWeeks[recentWeekIds[1]] || 0);

    if (period1Sum > period2Sum && period2Sum > 0) {
      const growth = ((period1Sum - period2Sum) / period2Sum) * 100;
      insights.push({
        icon: ArrowUpRight,
        title: "Income Trending Up",
        message: `Your income has increased by ${growth.toFixed(
          1
        )}% over the last two weeks compared to the prior two weeks.`,
      });
    } else if (period1Sum < period2Sum && period1Sum > 0) {
      insights.push({
        icon: TrendingDown,
        title: "Income Decreasing",
        message: `Your income has decreased over the last two weeks.`,
      });
    }
  } else if (weekKeys.length >= 2) {
    const latestWeekIncome = incomeTrendWeeks[weekKeys[weekKeys.length - 1]];
    const prevWeekIncome = incomeTrendWeeks[weekKeys[weekKeys.length - 2]];

    if (latestWeekIncome > prevWeekIncome) {
      insights.push({
        icon: ArrowUpRight,
        title: "Income Growing",
        message: "Your income increased this week compared to last week.",
      });
    }
  }

  return insights;
}
