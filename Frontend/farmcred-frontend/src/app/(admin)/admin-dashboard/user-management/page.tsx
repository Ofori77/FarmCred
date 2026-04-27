"use client";

import { useState } from "react";
import { useAdminUsers } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Search, UserPlus, Filter, Eye, Edit, MoreHorizontal, Users, ShoppingCart, TrendingUp, Briefcase } from "lucide-react";
import Link from "next/link";
import { AdminUser, ApiFilters } from "@/lib/types/admintypes";

export default function UserManagement() {
  const [filters, setFilters] = useState<ApiFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loading, error, refetch } = useAdminUsers(filters);

  const handleRoleFilter = (value: string) => {
    setFilters(prev => ({ ...prev, role: value === "all" ? "" : value }));
  };

  const handleActiveFilter = (value: string) => {
    setFilters(prev => ({ ...prev, active: value === "all" ? "" : value }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "farmer": return "bg-green-100 text-green-800";
      case "investor": return "bg-blue-100 text-blue-800";
      case "buyer": return "bg-purple-100 text-purple-800";
      case "platform_lender": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Count users by role
  const farmersCount = data?.results?.filter(user => user.role === "farmer").length || 0;
  const investorsCount = data?.results?.filter(user => user.role === "investor").length || 0;
  const buyersCount = data?.results?.filter(user => user.role === "buyer").length || 0;
  const platformLendersCount = data?.results?.filter(user => user.role === "platform_lender").length || 0;
  const activeUsersCount = data?.results?.filter(user => user.is_active).length || 0;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage and monitor user accounts across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{data?.count || 0}</p>
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
                <p className="text-sm font-medium text-gray-600">Farmers</p>
                <p className="text-2xl font-bold text-green-600">{farmersCount}</p>
              </div>
              <div className="text-green-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Investors</p>
                <p className="text-2xl font-bold text-blue-600">{investorsCount}</p>
              </div>
              <div className="text-blue-600">
                <Briefcase className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Buyers</p>
                <p className="text-2xl font-bold text-purple-600">{buyersCount}</p>
              </div>
              <div className="text-purple-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-yellow-600">{activeUsersCount}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data?.count ? Math.round((activeUsersCount / data.count) * 100) : 0}% active
                </p>
              </div>
              <div className="text-yellow-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Role Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="farmer">Farmers</TabsTrigger>
          <TabsTrigger value="investor">Investors</TabsTrigger>
          <TabsTrigger value="buyer">Buyers</TabsTrigger>
          <TabsTrigger value="platform_lender">Platform Lenders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Users</CardTitle>
                <div className="flex gap-2">
                  <div className="flex">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-r-none"
                    />
                    <Button onClick={handleSearch} variant="default" className="rounded-l-none">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select defaultValue="all" onValueChange={handleActiveFilter}>
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
              {renderUsersList()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="farmer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Farmers</CardTitle>
            </CardHeader>
            <CardContent>
              {renderUsersList("farmer")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="investor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Investors</CardTitle>
            </CardHeader>
            <CardContent>
              {renderUsersList("investor")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="buyer" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Buyers</CardTitle>
            </CardHeader>
            <CardContent>
              {renderUsersList("buyer")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="platform_lender" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Lenders</CardTitle>
            </CardHeader>
            <CardContent>
              {renderUsersList("platform_lender")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </main>
  );

  function renderUsersList(roleFilter?: string) {
    const filteredUsers = roleFilter 
      ? data?.results?.filter(user => user.role === roleFilter)
      : data?.results;
      
    if (loading) {
      return (
        <div className="py-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-2">Loading users...</p>
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
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email/Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Additional Info</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user: AdminUser) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>
                  <div>{user.email}</div>
                  <div className="text-gray-500 text-sm">{user.phone_number}</div>
                </TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                <TableCell>{user.last_activity ? new Date(user.last_activity).toLocaleDateString() : "Never"}</TableCell>
                <TableCell>
                  {user.role === "farmer" && (
                    <div className="text-xs">
                      <div>Trust Score: {user.farmer_profile?.trust_score_percent || "N/A"}</div>
                      <div>Produce: {user.farmer_profile?.produce?.length || 0} items</div>
                    </div>
                  )}
                  {user.role === "investor" && (
                    <div className="text-xs">
                      <div>Active Loans: {user.total_loans || 0}</div>
                      <div>Total Invested: GH₵ {user.investor_profile?.total_invested || 0}</div>
                    </div>
                  )}
                  {user.role === "buyer" && (
                    <div className="text-xs">
                      <div>Orders: {user.total_orders || 0}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin-dashboard/user-management/${user.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin-dashboard/user-management/${user.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredUsers?.length || 0} of {roleFilter ? filteredUsers?.length : data?.count || 0} users
          </p>
          {!roleFilter && (
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