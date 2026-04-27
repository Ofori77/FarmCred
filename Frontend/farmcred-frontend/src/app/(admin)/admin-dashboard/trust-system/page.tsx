"use client";

import { useState } from "react";
import { useTrustAnalytics } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Star, ChevronRight, UserCheck, Users, Shield } from "lucide-react";
import Link from "next/link";

export default function TrustSystem() {
  const { data, loading, error, refetch } = useTrustAnalytics();

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trust System</h1>
          <p className="text-gray-600">Monitor and manage farmer trust scores and analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-2">Loading trust analytics...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={refetch} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Trust Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Trust Score</p>
                    <p className="text-2xl font-bold text-blue-600">{data?.average_trust_score.toFixed(2)}%</p>
                  </div>
                  <div className="text-blue-600">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>
                <Progress value={data?.average_trust_score} className="mt-2 h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Farmers</p>
                    <p className="text-2xl font-bold text-green-600">{data?.total_farmers}</p>
                  </div>
                  <div className="text-green-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recent Reviews</p>
                    <p className="text-2xl font-bold text-purple-600">{data?.recent_reviews.length}</p>
                  </div>
                  <div className="text-purple-600">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Level Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-36 flex items-center">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm font-medium">5 Stars</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(data?.trust_level_distribution.level_5_stars / data?.total_farmers) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {data?.trust_level_distribution.level_5_stars}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-36 flex items-center">
                    <div className="flex">
                      {[...Array(4)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                      <Star className="h-4 w-4 text-gray-300" />
                    </div>
                    <span className="ml-2 text-sm font-medium">4 Stars</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(data?.trust_level_distribution.level_4_stars / data?.total_farmers) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {data?.trust_level_distribution.level_4_stars}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-36 flex items-center">
                    <div className="flex">
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                      {[...Array(2)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm font-medium">3 Stars</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(data?.trust_level_distribution.level_3_stars / data?.total_farmers) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {data?.trust_level_distribution.level_3_stars}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-36 flex items-center">
                    <div className="flex">
                      {[...Array(2)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      ))}
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm font-medium">2 Stars</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(data?.trust_level_distribution.level_2_stars / data?.total_farmers) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {data?.trust_level_distribution.level_2_stars}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-36 flex items-center">
                    <div className="flex">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      {[...Array(4)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm font-medium">1 Star</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(data?.trust_level_distribution.level_1_stars / data?.total_farmers) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {data?.trust_level_distribution.level_1_stars}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recent_reviews?.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>#{review.id}</TableCell>
                      <TableCell>{review.investor_name}</TableCell>
                      <TableCell>{review.farmer_name}</TableCell>
                      <TableCell>{new Date(review.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data?.recent_reviews?.length === 0 && (
                <div className="py-6 text-center text-gray-500">
                  No recent reviews found
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}