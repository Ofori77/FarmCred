"use client";

import { useState, useMemo } from "react";
import { useFarmerOrders } from "@/hooks/useFarmerOrders";
import { useConfirmDelivery, useUpdateOrderStatus } from "@/hooks/useFarmerOrders";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Package, Truck, AlertCircle, MoreHorizontal, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Order } from "@/lib/types/marketplacetypes";

// Order Status Badge Component
function OrderStatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending Payment' };
      case 'paid_to_escrow':
        return { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Paid to Escrow' };
      case 'farmer_confirmed_delivery':
        return { color: 'bg-orange-100 text-orange-800', icon: Truck, text: 'Awaiting Delivery' };
      case 'buyer_confirmed_receipt':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Delivered' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completed' };
      case 'disputed':
        return { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Disputed' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, text: status };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge className={config.color}>
      <IconComponent className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  );
}

// Order Detail Modal Component
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { confirmDelivery, loading: confirmLoading } = useConfirmDelivery();
  const { updateStatus, loading: updateLoading } = useUpdateOrderStatus();
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Convert to numbers with fallbacks
  const totalAmount = Number(order.total_amount) || 0;
  const quantity = Number(order.quantity) || 1;
  const unitPrice = quantity > 0 ? totalAmount / quantity : 0;

  const handleConfirmDelivery = async () => {
    try {
      await confirmDelivery(order.id, deliveryNotes);
      toast.success("Delivery confirmed successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm delivery");
    }
  };

  const canConfirmDelivery = order.status === 'paid_to_escrow';

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-600">Order ID</Label>
          <p className="font-mono text-sm">#{order.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-600">Status</Label>
          <div className="mt-1">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-600">Buyer</Label>
          <p>{order.buyer_full_name || `Buyer #${order.buyer}`}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-600">Order Date</Label>
          <p>{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Product Details */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Product Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Product:</span>
            <span className="font-medium">{order.produce_type || 'Product'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Quantity:</span>
            <span>{quantity} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Unit Price:</span>
            <span>₵{unitPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-2">
            <span>Total Amount:</span>
            <span>₵{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Information */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Delivery Information</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Date:</span>
            <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canConfirmDelivery && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Confirm Delivery</h4>
          <div className="space-y-3">
            <div>
              <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
              <Textarea
                id="delivery-notes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Add any notes about the delivery..."
                rows={3}
              />
            </div>
            <Button 
              onClick={handleConfirmDelivery}
              disabled={confirmLoading}
              className="w-full bg-[#158f20] hover:bg-[#0f6b18]"
            >
              {confirmLoading ? "Confirming..." : "Confirm Delivery"}
            </Button>
          </div>
        </div>
      )}

      {/* Order Timeline */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">Order Timeline</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium">Order Placed</p>
              <p className="text-xs text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>
          {order.status !== 'pending_payment' && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Payment Received</p>
                <p className="text-xs text-gray-600">Payment held in escrow</p>
              </div>
            </div>
          )}
          {order.status === 'completed' && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium">Delivery Confirmed</p>
                <p className="text-xs text-gray-600">Order completed successfully</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onViewDetails }: {
  order: Order;
  onViewDetails: (order: Order) => void;
}) {
  const { confirmDelivery, loading } = useConfirmDelivery();

  // Convert to numbers with fallbacks
  const totalAmount = Number(order.total_amount) || 0;
  const quantity = Number(order.quantity) || 1;
  const unitPrice = quantity > 0 ? totalAmount / quantity : 0;

  const handleQuickConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to confirm delivery?")) {
      try {
        await confirmDelivery(order.id);
        toast.success("Delivery confirmed!");
      } catch (error: any) {
        toast.error(error.message || "Failed to confirm delivery");
      }
    }
  };

  const canQuickConfirm = order.status === 'paid_to_escrow';

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewDetails(order)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">#{order.id}</CardTitle>
            <p className="text-sm text-gray-600">{order.buyer_full_name || `Buyer #${order.buyer}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(order); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {canQuickConfirm && (
                  <DropdownMenuItem onClick={handleQuickConfirm} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Delivery
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Product:</span>
            <span className="font-medium">{order.produce_type || 'Product'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Quantity:</span>
            <span>{quantity} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-medium text-[#158f20]">₵{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Delivery:</span>
            <span className="text-sm">{new Date(order.delivery_date).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const { data: orders, loading, error, refetch } = useFarmerOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toString().includes(searchTerm) ||
        order.buyer_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.produce_type?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const orderStats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, inProgress: 0, completed: 0, disputed: 0 };
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending_payment').length,
      inProgress: orders.filter(o => ['paid_to_escrow', 'farmer_confirmed_delivery'].includes(o.status)).length,
      completed: orders.filter(o => ['buyer_confirmed_receipt', 'completed'].includes(o.status)).length,
      disputed: orders.filter(o => o.status === 'dispute').length,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12">
        <div className="text-center text-red-600">
          <p>Error loading orders: {error}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#158f20]">Orders</h1>
          <p className="text-gray-600">Manage your incoming orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#158f20]">{orderStats.total}</div>
            <p className="text-sm text-gray-600">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
            <p className="text-sm text-gray-600">Pending Payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{orderStats.inProgress}</div>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{orderStats.completed}</div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{orderStats.disputed}</div>
            <p className="text-sm text-gray-600">Disputed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="paid_to_escrow">Paid to Escrow</SelectItem>
            <SelectItem value="farmer_confirmed_delivery">Awaiting Delivery</SelectItem>
            <SelectItem value="buyer_confirmed_receipt">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== "all" 
              ? "Try adjusting your search or filters" 
              : "You haven't received any orders yet"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={setSelectedOrder}
            />
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetailModal
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
