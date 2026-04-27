"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DisputedOrder } from "@/lib/types/farmertypes";

export default function FarmerDisputesPage() {
  const [disputes, setDisputes] = useState<DisputedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await fetch("/api/payments/my-orders/");
        const allOrders = await res.json();
        const filtered = allOrders.filter(
          (order: any) => order.status === "disputed"
        );
        setDisputes(filtered);
      } catch (err) {
        console.error("Failed to fetch disputes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active disputes.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {disputes.map((order) => (
            <Dialog key={order.id}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {order.produce_listing?.produce_type || "Unknown Produce"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <strong>Reason:</strong> {order.reason}
                    </div>
                    <div>
                      <strong>Date Raised:</strong>{" "}
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Resolution:</strong>{" "}
                      <Badge variant="outline">
                        {order.resolution_status || "Pending"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to view details
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Dispute Details –{" "}
                    {order.produce_listing?.produce_type || "Unknown"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {/* Summary */}
                  <div>
                    <p>
                      <strong>Reason:</strong> {order.reason}
                    </p>
                    <p>
                      <strong>Status:</strong> {order.resolution_status}
                    </p>
                  </div>

                  {/* Comments Section */}
                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="text-sm font-semibold">Comments</h4>
                    {order.comments?.length ? (
                      order.comments.map((c) => (
                        <div key={c.id} className="text-sm border-b pb-2 mb-2">
                          <p>
                            <strong>{c.author}</strong>{" "}
                            <span className="text-muted-foreground text-xs">
                              • {new Date(c.timestamp).toLocaleString()}
                            </span>
                          </p>
                          <p>{c.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No comments yet.</p>
                    )}
                    <div className="space-y-2 mt-2">
                      <Textarea placeholder="Add a comment..." />
                      <Button size="sm">Send</Button>
                    </div>
                  </div>

                  {/* Timeline Section */}
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-semibold mb-2">Timeline</h4>
                    {order.timeline?.length ? (
                      <ul className="text-sm space-y-2">
                        {order.timeline.map((event) => (
                          <li key={event.id}>
                            <span className="font-medium">{event.action}</span>{" "}
                            by {event.performed_by} on{" "}
                            <span className="text-muted-foreground text-xs">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No timeline events yet.</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
