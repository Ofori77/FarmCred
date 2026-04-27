"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  AlarmClock,
  BadgeCent,
  ChartColumnBig,
  Handshake,
  Hourglass,
  PhoneOff,
  Search,
  Shrub,
  Speech,
  Star,
  Target,
} from "lucide-react";

const reviewOptions = [
  { label: "Timely Updates", icon: AlarmClock, type: "positive" },
  { label: "Transparent Reporting", icon: ChartColumnBig, type: "positive" },
  { label: "Good Communication", icon: Speech, type: "positive" },
  { label: "Reliable & Trustworthy", icon: Handshake, type: "positive" },
  { label: "Met Investment Goals", icon: Target, type: "positive" },
  { label: "Environmentally Responsible", icon: Shrub, type: "positive" },
  { label: "Lack of Communication", icon: PhoneOff, type: "negative" },
  { label: "Missed Deadlines", icon: Hourglass, type: "negative" },
  { label: "Unclear Financials", icon: BadgeCent, type: "negative" },
  { label: "Poor Project Visibility", icon: Search, type: "negative" },
];

export function ReviewDialogContent() {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [extraComments, setExtraComments] = useState("");

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Submit Your Review</DialogTitle>
      </DialogHeader>

      {/* Star Rating */}
      <div className="flex items-center gap-1 py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            onClick={() => setRating(i)}
            className={`h-6 w-6 cursor-pointer transition ${
              i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Icon Tags with Colored Chips */}
      <div className="flex flex-wrap gap-2 py-2">
        {reviewOptions.map(({ label, icon: Icon, type }) => {
          const isSelected = selectedTags.includes(label);
          const baseColor =
            type === "positive"
              ? isSelected
                ? "bg-green-100 text-green-800 border-green-400 dark:bg-green-900 dark:text-green-100 dark:border-green-700"
                : "bg-green-50 text-green-600 border-green-200 dark:bg-green-800 dark:text-green-200 dark:border-green-600"
              : isSelected
              ? "bg-red-100 text-red-800 border-red-400 dark:bg-red-900 dark:text-red-100 dark:border-red-700"
              : "bg-red-50 text-red-600 border-red-200 dark:bg-red-800 dark:text-red-200 dark:border-red-600";

          return (
            <button
              key={label}
              onClick={() => handleTagClick(label)}
              className={`border rounded-full px-3 py-1 text-sm flex items-center gap-1 transition ${baseColor} hover:scale-105`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Optional Comments */}
      <div className="py-2">
        <Textarea
          value={extraComments}
          onChange={(e) => setExtraComments(e.target.value)}
          placeholder="Additional comments (optional)"
          className="min-h-[80px]"
        />
      </div>

      <DialogFooter>
        <Button
          onClick={() => {
            console.log({
              rating,
              tags: selectedTags,
              comment: extraComments,
            });
            // Submit to backend here
          }}
          disabled={rating === 0}
        >
          Submit Review
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
