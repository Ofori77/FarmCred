"use client";

import { useState } from "react";
import { Printer, Search, List, CheckCircle, Clock, XCircle } from "lucide-react";
import TransferTable from "@/components/dashboard/TransferTable";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarmerTransfers } from "@/hooks/useFarmerData";
import { handlePrintTransfersPDF } from "@/lib/helper-functions";

export default function TransferHistoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "csv">("pdf");
  const [open, setOpen] = useState(false);

  const { data: transfers, loading, error } = useFarmerTransfers();

  function handleExportTransfersCSV() {
    const csvRows = [
      ["Id", "Date", "Recipient/Sender", "Type", "Amount", "Status"],
      ...(transfers ?? []).map((t) => [
        t.id,
        new Date(t.date).toLocaleDateString(),
        t.recipient_or_sender,
        t.type,
        t.amount,
        t.status,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transfers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDownload() {
    if (downloadFormat === "pdf") {
      handlePrintTransfersPDF(transfers ?? []);
    } else {
      handleExportTransfersCSV();
    }
    setOpen(false);
  }

  return (
    <div className="mx-4 md:mx-24">
      {/* Search */}
      <div className="flex items-center justify-center mb-6 flex-col gap-4">
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

      {/* Tabs + Print */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-4 w-full md:w-[420px]">
            <TabsTrigger value="all">
              <List className="w-4 h-4 mr-1" /> All
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="w-4 h-4 mr-1" /> Completed
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-1" /> Pending
            </TabsTrigger>
            <TabsTrigger value="failed">
              <XCircle className="w-4 h-4 mr-1" /> Failed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="hover:bg-[#157148] hover:text-white">
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
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {/* Header Skeleton */}
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>

              {/* Row Skeletons */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <TransferTable tablelength={10} search={search} filter={filter} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
