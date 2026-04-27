"use client";

import { useState, useMemo } from "react";
import { useFarmerListings, useCreateListing } from "@/hooks/useMarketPlace";
import { useUpdateListing, useDeleteListing } from "@/hooks/useMarketplaceManagement";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Eye, Archive, MoreHorizontal, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ProduceListing, CreateListingInput } from "@/lib/types/marketplacetypes";

// Component for the Add/Edit Listing form
function ListingForm({ 
  initialData, 
  onClose, 
  onSave 
}: { 
  initialData?: ProduceListing, 
  onClose: () => void, 
  onSave: () => void 
}) {
  const [formData, setFormData] = useState<Partial<CreateListingInput>>({
    produce_type: initialData?.produce_type || "",
    quantity_available: initialData?.quantity_available || 0,
    unit_of_measure: initialData?.unit_of_measure || undefined,
    base_price_per_unit: initialData?.base_price_per_unit || 0,
    discount_percentage: initialData?.discount_percentage || 0,
    location_description: initialData?.location_description || "",
    available_from: initialData?.available_from || "",
    available_until: initialData?.available_until || "",
    image_url: initialData?.image_url || "",
  });

  const { createListing, loading: createLoading } = useCreateListing();
  const { updateListing, loading: updateLoading } = useUpdateListing();
  const isEditing = !!initialData;
  const loading = isEditing ? updateLoading : createLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && initialData) {
        await updateListing(initialData.id, formData);
        toast.success("Listing updated successfully!");
      } else {
        await createListing(formData as CreateListingInput);
        toast.success("Listing created successfully!");
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save listing");
    }
  };

  const handleInputChange = (field: keyof CreateListingInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="produce_type">Produce Type</Label>
          <Input
            id="produce_type"
            value={formData.produce_type}
            onChange={(e) => handleInputChange("produce_type", e.target.value)}
            placeholder="e.g., Maize, Tomatoes, Cassava"
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity_available">Quantity Available</Label>
          <Input
            id="quantity_available"
            type="number"
            value={formData.quantity_available}
            onChange={(e) => handleInputChange("quantity_available", parseFloat(e.target.value))}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit_of_measure">Unit of Measure</Label>
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) => handleInputChange("unit_of_measure", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="bags">Bags</SelectItem>
              <SelectItem value="crates">Crates</SelectItem>
              <SelectItem value="pieces">Pieces</SelectItem>
              <SelectItem value="tons">Tons</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="base_price_per_unit">Price per Unit (₵)</Label>
          <Input
            id="base_price_per_unit"
            type="number"
            step="0.01"
            value={formData.base_price_per_unit}
            onChange={(e) => handleInputChange("base_price_per_unit", parseFloat(e.target.value))}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discount_percentage">Discount % (Optional)</Label>
          <Input
            id="discount_percentage"
            type="number"
            min="0"
            max="100"
            value={formData.discount_percentage}
            onChange={(e) => handleInputChange("discount_percentage", parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="location_description">Location</Label>
          <Input
            id="location_description"
            value={formData.location_description}
            onChange={(e) => handleInputChange("location_description", e.target.value)}
            placeholder="e.g., Kumasi, Ashanti Region"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="available_from">Available From</Label>
          <Input
            id="available_from"
            type="date"
            value={formData.available_from}
            onChange={(e) => handleInputChange("available_from", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="available_until">Available Until (Optional)</Label>
          <Input
            id="available_until"
            type="date"
            value={formData.available_until}
            onChange={(e) => handleInputChange("available_until", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image_url">Image URL (Optional)</Label>
        <Input
          id="image_url"
          type="url"
          value={formData.image_url}
          onChange={(e) => handleInputChange("image_url", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEditing ? "Update Listing" : "Create Listing"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Listing Card Component
function ListingCard({ listing, onEdit, onDelete }: {
  listing: ProduceListing;
  onEdit: (listing: ProduceListing) => void;
  onDelete: (id: number) => void;
}) {
  const basePrice = Number(listing.base_price_per_unit) || 0;
  const discountPercentage = Number(listing.discount_percentage) || 0;
  const currentPrice = discountPercentage > 0 
    ? basePrice * (1 - discountPercentage / 100)
    : basePrice;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{listing.produce_type}</CardTitle>
            <p className="text-sm text-gray-600">{listing.location_description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(listing.status)}>
              {listing.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(listing)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(listing.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Quantity:</span>
            <span className="font-medium">{listing.quantity_available} {listing.unit_of_measure}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Price:</span>
            <div className="text-right">
              {discountPercentage > 0 ? (
                <>
                  <span className="font-medium text-green-600">₵{currentPrice.toFixed(2)}</span>
                  <span className="text-xs line-through text-gray-400 ml-2">₵{basePrice.toFixed(2)}</span>
                  <div className="text-xs text-green-600">{discountPercentage}% off</div>
                </>
              ) : (
                <span className="font-medium">₵{basePrice.toFixed(2)}</span>
              )}
              <span className="text-xs text-gray-500">/{listing.unit_of_measure}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Available:</span>
            <span className="text-sm">{new Date(listing.available_from).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const { data: listings, loading, error, refetch } = useFarmerListings();
  const { deleteListing } = useDeleteListing();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<ProduceListing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    
    return listings.filter(listing => {
      const matchesSearch = listing.produce_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.location_description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [listings, searchTerm, statusFilter]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteListing(id);
        toast.success("Listing deleted successfully!");
        refetch();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete listing");
      }
    }
  };

  const handleSave = () => {
    refetch();
  };

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
          <p>Error loading listings: {error}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#158f20]">Marketplace Listings</h1>
          <p className="text-gray-600">Manage your produce listings</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#158f20] hover:bg-[#0f6b18]">
              <Plus className="h-4 w-4 mr-2" />
              Add New Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Listing</DialogTitle>
            </DialogHeader>
            <ListingForm
              onClose={() => setIsCreateDialogOpen(false)}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#158f20]">{listings?.length || 0}</div>
            <p className="text-sm text-gray-600">Total Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {listings?.filter(l => l.status === 'active').length || 0}
            </div>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {listings?.filter(l => l.status === 'sold').length || 0}
            </div>
            <p className="text-sm text-gray-600">Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {listings?.filter(l => l.discount_percentage > 0).length || 0}
            </div>
            <p className="text-sm text-gray-600">With Discounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Package className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== "all" 
              ? "Try adjusting your search or filters" 
              : "Get started by creating your first listing"
            }
          </p>
          {(!searchTerm && statusFilter === "all") && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#158f20] hover:bg-[#0f6b18]">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Listing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Listing</DialogTitle>
                </DialogHeader>
                <ListingForm
                  onClose={() => setIsCreateDialogOpen(false)}
                  onSave={handleSave}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onEdit={setEditingListing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && setEditingListing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          {editingListing && (
            <ListingForm
              initialData={editingListing}
              onClose={() => setEditingListing(null)}
              onSave={handleSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
