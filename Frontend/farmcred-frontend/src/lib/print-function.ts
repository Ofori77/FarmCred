// lib/helper-functions.ts
import jsPDF from "jspdf";
import { format } from "date-fns";
import { Transaction, Transfer } from "@/lib/types/farmertypes";

const appName = "FarmCred";
const logoUrl = "/logo/farmcred-07.png";

function generatePDF(data: any[], title: string, columns: string[]) {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }

  const doc = new jsPDF();

  doc.addImage(logoUrl, "PNG", 10, 10, 30, 15);
  doc.setFontSize(22);
  doc.text(title, 50, 20);

  (doc as any).autoTable({
    startY: 40,
    head: [columns],
    body: data,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [21, 143, 32] },
  });

  doc.save(`${title.replace(/ /g, "_").toLowerCase()}.pdf`);
}

// Function for Transactions PDF
export function handlePrintPDF(transactions: Transaction[]) {
  const tableData = transactions.map((t) => [
    t.name,
    format(new Date(t.date), "PPP"),
    t.category,
    t.status,
    `GH₵${t.amount.toLocaleString()}`,
  ]);

  generatePDF(
    tableData,
    "Transaction History",
    ["Name", "Date", "Category", "Status", "Amount"]
  );
}

// Function for Transfers PDF
export function handlePrintTransfersPDF(transfers: Transfer[]) {
  const tableData = transfers.map((t) => [
    t.transfer_id,
    format(new Date(t.date), "PPP"),
    t.recipient_or_sender,
    t.type,
    `GH₵${t.amount.toLocaleString()}`,
    t.status,
  ]);

  generatePDF(
    tableData,
    "Transfer History",
    ["Transfer ID", "Date", "Recipient/Sender", "Type", "Amount", "Status"]
  );
}