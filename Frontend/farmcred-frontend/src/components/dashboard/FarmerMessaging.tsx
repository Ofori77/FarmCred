"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Conversation, Message } from "@/lib/types/farmertypes";


export default function FarmerMessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace/conversations/")
      .then((res) => res.json())
      .then(setConversations)
      .finally(() => setLoadingConversations(false));
  }, []);

  useEffect(() => {
    if (selectedId) {
      setLoadingMessages(true);
      fetch(`/api/marketplace/conversations/${selectedId}/messages/`)
        .then((res) => res.json())
        .then(setMessages)
        .finally(() => setLoadingMessages(false));
    }
  }, [selectedId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await fetch(`/api/marketplace/conversations/${selectedId}/send-message/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage }),
    });
    setNewMessage("");
    // Refresh messages
    const res = await fetch(
      `/api/marketplace/conversations/${selectedId}/messages/`
    );
    const updated = await res.json();
    setMessages(updated);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversations List */}
      <div className="space-y-2">
        {loadingConversations
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))
          : conversations.map((conv) => (
              <Card
                key={conv.id}
                className={`p-4 cursor-pointer ${
                  selectedId === conv.id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedId(conv.id)}
              >
                <p>{conv.buyerName}</p>
              </Card>
            ))}
      </div>

      {/* Messages Thread */}
      <div className="md:col-span-2 space-y-4">
        {selectedId ? (
          <>
            <h2 className="text-lg font-semibold">
              Conversation with{" "}
              {conversations.find((c) => c.id === selectedId)?.buyerName ||
                "Buyer"}
            </h2>

            {loadingMessages ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <Card key={msg.id} className="p-3">
                      <p className="text-sm font-semibold">{msg.sender}</p>
                      <p>{msg.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Reply Box */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
