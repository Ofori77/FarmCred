"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FarmerOrder } from "@/lib/types/farmertypes";

export default function FarmerOrders() {
  const [orders, setOrders] = useState<FarmerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  const fetchOrders = async (page: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payments/my-orders/?page=${page}`);
      const data = await res.json();
      if (data.length === 0) setHasMore(false);
      setOrders((prev) => [...prev, ...data]);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderId: number) => {
    try {
      await fetch(`/api/payments/confirm-delivery/${orderId}/`, {
        method: "POST",
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
      );
    } catch (error) {
      console.error("Error confirming delivery:", error);
    }
  };

  const handleViewDetails = (orderId: number) => {
    // Replace with actual routing or modal
    alert(`View details for Order #${orderId}`);
  };

  const handleRaiseDispute = (orderId: number) => {
    // Replace with actual dispute flow
    alert(`Raise dispute for Order #${orderId}`);
  };

  const getStatusBadge = (status: FarmerOrder["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="outline">Paid to Escrow</Badge>;
      case "delivered":
        return <Badge variant="default">Delivered</Badge>;
      case "completed":
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="p-4 space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{order.product}</p>
              <p className="text-sm text-muted-foreground">
                Buyer: {order.buyerName} • Qty: {order.quantity} • GH₵
                {order.price}
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>
          <div className="flex gap-2">
            {order.status === "paid" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConfirmDelivery(order.id)}
              >
                Confirm Delivery
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewDetails(order.id)}
            >
              View Details
            </Button>
            {order.status !== "completed" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRaiseDispute(order.id)}
              >
                Raise Dispute
              </Button>
            )}
          </div>
        </Card>
      ))}

      {/* Skeleton for initial load */}
      {loading && orders.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {orders.length > 0 && hasMore && !loading && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Load More
          </Button>
        </div>
      )}

      {/* No more data */}
      {!hasMore && !loading && orders.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All orders loaded.
        </p>
      )}

      {/* No orders at all */}
      {!loading && orders.length === 0 && (
        <p className="text-sm text-muted-foreground">No orders found.</p>
      )}
    </div>
  );
}
