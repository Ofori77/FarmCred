"use client";

import { useState } from "react";
import { useAdminOrders } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ShoppingCart, CheckCircle, AlertTriangle, TruckIcon, PackageIcon, BanknoteIcon } from "lucide-react";
import { format } from "date-fns";
import { RefreshCw, Search, Filter, Eye } from "lucide-react";
import Link from "next/link";
import { AdminOrder, ApiFilters } from "@/lib/types/admintypes";

export default function OrderManagement() {
  const [filters, setFilters] = useState<ApiFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error, refetch } = useAdminOrders(filters);

  const handleStatusFilter = (value: string) => {
    setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }));
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setFilters(prev => ({ ...prev, start_date: date.toISOString().split('T')[0] }));
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setFilters(prev => ({ ...prev, end_date: date.toISOString().split('T')[0] }));
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "disputed": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Count orders by status - with safety checks
  const pendingOrders = data?.results?.filter(order => order.status === "pending").length || 0;
  const completedOrders = data?.results?.filter(order => order.status === "completed").length || 0;
  const shippedOrders = data?.results?.filter(order => order.status === "shipped").length || 0;
  const disputedOrders = data?.results?.filter(order => order.is_disputed).length || 0;

  // Calculate total value of orders - with safety checks
  const totalOrderValue = data?.results?.reduce((sum, order) => {
    const amount = typeof order.total_amount === 'number' ? order.total_amount : 0;
    return sum + amount;
  }, 0) || 0;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Monitor and manage all orders across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{data?.count || 0}</p>
              </div>
              <div className="text-blue-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
              </div>
              <div className="text-yellow-600">
                <PackageIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Shipping</p>
                <p className="text-2xl font-bold text-purple-600">{shippedOrders}</p>
              </div>
              <div className="text-purple-600">
                <TruckIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
              </div>
              <div className="text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-indigo-600">
                  GH₵ {typeof totalOrderValue === 'number' ? totalOrderValue.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="text-indigo-600">
                <BanknoteIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Orders</CardTitle>
                <div className="flex gap-2">
                  <div className="flex">
                    <Input
                      placeholder="Search orders..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Start Date:</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[240px] justify-start text-left font-normal ${
                          !filters.start_date && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.start_date ? format(new Date(filters.start_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.start_date ? new Date(filters.start_date) : undefined}
                        onSelect={handleStartDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">End Date:</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[240px] justify-start text-left font-normal ${
                          !filters.end_date && "text-muted-foreground"
                        }`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.end_date ? format(new Date(filters.end_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.end_date ? new Date(filters.end_date) : undefined}
                        onSelect={handleEndDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {renderOrdersList()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersList("pending")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="processing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersList("processing")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shipped" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipped Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersList("shipped")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersList("completed")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="disputed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Disputed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderOrdersList(undefined, true)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );

  function renderOrdersList(statusFilter?: string, disputedOnly?: boolean) {
    let filteredOrders = data?.results;
    
    if (statusFilter) {
      filteredOrders = filteredOrders?.filter(order => order.status === statusFilter);
    }
    
    if (disputedOnly) {
      filteredOrders = filteredOrders?.filter(order => order.is_disputed);
    }
    
    if (loading) {
      return (
        <div className="py-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-2">Loading orders...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="py-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={refetch} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      );
    }
    
    if (!filteredOrders?.length) {
      return (
        <div className="py-6 text-center">
          <p className="text-gray-600">No orders found matching the criteria.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Produce</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map((order: AdminOrder) => (
              <TableRow key={order.id}>
                <TableCell>#{order.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{order.buyer_name || `Buyer #${order.buyer}`}</div>
                  <div className="text-xs text-gray-500">ID: {order.buyer}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{order.farmer_name || `Farmer #${order.farmer}`}</div>
                  <div className="text-xs text-gray-500">ID: {order.farmer}</div>
                </TableCell>
                <TableCell>
                  <div>{order.produce_type || 'N/A'}</div>
                  <div className="text-xs text-gray-500">Qty: {order.quantity || 0}</div>
                </TableCell>
                <TableCell className="font-medium">
                  GH₵ {typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : '0.00'}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(order.status)}>
                    {order.status}
                  </Badge>
                  {order.is_disputed && (
                    <Badge className="ml-1 bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Disputed
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={order.is_paid ? "default" : "outline"}>
                    {order.is_paid ? "Paid" : "Unpaid"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin-dashboard/order-management/${order.id}`}>
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
            Showing {filteredOrders?.length || 0} of {statusFilter || disputedOnly ? filteredOrders?.length : data?.count || 0} orders
          </p>
          {!statusFilter && !disputedOnly && (
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
          )}
        </div>
      </div>
    );
  }
}