"use client";

import { useFarmerTransactionsChart, useFarmerTransactions, useFarmerOverview } from "@/hooks/useFarmerData";
import { useFarmerListings } from "@/hooks/useMarketPlace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Star,
  Target,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Trust Score Card Component
function TrustScoreCard() {
  const { data: overview } = useFarmerOverview();

  if (!overview) return null;

  // Convert to numbers with fallbacks
  const trustScorePercent = Number(overview.trust_score_percent) || 0;
  const trustLevelStars = Number(overview.trust_level_stars) || 0;

  const improvementTips = [
    "Complete all orders on time to improve delivery reliability",
    "Maintain accurate product descriptions and quantities", 
    "Respond promptly to buyer messages",
    "Keep your profile information up to date"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Trust Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#158f20]">
              {trustScorePercent.toFixed(0)}%
            </div>
            <p className="text-sm text-gray-600">Current Trust Score</p>
            <div className="flex justify-center mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(trustLevelStars)
                      ? 'text-yellow-500 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Improvement Tips
            </h4>
            <div className="space-y-2">
              {improvementTips.slice(0, 3).map((tip, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <Target className="h-3 w-3 mt-1 text-[#158f20] flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Revenue Analytics Component
function RevenueAnalytics() {
  const { data: chartData, loading, error } = useFarmerTransactionsChart();

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !chartData || chartData.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">
              {error ? `Error loading data: ${error}` : 'No transaction data available'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Revenue Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `₵${Number(value).toFixed(2)}`,
                  name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Net'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#158f20" 
                strokeWidth={3}
                dot={{ fill: '#158f20', strokeWidth: 2 }}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2 }}
                name="Expenses"
              />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                name="Net"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Key Metrics Component
function KeyMetrics() {
  const { data: overview } = useFarmerOverview();
  const { data: listings } = useFarmerListings();
  const { data: transactions } = useFarmerTransactions();

  if (!overview) return null;

  // Convert overview values to numbers with fallbacks
  const currentMonthIncome = Number(overview.current_month_income) || 0;
  const currentMonthExpenses = Number(overview.current_month_expenses) || 0;
  const activeLoans = Number(overview.active_loans) || 0;

  const activeListings = listings?.filter(l => l.status === 'active').length || 0;
  const totalProduceSales = transactions?.filter(t => t.category === 'produce_sale' && t.status === 'income') || [];
  const totalRevenue = totalProduceSales.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const averageOrderValue = totalProduceSales.length > 0 ? totalRevenue / totalProduceSales.length : 0;

  const metrics = [
    {
      title: "Monthly Income",
      value: `₵${currentMonthIncome.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Monthly Expenses", 
      value: `₵${currentMonthExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-red-600"
    },
    {
      title: "Active Loans",
      value: activeLoans.toString(),
      icon: Package,
      color: "text-orange-600"
    },
    {
      title: "Active Listings",
      value: activeListings.toString(),
      icon: Package,
      color: "text-blue-600"
    }
  ];

  return (
    <>
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-gray-100 ${metric.color}`}>
                <metric.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function AnalyticsPage() {
  const { data: overview, loading: overviewLoading, error: overviewError } = useFarmerOverview();
  const { data: transactions, loading: transactionsLoading } = useFarmerTransactions();
  const { data: listings, loading: listingsLoading } = useFarmerListings();

  if (overviewLoading || transactionsLoading || listingsLoading) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
        <div className="text-center text-red-600">
          <p>Error loading analytics data: {overviewError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#158f20]">Analytics Dashboard</h1>
        <p className="text-gray-600">Insights into your farming business performance</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KeyMetrics />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueAnalytics />
        <TrustScoreCard />
      </div>

      {/* No data states */}
      {(!transactions || transactions.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transaction data</h3>
            <p className="text-gray-600">
              Start recording your transactions to see detailed analytics
            </p>
          </CardContent>
        </Card>
      )}

      {(!listings || listings.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No marketplace listings</h3>
            <p className="text-gray-600">
              Create your first produce listing to start selling
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
