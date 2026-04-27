"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquareText, ShieldAlert, Hourglass } from "lucide-react"; 
import FarmerOrders from "@/components/dashboard/FarmerOrders";
import FarmerMessagingPage from "@/components/dashboard/FarmerMessaging";
import FarmerDisputesPage from "@/components/dashboard/FarmerDispute";
import FarmerPendingRequestPage from "@/components/dashboard/FarmerPendingRequest";

export default function FarmerInteractionsPage() {
  return (
    <main className="p-6 space-y-6">
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Orders</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="messages">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" />
              <span>Messages</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="disputes">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Disputes</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="pending-requests">
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4" />
              <span>Pending Requests</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <FarmerOrders />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
            <FarmerMessagingPage />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <FarmerDisputesPage/>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-requests">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <FarmerPendingRequestPage/>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
