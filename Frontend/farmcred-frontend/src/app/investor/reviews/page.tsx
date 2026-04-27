"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, List, Star, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useInvestorReviews, useFarmerDetails } from "@/hooks/useInvestorData";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog } from "@/components/ui/dialog";
import FarmerProfile from "@/components/investor/FarmerProfileDialog";
import { toast } from "sonner";

export default function ReviewFarmersPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [removingFarmerId, setRemovingFarmerId] = useState<number | null>(null);
  const { t } = useLanguage();

  const REVIEWS_PER_PAGE = 9;

  const { data: reviews, loading, error, removeReview } = useInvestorReviews();
  const { data: selectedFarmerProfile } = useFarmerDetails(selectedFarmerId || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#158f20] mx-auto"></div>
          <p className="text-gray-500">Loading your reviewed farmers...</p>
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

  const filteredReviews = safeReviews.filter((review) => {
    const farmerName = review.farmer_full_name || "";
    return farmerName.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);

  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const handleRemoveReview = async (farmerId: number, farmerName: string) => {
    try {
      setRemovingFarmerId(farmerId);
      await removeReview(farmerId);
      toast.success(`${farmerName} removed from your review list`);
    } catch (error: any) {
      console.error("Failed to remove farmer from reviews:", error);
      toast.error(error.message || "Failed to remove farmer from reviews");
    } finally {
      setRemovingFarmerId(null);
    }
  };

  const handleViewProfile = (farmerId: number) => {
    setSelectedFarmerId(farmerId);
    setOpenProfile(true);
  };

  return (
    <div className="px-6 lg:px-24 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#158f20]">
            Reviewed Farmers
          </h1>
          <p className="text-gray-600 text-sm">
            Farmers you've marked for review from browsing
          </p>
        </div>

        {/* Search & View Toggle */}
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative w-full max-w-sm">
            <Input
              placeholder="Search by farmer name..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // reset page when searching
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
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No farmers reviewed yet
              </h3>
              <p className="text-gray-500">
                Start reviewing farmers from the browse page to see them here
              </p>
            </div>
            <Button 
              className="bg-[#158f20] hover:bg-[#157148]"
              onClick={() => window.location.href = '/investor/browse-farmers'}
            >
              Browse Farmers
            </Button>
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
                        {review.farmer_full_name || "Unknown Farmer"}
                      </h2>
                      {review.farmer_phone_number && (
                        <p className="text-sm text-gray-500">
                          {review.farmer_phone_number}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-[#158f20]/10 text-[#158f20]"
                    >
                      Reviewed
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Review Date */}
                    <div className="text-xs text-gray-500">
                      Added on:{" "}
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewProfile(review.farmer)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveReview(review.farmer, review.farmer_full_name || 'Unknown Farmer')}
                        disabled={removingFarmerId === review.farmer}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingFarmerId === review.farmer ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-gray-500">
                No farmers found matching "{search}".
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
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

      {/* Farmer Profile Dialog */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        {selectedFarmerId && selectedFarmerProfile && (
          <FarmerProfile
            farmer={{
              id: selectedFarmerId,
              full_name: selectedFarmerProfile.full_name,
              trust_level_stars: selectedFarmerProfile.trust_level_stars,
              trust_score_percent: selectedFarmerProfile.trust_score_percent,
              total_income_last_12_months: selectedFarmerProfile.total_income_last_12_months,
              current_month_income: 0,
              current_month_expenses: 0,
              total_loans_taken: selectedFarmerProfile.total_loans || 0,
              active_loans: selectedFarmerProfile.active_investments || 0,
              overdue_loans: 0,
            }}
            fullProfile={selectedFarmerProfile}
            onClose={() => setOpenProfile(false)}
          />
        )}
      </Dialog>
    </div>
  );
}
