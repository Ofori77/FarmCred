"use client";

import { useState, useMemo } from "react";
import { useConversations } from "@/hooks/useMarketPlace";
import { Button } from "@/components/ui/button";
import { Mail, User, Phone, MapPin, Calendar, Package, Eye, Reply } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Conversation } from "@/lib/types/marketplacetypes";

// Message/Inquiry Card Component
function InquiryCard({ 
  conversation, 
  onViewDetails 
}: { 
  conversation: Conversation; 
  onViewDetails: (conversation: Conversation) => void; 
}) {
  const isNew = conversation.last_message_timestamp && 
    new Date(conversation.last_message_timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <Card className="cursor-pointer" onClick={() => onViewDetails(conversation)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-[#158f20] rounded-full flex items-center justify-center text-white font-semibold">
              {conversation.buyer_full_name 
                ? conversation.buyer_full_name.charAt(0).toUpperCase()
                : 'B'
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  {conversation.buyer_full_name || `Buyer #${conversation.buyer}`}
                </h3>
                {isNew && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    New
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Inquiry about: <span className="font-medium">{conversation.produce_type || 'Product'}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {conversation.last_message_timestamp 
                ? new Date(conversation.last_message_timestamp).toLocaleDateString()
                : 'No date'
              }
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {conversation.last_message && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 line-clamp-3">
                {conversation.last_message}
              </p>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>inquiry@farmcred.com</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(conversation.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Inquiry Detail Modal Component
function InquiryDetailModal({ 
  conversation, 
  onClose 
}: { 
  conversation: Conversation; 
  onClose: () => void; 
}) {
  const [replyMessage, setReplyMessage] = useState("");
  const [showReply, setShowReply] = useState(false);

  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    try {
      // Here you would call your reply API
      toast.success("Reply sent successfully!");
      setReplyMessage("");
      setShowReply(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
    }
  };

  return (
    <div className="space-y-6">
      {/* Buyer Information Header */}
      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="w-16 h-16 bg-[#158f20] rounded-full flex items-center justify-center text-white font-bold text-xl">
          {conversation.buyer_full_name 
            ? conversation.buyer_full_name.charAt(0).toUpperCase()
            : 'B'
          }
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">
            {conversation.buyer_full_name || `Buyer #${conversation.buyer}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>buyer@email.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>+233 XX XXX XXXX</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>Location not provided</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Inquiry date: {new Date(conversation.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Inquiry Details */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-[#158f20]" />
          Product Inquiry
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Product:</span>
            <span className="font-medium">{conversation.produce_type || 'Product'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Inquiry ID:</span>
            <span className="font-mono text-sm">#{conversation.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <Badge className="bg-blue-100 text-blue-800">Active Inquiry</Badge>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Message</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700 leading-relaxed">
            {conversation.last_message || "No message content available."}
          </p>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Received: {conversation.last_message_timestamp 
            ? new Date(conversation.last_message_timestamp).toLocaleString()
            : 'No timestamp'
          }
        </div>
      </div>

      {/* Buyer History/Stats */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Buyer Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[#158f20]">0</div>
            <p className="text-sm text-gray-600">Previous Orders</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">0</div>
            <p className="text-sm text-gray-600">Total Spent</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">New</div>
            <p className="text-sm text-gray-600">Customer Type</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">5.0</div>
            <p className="text-sm text-gray-600">Rating</p>
          </div>
        </div>
      </div>

      {/* Reply Section */}
      {!showReply ? (
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowReply(true)}
            className="bg-[#158f20] hover:bg-[#0f6b18]"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply to Inquiry
          </Button>
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Call Buyer
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Reply to Inquiry</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="reply-message">Your Reply</Label>
              <Textarea
                id="reply-message"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply to the buyer..."
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleSendReply}
                className="bg-[#158f20] hover:bg-[#0f6b18]"
              >
                Send Reply
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowReply(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { data: conversations, loading, error, refetch } = useConversations();
  const [selectedInquiry, setSelectedInquiry] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    
    return conversations.filter(conversation => {
      const buyerName = conversation.buyer_full_name || `Buyer #${conversation.buyer}`;
      const produceType = conversation.produce_type || '';
      
      const matchesSearch = (
        buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "new" && conversation.last_message_timestamp && 
         new Date(conversation.last_message_timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)) ||
        (statusFilter === "old" && (!conversation.last_message_timestamp || 
         new Date(conversation.last_message_timestamp) <= new Date(Date.now() - 24 * 60 * 60 * 1000)));
      
      return matchesSearch && matchesStatus;
    });
  }, [conversations, searchTerm, statusFilter]);

  const inquiryStats = useMemo(() => {
    if (!conversations) return { total: 0, new: 0, today: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: conversations.length,
      new: conversations.filter(c => c.last_message_timestamp && 
        new Date(c.last_message_timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
      today: conversations.filter(c => c.created_at && 
        new Date(c.created_at) >= today).length,
    };
  }, [conversations]);

  if (loading) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-6 px-6 lg:px-12">
        <div className="text-center text-red-600">
          <p>Error loading inquiries: {error}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#158f20]">Buyer Inquiries</h1>
        <p className="text-gray-600">Manage inquiries from potential buyers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#158f20]">
              {inquiryStats.total}
            </div>
            <p className="text-sm text-gray-600">Total Inquiries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {inquiryStats.new}
            </div>
            <p className="text-sm text-gray-600">New (24hrs)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {inquiryStats.today}
            </div>
            <p className="text-sm text-gray-600">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search inquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value="all">All Inquiries</option>
          <option value="new">New (24hrs)</option>
          <option value="old">Older</option>
        </select>
      </div>

      {/* Inquiries Grid */}
      {filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all" 
                ? "No inquiries match your filters" 
                : "You haven't received any buyer inquiries yet"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredConversations.map((conversation) => (
            <InquiryCard
              key={conversation.id}
              conversation={conversation}
              onViewDetails={setSelectedInquiry}
            />
          ))}
        </div>
      )}

      {/* Inquiry Detail Modal */}
      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyer Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <InquiryDetailModal
              conversation={selectedInquiry}
              onClose={() => setSelectedInquiry(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}