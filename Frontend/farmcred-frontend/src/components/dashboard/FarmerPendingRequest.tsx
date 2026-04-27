import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import {
  usePendingConfirmations,
  useConfirmRequestAction,
} from "@/hooks/useConfirmation";
import { toast } from "sonner";

function getDeliveryDateRange(days: string) {
  const [min, max] = days.match(/\d+/g)?.map(Number) || [1, 2];
  const today = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  });

  const start = new Date(today);
  start.setDate(today.getDate() + min);

  const end = new Date(today);
  end.setDate(today.getDate() + max);

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export default function FarmerPendingRequestPage() {
  const {
    data: pendingConfirmations,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPendingConfirmations,
  } = usePendingConfirmations();
  const {
    performAction,
    loading: actionLoading,
    error: actionError,
  } = useConfirmRequestAction();

   const handleConfirmationAction = async (pk: number, action: 'accept' | 'deny') => {
    try {
      // Optional: If you require a PIN for 'accept' action
      // let pin;
      // if (action === 'accept') {
      //   pin = prompt("Please enter your PIN to confirm:");
      //   if (!pin) return; // User cancelled
      // }

      // Call the API action
      await performAction(pk, { action /*, pin*/ });
      toast.success(`Request ${action}ed successfully!`, {
        description: `Confirmation #${pk} has been ${action}ed.`
      }); 
      refetchPendingConfirmations(); 
    } catch (err: any) {
      console.error("Action error:", err);
      toast.error(
        `Failed to ${action} the request` ,{
          description: err?.message || 'An unknown error occurred.'
        });
    }
  };

  return(
    <Card>
      <CardHeader>
        <CardTitle>Incoming Purchase Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingLoading && (
          <p className="text-center text-gray-600">
            Loading pending confirmations...
          </p>
        )}
        {pendingError && (
          <p className="text-center text-red-600">
            Error fetching confirmations: {pendingError}
          </p>
        )}
        {actionError && (
          <p className="text-center text-red-600">
            Action Error: {actionError}
          </p>
        )}

        {!pendingLoading && !pendingError && pendingConfirmations && pendingConfirmations.length === 0 && (
          <div className="text-center text-gray-600 p-8 border rounded-lg bg-gray-100">
            <p className="text-lg font-semibold">
              No pending purchase requests at the moment.
            </p>
            <p className="text-sm">Check back later for new orders.</p>
          </div>
        )}

        {!pendingLoading && !pendingError && pendingConfirmations && pendingConfirmations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingConfirmations.map((confirmation) => (
              <div
                key={confirmation.pk}
                className="border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm bg-white hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Purchase Request
                  </h3>
                </div>
                <p className="text-gray-700">
                  <span className="font-medium">From:</span>{" "}
                  {confirmation.initiator_account.full_name} (
                  {confirmation.initiator_account.phone_number})
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Product:</span>{" "}
                  {confirmation.data_context.product_name}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Quantity:</span>{" "}
                  {confirmation.data_context.quantity}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Total Amount:</span> GH₵{" "}
                  {confirmation.data_context.total_amount?.toFixed(2) || "N/A"}
                </p>
                {confirmation.data_context.delivery_days && (
                  <p className="text-gray-700">
                    <span className="font-medium">Expected Delivery:</span>{" "}
                    {getDeliveryDateRange(
                      confirmation.data_context.delivery_days
                    )}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Requested on:{" "}
                  {new Date(confirmation.created_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Expires on:{" "}
                  {new Date(confirmation.expires_at).toLocaleString()}
                </p>

                <div className="flex space-x-3 pt-2">
                  <Button
                    onClick={() => handleConfirmationAction(confirmation.pk, "accept")}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md rounded-md"
                  >
                    {actionLoading ? "Accepting..." : "Accept"}
                  </Button>
                  <Button
                    onClick={() => handleConfirmationAction(confirmation.pk, "deny")}
                    disabled={actionLoading}
                    variant="destructive"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md rounded-md"
                  >
                    {actionLoading ? "Denying..." : "Deny"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
