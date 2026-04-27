"use client";

import { useState } from "react";
import { useAdminUsers, useAdminLoans } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Briefcase, TrendingUp, DollarSign, Eye, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AdminUser, ApiFilters } from "@/lib/types/admintypes";

export default function InvestorManagement() {
  const [filters, setFilters] = useState<ApiFilters>({ role: "investor" });
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useAdminUsers(filters);
  const { data: loans, loading: loansLoading } = useAdminLoans();

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  // Calculate investor metrics
  const totalInvestors = users?.count || 0;
  const activeInvestors = users?.results?.filter(user => user.is_active).length || 0;
  const totalInvested = 250000; // This would come from an API in a real implementation
  const averageInvestment = totalInvestors ? totalInvested / totalInvestors : 0;
  
  // Get loans by investor
  const getLoansByInvestor = (investorId: number) => {
    return loans?.results?.filter(loan => loan.lender === investorId) || [];
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investor Management</h1>
          <p className="text-gray-600">Monitor and manage investor accounts and investment activities</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Investor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investors</p>
                <p className="text-2xl font-bold text-blue-600">{totalInvestors}</p>
              </div>
              <div className="text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Investors</p>
                <p className="text-2xl font-bold text-green-600">{activeInvestors}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {totalInvestors ? Math.round((activeInvestors / totalInvestors) * 100) : 0}% active
                </p>
              </div>
              <div className="text-green-600">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invested</p>
                <p className="text-2xl font-bold text-purple-600">GH₵ {(totalInvested / 1000).toFixed(1)}K</p>
              </div>
              <div className="text-purple-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Investment</p>
                <p className="text-2xl font-bold text-yellow-600">GH₵ {averageInvestment.toFixed(2)}</p>
              </div>
              <div className="text-yellow-600">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Investors List</CardTitle>
            <div className="flex gap-2">
              <div className="flex">
                <Input
                  placeholder="Search investors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-r-none"
                />
                <Button onClick={handleSearch} variant="default" className="rounded-l-none">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select defaultValue="all" onValueChange={(value) => setFilters(prev => ({ ...prev, active: value === "all" ? "" : value }))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="py-6 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading investors...</p>
            </div>
          ) : usersError ? (
            <div className="py-6 text-center">
              <p className="text-red-600">{usersError}</p>
              <Button onClick={refetchUsers} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Active Loans</TableHead>
                    <TableHead>Total Invested</TableHead>
                    <TableHead>Portfolio Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.results?.map((investor: AdminUser) => {
                    const investorLoans = getLoansByInvestor(investor.id);
                    const activeLoans = investorLoans.filter(loan => loan.status === "active").length;
                    const totalInvestedAmount = investorLoans.reduce((sum, loan) => sum + loan.amount, 0);
                    const defaultedLoans = investorLoans.filter(loan => loan.status === "defaulted").length;
                    
                    return (
                      <TableRow key={investor.id}>
                        <TableCell className="font-medium">{investor.full_name}</TableCell>
                        <TableCell>
                          <div>{investor.email}</div>
                          <div className="text-gray-500 text-sm">{investor.phone_number}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={investor.is_active ? "default" : "destructive"}>
                            {investor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(investor.date_joined).toLocaleDateString()}</TableCell>
                        <TableCell>{activeLoans}</TableCell>
                        <TableCell>GH₵ {totalInvestedAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          {defaultedLoans > 0 ? (
                            <Badge className="bg-red-100 text-red-800">
                              {defaultedLoans} Defaulted
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              Healthy
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin-dashboard/user-management/${investor.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {users?.results?.length || 0} of {users?.count || 0} investors
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!filters.page || filters.page <= 1}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!users?.count || (filters.page || 1) * 10 >= users.count}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Investors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Investors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Investor</TableHead>
                <TableHead>Total Invested</TableHead>
                <TableHead>Active Loans</TableHead>
                <TableHead>Return Rate</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.results?.slice(0, 5).map((investor: AdminUser, index) => {
                const investorLoans = getLoansByInvestor(investor.id);
                const totalInvestedAmount = investorLoans.reduce((sum, loan) => sum + loan.amount, 0);
                const activeLoans = investorLoans.filter(loan => loan.status === "active").length;
                
                return (
                  <TableRow key={investor.id}>
                    <TableCell>#{index + 1}</TableCell>
                    <TableCell className="font-medium">{investor.full_name}</TableCell>
                    <TableCell>GH₵ {totalInvestedAmount.toFixed(2)}</TableCell>
                    <TableCell>{activeLoans}</TableCell>
                    <TableCell>{(Math.random() * 15 + 5).toFixed(1)}%</TableCell>
                    <TableCell>{new Date(investor.date_joined).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}