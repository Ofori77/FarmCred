"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFarmerProducts } from "@/hooks/useFarmerProducts";

export default function FarmerProduct() {
  const { products, loading, error } = useFarmerProducts();

  if (loading) {
    return <div className="p-4 text-[#157148]">Loading products...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Failed to load products</div>;
  }

  // Ensure products is an array before using array methods
  const productsArray = Array.isArray(products) ? products : [];

  if (productsArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground">
        No products available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {productsArray.slice(0, 4).map((product, index) => {
        const productName = product.name || "Unnamed Product";
        const initial = productName.charAt(0).toUpperCase();

        return (
          <div key={product.id || index} className="flex items-center gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 border border-[#E1E3E0] rounded-full">
              <AvatarImage
                src={product.imageUrl}
                alt={product.name}
                onError={(e) => (e.currentTarget.src = "/images/placeholder.png")}
              />
              <AvatarFallback className="text-[#158f20] text-lg font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex justify-between items-center flex-1 border-b border-[#E1E3E0] py-3">
              <div className="min-w-0">
                <p className="font-medium text-l mb-0.5">{productName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-lg">
                  GH₵ {product.price || 0}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
