"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBuyerOrders, useConfirmOrderDelivery, useRaiseDispute, useCreateReview } from "@/hooks/useMarketPlace";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import { toast } from "sonner";
import { 
  Package, 
  Calendar, 
  MapPin, 
  Star, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  User
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "@/lib/types/marketplacetypes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function OrdersPage() {
  const { data: orders, loading, error, refetch } = useBuyerOrders();
  const { confirmDelivery, loading: confirmLoading } = useConfirmOrderDelivery();
  const { raiseDispute, loading: disputeLoading } = useRaiseDispute();
  const { createReview, loading: reviewLoading } = useCreateReview();
  
  const [activeTab, setActiveTab] = useState<string>("all");
  const [disputeReason, setDisputeReason] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending_payment': { label: 'Pending Payment', variant: 'secondary' as const, icon: Clock },
      'paid_to_escrow': { label: 'Paid to Escrow', variant: 'default' as const, icon: DollarSign },
      'farmer_confirmed_delivery': { label: 'Out for Delivery', variant: 'default' as const, icon: Package },
      'buyer_confirmed_receipt': { label: 'Delivered', variant: 'default' as const, icon: CheckCircle },
      'completed': { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
      'dispute': { label: 'Dispute Raised', variant: 'destructive' as const, icon: AlertTriangle },
      'cancelled': { label: 'Cancelled', variant: 'secondary' as const, icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: 'secondary' as const, 
      icon: Clock 
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    switch (activeTab) {
      case 'pending':
        return orders.filter(order => ['pending_payment', 'paid_to_escrow'].includes(order.status));
      case 'active':
        return orders.filter(order => ['farmer_confirmed_delivery'].includes(order.status));
      case 'completed':
        return orders.filter(order => ['buyer_confirmed_receipt', 'completed'].includes(order.status));
      case 'disputes':
        return orders.filter(order => order.status === 'dispute');
      default:
        return orders;
    }
  }, [orders, activeTab]);

  const handleConfirmDelivery = async (orderId: number) => {
    try {
      await confirmDelivery(orderId);
      toast.success("Delivery confirmed successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm delivery");
    }
  };

  const handleRaiseDispute = async (orderId: number) => {
    if (!disputeReason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    try {
      await raiseDispute(orderId, disputeReason);
      toast.success("Dispute raised successfully!");
      setDisputeReason("");
      setSelectedOrder(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to raise dispute");
    }
  };

  const handleSubmitReview = async (orderId: number) => {
    if (!reviewComment.trim()) {
      toast.error("Please provide a review comment");
      return;
    }

    try {
      await createReview({
        order_id: orderId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success("Review submitted successfully!");
      setReviewComment("");
      setReviewRating(5);
      setSelectedOrder(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    }
  };

  const canConfirmDelivery = (order: Order) => {
    return order.status === 'farmer_confirmed_delivery';
  };

  const canRaiseDispute = (order: Order) => {
    return ['paid_to_escrow', 'farmer_confirmed_delivery'].includes(order.status);
  };

  const canReview = (order: Order) => {
    return order.status === 'completed';
  };

  if (loading) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/4" />
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-600 mb-4">Failed to load orders</h2>
              <p className="text-gray-500 mb-8">{error}</p>
              <Button onClick={refetch} className="bg-[#158f20] hover:bg-[#117d1b]">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketplaceNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-[#158f20]">My Orders</h1>
              <Button onClick={refetch} variant="outline">
                Refresh
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Orders</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="disputes">Disputes</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
                    <p className="text-gray-500">
                      {activeTab === 'all' ? "You haven't placed any orders yet." : `No ${activeTab} orders found.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredOrders.map((order) => (
                      <Card key={order.id} className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <h3 className="text-lg font-semibold text-[#158f20]">
                                Order #{order.id}
                              </h3>
                              {getStatusBadge(order.status)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-500" />
                                <span>{order.produce_type || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span>{order.farmer_full_name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <span>GH₵ {order.total_amount.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p>Quantity: {order.quantity} units</p>
                              <p>Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            {canConfirmDelivery(order) && (
                              <Button
                                onClick={() => handleConfirmDelivery(order.id)}
                                disabled={confirmLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Confirm Delivery
                              </Button>
                            )}
                            
                            {canReview(order) && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    <Star className="w-4 h-4 mr-2" />
                                    Review
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Review Your Experience</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Rating</Label>
                                      <div className="flex items-center gap-1 mt-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className={`w-8 h-8 ${
                                              star <= reviewRating
                                                ? 'text-yellow-400 fill-current'
                                                : 'text-gray-300'
                                            }`}
                                          >
                                            <Star className="w-full h-full" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor="review-comment">Your Review</Label>
                                      <Textarea
                                        id="review-comment"
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Share your experience with this farmer..."
                                        rows={4}
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleSubmitReview(order.id)}
                                      disabled={reviewLoading}
                                      className="w-full bg-[#158f20] hover:bg-[#117d1b]"
                                    >
                                      {reviewLoading ? "Submitting..." : "Submit Review"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            {canRaiseDispute(order) && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Dispute
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Raise a Dispute</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="dispute-reason">Reason for Dispute</Label>
                                      <Textarea
                                        id="dispute-reason"
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        placeholder="Please describe the issue with your order..."
                                        rows={4}
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleRaiseDispute(order.id)}
                                      disabled={disputeLoading}
                                      variant="destructive"
                                      className="w-full"
                                    >
                                      {disputeLoading ? "Submitting..." : "Submit Dispute"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
