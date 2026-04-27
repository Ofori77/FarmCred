"use client";

import { useAdminDashboardStats, useAdminUsers } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  HandCoins,
  Handshake,
  BarChart3,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Info
} from "lucide-react";
import Link from "next/link";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

function StatsCard({ title, value, icon, trend, color = "blue" }: StatsCardProps) {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600", 
    yellow: "text-yellow-600",
    red: "text-red-600",
    purple: "text-purple-600",
    indigo: "text-indigo-600"
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
              {value}
            </p>
            {trend && (
              <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
                {trend.value}% from last month
              </p>
            )}
          </div>
          <div className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
}

function QuickAction({ title, description, href, icon, color = "gray" }: QuickActionProps) {
  const colorClasses = {
    gray: "border-gray-200 hover:border-gray-300",
    green: "border-green-200 hover:border-green-300",
    blue: "border-blue-200 hover:border-blue-300",
    yellow: "border-yellow-200 hover:border-yellow-300",
    red: "border-red-200 hover:border-red-300"
  };

  return (
    <Link href={href}>
      <Card className={`${colorClasses[color as keyof typeof colorClasses]} cursor-pointer transition-colors`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="text-gray-600">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useAdminDashboardStats();
  const { data: users, loading: usersLoading, error: usersError } = useAdminUsers();

  if (statsLoading || usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="animate-spin">
            <RefreshCw className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border border-gray-200">
              <CardContent className="p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 mb-4">{statsError}</p>
          <Button onClick={refetchStats} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Use user count from users endpoint if available
  const totalUsers = users?.results?.length || 0;

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of platform performance and key metrics</p>
        </div>
        <Button onClick={refetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

     
      {/* Platform Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatsCard
          title="Active Orders"
          value={stats?.total_active_orders || 0}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`GH₵ ${((stats?.total_transaction_value_last_30_days || 0) / 1000).toFixed(1)}K`}
          icon={<DollarSign className="h-6 w-6" />}
          color="purple"
        />
        <StatsCard
          title="Escrow Balance"
          value={`GH₵ ${((stats?.total_funds_in_escrow || 0) / 1000).toFixed(1)}K`}
          icon={<Handshake className="h-6 w-6" />}
          color="yellow"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Disputed Orders"
          value={stats?.total_disputed_orders || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
        />
        <StatsCard
          title="Completed Orders"
          value={stats?.total_completed_orders_last_30_days || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          title="New Farmers"
          value={stats?.new_farmers_last_30_days || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatsCard
          title="New Buyers"
          value={stats?.new_buyers_last_30_days || 0}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="indigo"
        />
      </div>

     

      {/* Platform Health Indicators */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Platform Health Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Active Orders</h4>
              <p className="text-sm text-gray-600">
                {stats?.total_active_orders || 0} orders currently active
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Monthly Completions</h4>
              <p className="text-sm text-gray-600">
                {stats?.total_completed_orders_last_30_days || 0} orders completed this month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

    </main>
  );
}