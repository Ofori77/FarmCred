"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useListing, useInitiateOrder } from "@/hooks/useMarketPlace";
import { useCart } from "@/lib/redux/hooks/useCart";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import { toast } from "sonner";
import { 
  Star, 
  MapPin, 
  Calendar, 
  Package, 
  ArrowLeft,
  Shield,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// Image mapping function - same as in Product.tsx
const getProduceImage = (produceType: string): string => {
  const normalizedType = produceType.toLowerCase().trim();
  
  const imageMap: { [key: string]: string } = {
    // Exact matches
    'cassava': '/images/freshcassavas.jpg',
    'cassavas': '/images/freshcassavas.jpg',
    'sweet cassava': '/images/freshsweetcassava.jpg',
    'sweetcassava': '/images/freshsweetcassava.jpg',
    'cocoa': '/images/freshcocoaseeds.jpg',
    'cocoa seeds': '/images/freshcocoaseeds.jpg',
    'cocoaseeds': '/images/freshcocoaseeds.jpg',
    'maize': '/images/freshmaize.jpg',
    'corn': '/images/freshmaize.jpg',
    'maise': '/images/freshmaize.jpg',
    'mize': '/images/freshmaize.jpg',
    'mango': '/images/freshmangoes.jpg',
    'mangoes': '/images/freshmangoes.jpg',
    'palm nut': '/images/freshpalmnut.jpg',
    'palmnut': '/images/freshpalmnut.jpg',
    'palm nuts': '/images/freshpalmnut.jpg',
    'palm oil': '/images/freshpalmnut.jpg',
    'pineapple': '/images/freshpineapple.jpg',
    'pineapples': '/images/freshpineapples.jpg',
    'plantain': '/images/freshplantain.jpg',
    'plantains': '/images/freshplantain.jpg',
    'tomato': '/images/freshtomatoes.jpg',
    'tomatoes': '/images/freshtomatoes.jpg',
    'pepper': '/images/freshtomatoes.jpg',
    'peppers': '/images/freshtomatoes.jpg',
    // Root vegetables
    'yam': '/images/freshcassavas.jpg',
    'yams': '/images/freshcassavas.jpg',
    // Fruits
    'banana': '/images/freshplantain.jpg',
    'bananas': '/images/freshplantain.jpg',
    // Nuts/Seeds
    'cashew': '/images/freshcocoaseeds.jpg',
    'cashews': '/images/freshcocoaseeds.jpg',
    'groundnut': '/images/freshcocoaseeds.jpg',
    'groundnuts': '/images/freshcocoaseeds.jpg',
    'peanut': '/images/freshcocoaseeds.jpg',
    'peanuts': '/images/freshcocoaseeds.jpg',
  };
  
  // Check for exact match first
  if (imageMap[normalizedType]) {
    return imageMap[normalizedType];
  }
  
  // Check for partial matches
  for (const [key, imagePath] of Object.entries(imageMap)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return imagePath;
    }
  }
  
  // Always return local placeholder
  return '/images/placeholder.png';
};

