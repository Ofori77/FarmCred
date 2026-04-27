"use client";

import { useState } from "react";
import {
  Printer,
  Search,
  List,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useFarmerTransactions } from "@/hooks/useFarmerData";
import { handlePrintPDF } from "@/lib/helper-functions";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionHistoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "csv">("pdf");
  const [open, setOpen] = useState(false);

  const { data: transactions, loading, error } = useFarmerTransactions();

  function handleExportCSV() {
    const csvRows = [
      ["Name", "Date", "Category", "Status", "Amount"],
      ...(transactions ?? []).map((t) => [
        t.name,
        new Date(t.date).toLocaleDateString(),
        t.category,
        t.status,
        t.amount,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDownload() {
    if (downloadFormat === "pdf") {
      handlePrintPDF(transactions ?? []);
    } else {
      handleExportCSV();
    }
    setOpen(false);
  }

  return (
    <div className="mx-4 md:mx-24">
      {/* Search Input */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-lg">
          <Input
            placeholder="Search..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>

      {/* Filter Tabs + Print Button */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as any)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-3 w-full md:w-[320px]">
            <TabsTrigger value="all">
              <List className="w-4 h-4 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="income">
              <ArrowDownCircle className="w-4 h-4 mr-1" />
              Income
            </TabsTrigger>
            <TabsTrigger value="expense">
              <ArrowUpCircle className="w-4 h-4 mr-1" />
              Expense
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="hover:bg-[#157148] hover:text-white"
            >
              <Printer className="mr-1" />
              Print
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose Download Format</DialogTitle>
            </DialogHeader>
            <Select
              value={downloadFormat}
              onValueChange={(v) => setDownloadFormat(v as "pdf" | "csv")}
            >
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <Button className="mt-4 w-full" onClick={handleDownload}>
              Download
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table in Card */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {/* Table Header Skeleton */}
              <div className="grid grid-cols-5 gap-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>

              {/* 5 Row Skeletons */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <TransactionHistory
              tablelength={10}
              search={search}
              filter={filter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
