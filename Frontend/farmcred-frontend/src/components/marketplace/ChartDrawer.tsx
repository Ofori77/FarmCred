"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProduceListing } from "@/lib/types/marketplacetypes";


type ChatDrawerProps = {
  activeChat: ProduceListing | null;
  onClose: () => void;
};

export default function ChatDrawer({ activeChat, onClose }: ChatDrawerProps) {
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<{ from: "buyer" | "farmer"; text: string }[]>([
    { from: "buyer", text: "Is this still available?" },
    { from: "farmer", text: "Yes, it's fresh!" },
  ]);

  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    };
  }, []);

  if (!activeChat) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const message = messageInput;
    setMessages((prev) => [...prev, { from: "buyer", text: message }]);
    setMessageInput("");
    toast.success("Message sent!");

    replyTimeoutRef.current = setTimeout(() => {
      const replies = [
        "Thanks for your message!",
        "Yes, this is still available.",
        "Pickup can be arranged by tomorrow.",
        "Let me know how many units you want.",
        "Delivery to your area is possible.",
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [...prev, { from: "farmer", text: randomReply }]);
    }, 1500);
  };

  return (
    <div className="fixed top-0 right-0 w-full sm:max-w-md h-full bg-white shadow-xl border-l z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">Chat with {activeChat.farmer_full_name}</h3>
        <button
          onClick={() => {
            onClose();
            if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
          }}
          className="text-gray-500 hover:text-red-600 text-xl"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-sm text-gray-600 mb-2">
          Ask about: {activeChat.produce_type}
        </div>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-md text-sm max-w-[75%] ${
              msg.from === "buyer"
                ? "bg-gray-100 self-start"
                : "bg-green-100 self-end ml-auto"
            }`}
          >
            {msg.from === "buyer" ? "👨🏾 Buyer" : `👩🏾‍🌾 ${activeChat.farmer_full_name}`}: {msg.text}
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-md px-3 py-2 text-sm"
          />
          <Button type="submit" className="bg-[#158f20] text-white">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
