"use client";

import { useState, useMemo } from "react";
import { useFarmerProducts, useCreateFarmerProduct, useUpdateFarmerProduct, useDeleteFarmerProduct } from "@/hooks/useFarmerProducts";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Component for the Add/Edit Product form
function ProductForm({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: () => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [image, setImage] = useState<File | null>(null);

  const { createProduct, loading: createLoading } = useCreateFarmerProduct();
  const { updateProduct, loading: updateLoading } = useUpdateFarmerProduct();
  const isEditing = !!initialData;
  const loading = isEditing ? updateLoading : createLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateProduct(initialData.name, { price: Number(price) });
        toast.success(`Product "${name}" updated successfully`);
      } else {
        await createProduct({ name, price: Number(price), image });
        toast.success(`Product "${name}" added successfully`);
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product-name">Product Name</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Organic Tomatoes"
          required
          disabled={isEditing}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product-price">Price (GHS)</Label>
        <Input
          id="product-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 25.00"
          required
        />
      </div>
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="product-image">Product Image</Label>
          <Input
            id="product-image"
            type="file"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !name || !price || (!isEditing && !image)}
          className="bg-[#158f20] text-white hover:bg-[#115c3a]"
        >
          {loading ? "Saving..." : (isEditing ? "Update Product" : "Add Product")}
        </Button>
      </DialogFooter>
    </form>
  );
}


export default function ProductPage() {
  const { products, loading, error, refetch } = useFarmerProducts();
  const { deleteProduct, loading: deleteLoading } = useDeleteFarmerProduct();

  const [sortBy, setSortBy] = useState("default");
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);

  const sortedProducts = useMemo(() => {
    if (!products) return [];

    const sorted = [...products];

    switch (sortBy) {
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "priceHigh":
        return sorted.sort((a, b) => b.price - a.price);
      case "priceLow":
        return sorted.sort((a, b) => a.price - b.price);
      default:
        return sorted;
    }
  }, [products, sortBy]);

  const handleProductSave = () => {
    refetch();
  };

  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.name);
      toast.success(`Product "${productToDelete.name}" deleted successfully`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setIsAddEditOpen(true);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading products...</div>;
  }
  
  if (error) {
    return <div className="p-6 text-red-600">Failed to load products.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header & Sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#158f20]">My Products</h1>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-48 border dark:bg-card rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#72BF01]"
          >
            <option value="default">Sort by</option>
            <option value="alphabetical">Alphabetical (A–Z)</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="priceLow">Price: Low to High</option>
          </select>

          <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#157f20] hover:bg-[#5aa500] text-white"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddEditOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add Product"}
                </DialogTitle>
              </DialogHeader>
              <ProductForm initialData={editingProduct} onClose={() => setIsAddEditOpen(false)} onSave={handleProductSave} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ">
        {sortedProducts.map((product) => (
          <div
            key={product.name}
            className="border rounded-lg overflow-hidden bg-white dark:bg-card shadow-sm hover:shadow-md transition-shadow relative"
          >
            <img
              src={product.imageUrl || "/images/placeholder.png"}
              alt={product.name}
              className="w-full h-40 object-cover"
              onError={(e) => (e.currentTarget.src = "/images/placeholder.png")}
            />
            <div className="p-4 space-y-1">
              <h2 className="text-md font-semibold truncate">
                {product.name}
              </h2>
              <p className="text-sm text-gray-500">
                Added on{" "}
                {new Date(product.dateAdded).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="font-bold text-right text-sm">
                GH₵ {product.price}
              </p>
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                className="p-1 bg-white border rounded-full hover:bg-gray-100 dark:bg-card"
                onClick={() => handleEditClick(product)}
              >
                <Pencil className="h-4 w-4 text-blue-600" />
              </button>
              <button
                className="p-1 bg-white border rounded-full hover:bg-gray-100 dark:bg-card"
                onClick={() => handleDeleteClick(product)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-[#158f20]">
              {productToDelete?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {sortedProducts.length === 0 && (
        <p className="text-center text-gray-500 dark:text-white">
          You haven't added any products yet.
        </p>
      )}
    </div>
  );
}