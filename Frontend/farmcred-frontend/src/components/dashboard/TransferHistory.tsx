"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFarmerTransfers } from "@/hooks/useFarmerData";

export default function TransferHistory() {
  const { data: transfers, loading, error } = useFarmerTransfers();

  if (loading) {
    return <div className="p-4 text-[#157148]">Loading transfers...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Failed to load transfers</div>;
  }

  // Ensure transfers is an array before using array methods
  const transfersArray = Array.isArray(transfers) ? transfers : [];

  if (transfersArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground">
        No transfers available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transfersArray.slice(0, 3).map((transfer, index) => {
        const recipientName =
          transfer.recipient_or_sender || transfer.sender || "N/A";
        const initial = recipientName
          ? recipientName.charAt(0).toUpperCase()
          : "?";

        return (
          <div key={transfer.id || index} className="flex items-center gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 border border-[#E1E3E0]">
              <AvatarImage />
              <AvatarFallback className="text-[#158f20] text-lg font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{recipientName}</p>
              <p className="text-xs text-muted-foreground">
                {(transfer as any).transfer_type || "Transfer"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">GH₵{transfer.amount || 0}</p>
              <p className="text-xs text-muted-foreground">
                {transfer.date || "Recent"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
