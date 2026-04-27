'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Star, 
  Search,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useMarketplace } from '@/lib/redux/hooks/useMarketplace';
import { useCart } from '@/lib/redux/hooks/useCart';
import { marketplaceService } from '@/lib/api/marketplace';
import { ProduceListing } from '@/lib/types/marketplacetypes';
import { toast } from 'sonner';

// Image mapping for produce types - ONLY LOCAL IMAGES
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
const getLocalImageOnly = (produceType: string, backendImageUrl?: string): string => {
  // IGNORE backend image URL completely and only use local images
  return getProduceImage(produceType);
};

// Product Card Component
const ProductCard = ({ product }: { product: ProduceListing }) => {
  const { addItem } = useCart();
  const router = useRouter();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cartItem = {
      id: product.id,
      name: product.produce_type,
      image: getLocalImageOnly(product.produce_type), // Only use local images
      price: product.current_price_per_unit,
      quantity: 1,
      farmerName: product.farmer_full_name,
      description: `Fresh ${product.produce_type} from ${product.location_description}`,
      unit_of_measure: product.unit_of_measure,
      max_quantity: product.quantity_available
    };
    addItem(cartItem);
    toast.success(`${product.produce_type} added to cart!`);
  };

  const handleBuyNow = () => {
    router.push(`/marketplace/buy/${product.id}?quantity=1`);
  };

  // ONLY use local images - ignore backend image_url completely
  const productImage = getLocalImageOnly(product.produce_type);

  return (
    <div 
      className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:border-gray-300 transition-all duration-300 flex flex-col h-full cursor-pointer"
      onClick={handleBuyNow}
    >
      <div className="relative h-48">
        <Image
          src={productImage}
          alt={product.produce_type}
          fill
          className="object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder.png';
          }}
        />
        {product.discount_percentage > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            {product.discount_percentage}% OFF
          </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-medium text-gray-800 capitalize">
            {product.produce_type}
          </h3>
          <div className="flex items-center bg-amber-50 px-2 py-0.5 rounded-full">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
            <span className="text-xs text-amber-700 ml-1 font-medium">
              {product.farmer_trust_level_stars}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mb-2">
          by {product.farmer_full_name}
        </p>
        
        <p className="text-xs text-gray-500 mb-auto line-clamp-1">
          {product.location_description}
        </p>
        
        <div className="mt-3 mb-2">
          {product.discount_percentage > 0 ? (
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-green-600">
                ₵{product.current_price_per_unit}
              </span>
              <span className="text-sm text-gray-400 line-through">
                ₵{product.base_price_per_unit}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-green-600">
              ₵{product.current_price_per_unit}
            </span>
          )}
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">per {product.unit_of_measure}</span>
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {product.quantity_available} available
            </span>
          </div>
        </div>
        
        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <button
            onClick={handleBuyNow}
            className="bg-[#158f20] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#05402E] transition-colors"
          >
            Buy Now
          </button>
          
          <button
            onClick={handleAddToCart}
            className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Product Grid Component  
const ProductGridPage = () => {
  const { 
    paginatedListings, 
    isLoading, 
    error, 
    setListingsData, 
    setLoadingState, 
    setErrorState 
  } = useMarketplace();

  // Use ref to track if we've already fetched data
  const hasFetched = useRef(false);

  // Fetch listings from backend on component mount
  useEffect(() => {
    if (hasFetched.current) return; // Prevent multiple fetches
    
    const fetchListings = async () => {
      console.log('🚀 Starting to fetch listings...');
      
      try {
        setLoadingState(true);
        setErrorState(null);
        
        console.log('📡 Making API call to:', `${process.env.NEXT_PUBLIC_API_URL}api/marketplace/listings/`);
        
        const listings = await marketplaceService.getAllListings();
        
        setListingsData(listings);
        
        hasFetched.current = true; // Mark as fetched
        
      } catch (error) {
        console.error('❌ Error fetching listings:', error);
        setErrorState('Failed to load products. Please try again.');
      } finally {
        setLoadingState(false);
        console.log('🏁 Loading state set to false');
      }
    };

    console.log('🔧 Component mounted, triggering API fetch...');
    fetchListings();
  }, []); // Empty dependency array - only run on mount

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Products</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (paginatedListings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">
            No listings available from the backend. Check if there are products in your database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {paginatedListings.length} products
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedListings.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default ProductGridPage;