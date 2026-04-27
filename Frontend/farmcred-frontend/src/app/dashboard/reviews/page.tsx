"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, List, Star, Eye, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFarmerReceivedReviews } from "@/hooks/useFarmerData";
import { InvestorReview } from "@/lib/types/investortypes";

export default function ReviewedByInvestorsPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const REVIEWS_PER_PAGE = 9;

  const { data: reviews, loading, error } = useFarmerReceivedReviews();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#158f20] mx-auto"></div>
          <p className="text-gray-500">Loading investor reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-600 font-medium">Error loading reviews</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const safeReviews = reviews || [];

  // Filter reviews by investor name
  const filteredReviews = safeReviews.filter((review: InvestorReview) => {
    const investorName = review.investor_full_name || "";
    return investorName.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);

  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  return (
    <div className="px-6 lg:px-24 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#158f20]">
            Investors Reviewing You
          </h1>
          <p className="text-gray-600 text-sm">
            Investors who have added you to their review/watchlist
          </p>
        </div>

        {/* Search & View Toggle */}
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="Search by investor name..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            onClick={() => setView("grid")}
            size="icon"
            className="bg-[#158f20] hover:bg-[#157148]"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            size="icon"
            className="bg-[#158f20] hover:bg-[#157148]"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Review Cards */}
      {safeReviews.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No investor reviews yet
              </h3>
              <p className="text-gray-500">
                When investors add you to their review list, they'll appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`${
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-4"
          }`}
        >
          {paginatedReviews.length > 0 ? (
            paginatedReviews.map((review) => (
              <Card key={review.id} className="">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {review.investor_full_name || "Unknown Investor"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Investor ID: {review.investor}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    >
                      Watching
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Review Date */}
                    <div className="text-xs text-gray-500">
                      Added to watchlist on:{" "}
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>

                    {/* Interest Level Indicator */}
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600 font-medium">
                        Potential Investor
                      </span>
                    </div>

                    {/* Time on watchlist */}
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const now = new Date();
                        const reviewDate = new Date(review.created_at);
                        const daysDiff = Math.floor(
                          (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
                        );
                        
                        if (daysDiff === 0) return "Added today";
                        if (daysDiff === 1) return "Added 1 day ago";
                        if (daysDiff < 7) return `Added ${daysDiff} days ago`;
                        if (daysDiff < 30) return `Added ${Math.floor(daysDiff / 7)} weeks ago`;
                        return `Added ${Math.floor(daysDiff / 30)} months ago`;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-gray-500">
                No investors found matching "{search}".
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-4 items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
