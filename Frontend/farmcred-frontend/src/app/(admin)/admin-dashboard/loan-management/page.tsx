"use client";

import { useState } from "react";
import { useAdminLoans } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Filter, Eye, HandCoins, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { AdminLoan, ApiFilters } from "@/lib/types/admintypes";

export default function LoanManagement() {
  const [filters, setFilters] = useState<ApiFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error, refetch } = useAdminLoans(filters);

  const handleStatusFilter = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }));
  };

  const handleLenderTypeFilter = (value: string) => {
    setFilters(prev => ({ ...prev, lender_type: value === "all" ? "" : value }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "repaid": return "bg-blue-100 text-blue-800";
      case "defaulted": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getLenderBadgeColor = (type: string) => {
    switch (type) {
      case "investor": return "bg-purple-100 text-purple-800";
      case "platform": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const calculateDaysRemaining = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Management</h1>
          <p className="text-gray-600">Monitor and manage all loans across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Loan Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loans</p>
                <p className="text-2xl font-bold text-blue-600">{data?.count || 0}</p>
              </div>
              <div className="text-blue-600">
                <HandCoins className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold text-green-600">
                  {data?.results?.filter(loan => loan.status === 'active').length || 0}
                </p>
              </div>
              <div className="text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due This Month</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {data?.results?.filter(loan => {
                    if (loan.status !== 'active') return false;
                    const dueDate = new Date(loan.due_date);
                    const today = new Date();
                    return dueDate.getMonth() === today.getMonth() && 
                           dueDate.getFullYear() === today.getFullYear();
                  }).length || 0}
                </p>
              </div>
              <div className="text-yellow-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Defaulted Loans</p>
                <p className="text-2xl font-bold text-red-600">
                  {data?.results?.filter(loan => loan.status === 'defaulted').length || 0}
                </p>
              </div>
              <div className="text-red-600">
                <HandCoins className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Loans List</CardTitle>
            <div className="flex gap-2">
              <div className="flex">
                <Input
                  placeholder="Search loans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-r-none"
                />
                <Button onClick={handleSearch} variant="default" className="rounded-l-none">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select defaultValue="all" onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="repaid">Repaid</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all" onValueChange={handleLenderTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Lender Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lenders</SelectItem>
                  <SelectItem value="investor">Investors</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading loans...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center">
              <p className="text-red-600">{error}</p>
              <Button onClick={refetch} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Taken</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results?.map((loan: AdminLoan) => (
                    <TableRow key={loan.id}>
                      <TableCell>#{loan.id}</TableCell>
                      <TableCell>{loan.farmer_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{loan.lender_name}</span>
                          <Badge className={getLenderBadgeColor(loan.lender_type)}>
                            {loan.lender_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">GH₵ {loan.amount.toFixed(2)}</TableCell>
                      <TableCell>{loan.interest_rate}%</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(loan.status)}>
                          {loan.status}
                        </Badge>
                        {loan.status === 'active' && calculateDaysRemaining(loan.due_date) <= 7 && (
                          <Badge className="ml-1 bg-red-100 text-red-800">
                            {calculateDaysRemaining(loan.due_date)} days left
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(loan.date_taken).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(loan.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin-dashboard/loan-management/${loan.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {data?.results?.length || 0} of {data?.count || 0} loans
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!filters.page || filters.page <= 1}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data?.count || (filters.page || 1) * 10 >= data.count}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}