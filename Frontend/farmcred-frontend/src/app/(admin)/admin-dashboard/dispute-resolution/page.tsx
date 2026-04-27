"use client";

import { useState } from "react";
import { useAdminDisputes, useResolveDispute } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Filter, AlertTriangle, CheckCircle, BarChart3, Shield, Clock } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AdminDispute } from "@/lib/types/admintypes";

export default function DisputeResolution() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [resolution, setResolution] = useState<string>("buyer");
  const [resolutionNotes, setResolutionNotes] = useState("");
  
  const { data: disputes, loading, error, refetch } = useAdminDisputes();
  const { resolveDispute, loading: resolving } = useResolveDispute();

  const handleSearch = () => {
    // In a real implementation, you would filter the disputes based on search query
    console.log("Searching for:", searchQuery);
  };

  const filteredDisputes = disputes?.filter(dispute => {
    if (statusFilter === "all") return true;
    return dispute.status === statusFilter;
  }) || [];

  const openResolveDialog = (dispute: AdminDispute) => {
    setSelectedDispute(dispute);
    setResolveDialogOpen(true);
    setResolution("buyer"); // Default resolution in favor of buyer
    setResolutionNotes("");
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    
    try {
      await resolveDispute(selectedDispute.id, {
        resolution,
        resolution_notes: resolutionNotes
      });

      toast.success(`The dispute for order #${selectedDispute.id} has been resolved.`);

      setResolveDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error("Failed to resolve dispute");
      
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case "escalated":
        return <Badge className="bg-red-100 text-red-800">Escalated</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getPendingCount = () => {
    return disputes?.filter(d => d.status === "pending").length || 0;
  };

  const getResolvedCount = () => {
    return disputes?.filter(d => d.status === "resolved").length || 0;
  };

  const getEscalatedCount = () => {
    return disputes?.filter(d => d.status === "escalated").length || 0;
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
          <p className="text-gray-600">Manage and resolve disputes between farmers and buyers</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Dispute Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Disputes</p>
                <p className="text-2xl font-bold text-blue-600">{disputes?.length || 0}</p>
              </div>
              <div className="text-blue-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Resolution</p>
                <p className="text-2xl font-bold text-yellow-600">{getPendingCount()}</p>
              </div>
              <div className="text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{getResolvedCount()}</p>
              </div>
              <div className="text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Escalated</p>
                <p className="text-2xl font-bold text-red-600">{getEscalatedCount()}</p>
              </div>
              <div className="text-red-600">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Disputed Orders</CardTitle>
            <div className="flex gap-2">
              <div className="flex">
                <Input
                  placeholder="Search disputes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-r-none"
                />
                <Button onClick={handleSearch} variant="default" className="rounded-l-none">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select defaultValue="all" onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading disputes...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center">
              <p className="text-red-600">{error}</p>
              <Button onClick={refetch} variant="outline" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">No disputes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Dispute Reason</TableHead>
                    <TableHead>Date Raised</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>#{dispute.id}</TableCell>
                      <TableCell>{dispute.buyer_name}</TableCell>
                      <TableCell>{dispute.farmer_name}</TableCell>
                      <TableCell>GH₵ {Number(dispute?.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={dispute.dispute_reason}>
                          {dispute.dispute_reason}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(dispute.dispute_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell className="text-right">
                        {dispute.status === "pending" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openResolveDialog(dispute)}
                          >
                            Resolve
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.location.href = `/admin-dashboard/order-management/${dispute.id}`}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Resolution Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Dispute Resolution Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Resolution Rate</h4>
              <p className="text-sm text-gray-600">
                {disputes?.length ? 
                  Math.round((getResolvedCount() / disputes.length) * 100) : 0}% of disputes resolved
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Average Resolution Time</h4>
              <p className="text-sm text-gray-600">
                48 hours
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Common Dispute Reasons</h4>
              <p className="text-sm text-gray-600">
                Product quality, delivery issues, quantity discrepancies
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resolve Dispute for Order #{selectedDispute?.id}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Dispute Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Buyer:</div>
                <div>{selectedDispute?.buyer_name}</div>
                <div className="text-gray-500">Farmer:</div>
                <div>{selectedDispute?.farmer_name}</div>
                <div className="text-gray-500">Amount:</div>
                <div>GH₵ {selectedDispute?.total_amount.toFixed(2)}</div>
                <div className="text-gray-500">Reason:</div>
                <div>{selectedDispute?.dispute_reason}</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Decision</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">In favor of buyer (refund)</SelectItem>
                  <SelectItem value="farmer">In favor of farmer (release payment)</SelectItem>
                  <SelectItem value="partial">Partial refund</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                placeholder="Explain the resolution decision..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleResolveDispute} 
              disabled={resolving || !resolutionNotes}
            >
              {resolving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Dispute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}