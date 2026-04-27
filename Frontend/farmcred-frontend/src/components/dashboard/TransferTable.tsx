"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { useFarmerTransfers } from "@/hooks/useFarmerData";
import { Transfer } from "@/lib/types/farmertypes";
import { useState } from "react";

interface TransferHistoryProps {
  tablelength: number;
  search?: string;
  filter?: string;
  onFiltered?: (filtered: Transfer[]) => void;
}

const TransferTable = ({
  tablelength,
  search,
  filter = "all",
}: TransferHistoryProps) => {
  const { data: transfers, loading, error } = useFarmerTransfers();
  const length = tablelength;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#157148]">Loading transfers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Failed to load transfers</div>
      </div>
    );
  }

  if (!transfers || transfers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No transfers available</div>
      </div>
    );
  }

  // Filter transactions based on search query (case-insensitive)
  const filteredTransactions = transfers.filter((transfers: Transfer) => {
    if (filter === "completed" && transfers.status !== "completed")
      return false;
    if (filter === "pending" && transfers.status !== "pending") return false;
    if (filter === "failed" && transfers.status !== "failed") return false;

    if (!search) return true;

    const query = search.toLowerCase();
    return (
      transfers.id.toString().toLowerCase().includes(query) ||
      transfers.recipient_or_sender.toLowerCase().includes(query) ||
      transfers.status.toLowerCase().includes(query) ||
      transfers.amount.toString().includes(query)
    );
  });

  const transactionData = filteredTransactions.slice(0, length);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-gray-200 hover:bg-transparent">
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Transfer ID
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Date
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Recipient/Sender
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Type
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Amount
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Status
          </TableHead>
          <TableHead
            className="text-base font-normal text-card-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactionData.map((transfer: Transfer, index: number) => (
          <TransferTableRow
            key={transfer.id}
            transfer={transfer}
            isLast={index === transactionData.length - 1}
          />
        ))}
      </TableBody>
    </Table>
  );
};

interface TransferTableRowProps {
  transfer: Transfer;
  isLast: boolean;
}

function TransferTableRow({ transfer, isLast }: TransferTableRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <TableRow
      className={`hover:bg-transparent ${
        !isLast ? "border-b border-gray-100" : "border-none"
      }`}
    >
      <TableCell
        className="text-base font-normal text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {transfer.transfer_id}
      </TableCell>
      <TableCell
        className="text-base font-normal text-[#72BF01] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {new Date(transfer.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </TableCell>
      <TableCell
        className="text-base font-normal text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {transfer.recipient_or_sender}
      </TableCell>
      <TableCell
        className="text-base font-normal text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {transfer.type}
      </TableCell>
      <TableCell
        className="text-base font-medium text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        ₵ {transfer.amount.toLocaleString()}
      </TableCell>
      <TableCell className="py-3">
        <Badge
          className={`px-3 py-1 rounded-full text-white font-normal text-sm border-none ${
            transfer.status === "completed"
              ? "bg-[#72BF01] hover:bg-[#72BF01]"
              : transfer.status === "pending"
              ? "bg-yellow-500 hover:bg-yellow-500"
              : "bg-red-500 hover:bg-red-500"
          }`}
          style={{ letterSpacing: "-0.06em" }}
        >
          {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setOpen(true)}
        >
          <MoreVertical className="h-4 w-4 text-[#157148]" />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="text-[#158f20]">
            <DialogTitle className="text-[#72BF01]">
              Transfer Details
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <div>
                  <strong className="text-[#158f20]">Transfer ID:</strong>{" "}
                  {transfer.transfer_id}
                </div>
                <div>
                  <strong className="text-[#158f20]">Farmer:</strong>{" "}
                  {transfer.farmer}
                </div>
                <div>
                  <strong className="text-[#158f20]">Amount:</strong> GH₵
                  {transfer.amount}
                </div>
                <div>
                  <strong className="text-[#158f20]">Recipient:</strong>{" "}
                  {transfer.recipient}
                </div>
                <div>
                  <strong className="text-[#158f20]">Type:</strong>{" "}
                  {transfer.type}
                </div>
                <div>
                  <strong className="text-[#158f20]">Status:</strong>{" "}
                  {transfer.status}
                </div>
                <div>
                  <strong className="text-[#158f20]">Date:</strong>{" "}
                  {transfer.date}
                </div>
                <div>
                  <strong className="text-[#158f20]">Description:</strong>{" "}
                  {transfer.notes || "—"}
                </div>
                <div>
                  <strong className="text-[#158f20]">Created At:</strong>{" "}
                  {new Date(transfer.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(transfer.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </DialogDescription>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export default TransferTable;