// Helper function to ensure only local images are used
const getLocalImageOnly = (produceType: string): string => {
  return getProduceImage(produceType);
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = Number(params.id);
  
  const { data: listing, loading, error } = useListing(productId);
  const { initiateOrder, loading: orderLoading } = useInitiateOrder();
  const { removeItem, isInCart } = useCart();
  
  // Get quantity from URL params if coming from cart
  const urlQuantity = searchParams.get('quantity');
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  
  // Set quantity from URL params when component mounts
  useEffect(() => {
    if (urlQuantity && !isNaN(Number(urlQuantity))) {
      setQuantity(Number(urlQuantity));
    }
  }, [urlQuantity]);
  
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!deliveryDate) {
    setDeliveryDate(formatDate(tomorrow));
  }

  const handleCompletePurchase = async () => {
    if (!listing) return;
    
    if (quantity > listing.quantity_available) {
      toast.error(`Only ${listing.quantity_available} ${listing.unit_of_measure} available`);
      return;
    }

    // Validate buyer information
    if (!buyerInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!buyerInfo.email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!buyerInfo.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerInfo.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      await initiateOrder({
        listing_id: listing.id,
        quantity,
        delivery_date: deliveryDate,
        guest_name: buyerInfo.name,
        guest_email: buyerInfo.email,
        guest_phone: buyerInfo.phone,
      });
      
      toast.success("Purchase successful!", {
        description: "You will receive updates via email and SMS.",
      });
      
      // Remove item from cart if it exists there
      if (isInCart(listing.id)) {
        removeItem(listing.id);
      }
      
      // Redirect back to marketplace after successful order
      setTimeout(() => {
        router.push('/marketplace');
      }, 2000);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to complete purchase");
    }
  };

  if (loading) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-600 mb-4">Product not found</h2>
              <p className="text-gray-500 mb-8">{error || "The product you're looking for doesn't exist."}</p>
              <Link href="/marketplace">
                <Button className="bg-[#158f20] hover:bg-[#117d1b]">
                  Back to Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isExpired = new Date(listing.available_until) < new Date();
  const isOutOfStock = listing.quantity_available <= 0;
  const canOrder = !isExpired && !isOutOfStock && listing.status === 'active';

  // Get the local image for this produce type
  const productImage = getLocalImageOnly(listing.produce_type);

  return (
    <>
      <MarketplaceNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Back Button */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-[#158f20] hover:text-[#117d1b] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white">
              <Image
                src={productImage}
                alt={listing.produce_type}
                fill
                className="object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/placeholder.png';
                }}
              />
              {listing.discount_percentage > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-semibold">
                  {listing.discount_percentage}% OFF
                </div>
              )}
              {!canOrder && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg text-center">
                    <p className="font-semibold text-red-600">
                      {isOutOfStock ? 'Out of Stock' : 'No longer available'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details and Purchase Form */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-[#158f20] mb-2">{listing.produce_type}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{listing.farmer_trust_level_stars} ({listing.farmer_trust_score_percent}%)</span>
                  </div>
                  <span>•</span>
                  <span>by {listing.farmer_full_name}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{listing.location_description}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{listing.quantity_available} {listing.unit_of_measure} available</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Available until {new Date(listing.available_until).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-t border-b py-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-[#158f20]">
                      GH₵ {Number(listing.current_price_per_unit).toFixed(2)}
                    </span>
                    <span className="text-gray-600">per {listing.unit_of_measure}</span>
                    {listing.discount_percentage > 0 && (
                      <span className="text-lg line-through text-gray-400">
                        GH₵ {Number(listing.base_price_per_unit).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase Form */}
              <Card className="shadow-sm border-t-4 border-t-[#158f20]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Shield className="w-5 h-5" />
                    Complete Purchase
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  {/* From cart notification */}
                  {urlQuantity && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                      Item from your cart - Quantity: {urlQuantity}
                    </div>
                  )}
                  
                  {/* Buyer Information */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Your Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your name"
                          value={buyerInfo.name}
                          onChange={(e) => setBuyerInfo(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={buyerInfo.email}
                          onChange={(e) => setBuyerInfo(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          placeholder="Enter your phone number"
                          value={buyerInfo.phone}
                          onChange={(e) => setBuyerInfo(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Details */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Order Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max={listing.quantity_available}
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          disabled={!canOrder}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {listing.unit_of_measure}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="delivery">Delivery Date</Label>
                        <Input
                          id="delivery"
                          type="date"
                          value={deliveryDate}
                          min={formatDate(tomorrow)}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          disabled={!canOrder}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-medium text-gray-700 mb-2">Order Summary</h3>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{listing.produce_type} × {quantity}</span>
                      <span>GH₵ {(Number(listing.current_price_per_unit) * quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t mt-2">
                      <span>Total</span>
                      <span className="text-[#158f20]">GH₵ {(Number(listing.current_price_per_unit) * quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-3">
                    <Button
                      onClick={handleCompletePurchase}
                      disabled={!canOrder || orderLoading || !buyerInfo.name || !buyerInfo.email || !buyerInfo.phone}
                      className="flex-1 bg-gradient-to-br from-[#128f20] to-[#72BF01] text-white hover:opacity-90 py-6"
                    >
                      {orderLoading ? "Processing..." : "Complete Purchase"}
                    </Button>
                    
                    <Link href="/marketplace">
                      <Button variant="outline" className="h-full">
                        Cancel
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Trust Indicators */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <div className="text-xs text-gray-600 flex items-center">
                      <Shield className="w-3 h-3 mr-1 text-[#158f20]" />
                      Secure payment
                    </div>
                    <div className="text-xs text-gray-600 flex items-center">
                      <Shield className="w-3 h-3 mr-1 text-[#158f20]" />
                      Buyer protection
                    </div>
                    <div className="text-xs text-gray-600 flex items-center">
                      <Shield className="w-3 h-3 mr-1 text-[#158f20]" />
                      Updates via email/SMS
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}