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
import { useFarmerTransactions } from "@/hooks/useFarmerData";
import { Transaction } from "@/lib/types/farmertypes";
import { useState } from "react";

interface TransactionHistoryProps {
  tablelength: number;
  search?: string;
  filter?: string;
  onFiltered?: (filtered: Transaction[]) => void;
}

const TransactionHistory = ({
  tablelength,
  search,
  filter = "all",
}: TransactionHistoryProps) => {
  const { data: transactions, loading, error } = useFarmerTransactions();
  const length = tablelength;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#157148]">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">Failed to load transactions</div>
      </div>
    );
  }

  // Ensure transactions is an array
  const transactionsArray = Array.isArray(transactions) ? transactions : [];

  if (transactionsArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground">
        No transactions available
      </div>
    );
  }

  // Safe filtering
  const filteredTransactions = transactionsArray.filter((transaction) => {
    if (filter === "income" && transaction.status !== "income") return false;
    if (filter === "expense" && transaction.status !== "expense") return false;

    if (!search) return true;

    const query = search.toLowerCase();
    return (
      (transaction.name || "").toLowerCase().includes(query) ||
      (transaction.category || "").toLowerCase().includes(query) ||
      (transaction.status || "").toLowerCase().includes(query) ||
      (transaction.amount?.toString() || "").includes(query)
    );
  });

  // Apply tablelength limit if provided
  const displayTransactions = tablelength
    ? filteredTransactions.slice(0, tablelength)
    : filteredTransactions;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-gray-200 hover:bg-transparent">
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Transaction Name
          </TableHead>
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Date
          </TableHead>
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Category
          </TableHead>
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Status
          </TableHead>
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Amount
          </TableHead>
          <TableHead
            className="text-base font-normal text-muted-foreground h-auto py-3"
            style={{ letterSpacing: "-0.06em" }}
          >
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayTransactions.map((transaction: Transaction, index: number) => (
          <TransactionTableRow
            key={transaction.id}
            transaction={transaction}
            isLast={index === displayTransactions.length - 1}
          />
        ))}
      </TableBody>
    </Table>
  );
};

interface TransactionTableRowProps {
  transaction: Transaction;
  isLast: boolean;
}

function TransactionTableRow({
  transaction,
  isLast,
}: TransactionTableRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <TableRow
      className={`hover:bg-transparent ${
        !isLast ? "border-b border-gray-200" : "border-none"
      }`}
    >
      <TableCell
        className="text-base font-normal py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {transaction.name}
      </TableCell>
      <TableCell
        className="text-base font-normal py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {new Date(transaction.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </TableCell>
      <TableCell
        className="text-base font-normal py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {transaction.category}
      </TableCell>
      <TableCell className="py-3">
        <Badge
          className={`px-3 py-1 rounded-full text-white font-normal text-sm border-none ${
            transaction.status === "income"
              ? "bg-[#72BF01] hover:bg-[#72BF01]"
              : "bg-[#158F20] hover:bg-[#158F20]"
          }`}
          style={{ letterSpacing: "-0.06em" }}
        >
          {transaction.status === "income" ? "Income" : "Expenses"}
        </Badge>
      </TableCell>
      <TableCell
        className="text-base font-medium py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        ₵ {transaction.amount.toLocaleString()}
      </TableCell>
      <TableCell className="py-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setOpen(true)}
        >
          <MoreVertical className="h-4 w-4 +" />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="text-[#158f20]">
            <DialogTitle className="text-[#157148]">
              Transaction Details
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <div>
                  <strong className="text-[#158f20]">ID:</strong>{" "}
                  {transaction.id}
                </div>
                <div>
                  <strong className="text-[#158f20]">Name:</strong>{" "}
                  {transaction.name}
                </div>
                <div>
                  <strong className="text-[#158f20]">Farmer:</strong>{" "}
                  {transaction.farmer}
                </div>
                <div>
                  <strong className="text-[#158f20]">Amount:</strong> GH₵
                  {transaction.amount}
                </div>
                <div>
                  <strong className="text-[#158f20]">Category:</strong>{" "}
                  {transaction.category}
                </div>
                <div>
                  <strong className="text-[#158f20]">Buyer:</strong>{" "}
                  {transaction.buyer}
                </div>
                <div>
                  <strong className="text-[#158f20]">Status:</strong>{" "}
                  {transaction.status}
                </div>
                <div>
                  <strong className="text-[#158f20]">Date:</strong>{" "}
                  {transaction.date}
                </div>
                <div>
                  <strong className="text-[#158f20]">Created At:</strong>{" "}
                  {new Date(transaction.created_at).toLocaleDateString(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}{" "}
                  at{" "}
                  {new Date(transaction.created_at).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
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

export default TransactionHistory;
