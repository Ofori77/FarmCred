'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/redux/hooks/useCart';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

interface CartSheetProps {
  children: React.ReactNode;
}

export function CartSheet({ children }: CartSheetProps) {
  const router = useRouter();
  const { 
    items: cartItems, 
    removeItem, 
    updateItemQuantity, 
    totalAmount, 
    totalItems,
  } = useCart();

  const handleQuantityChange = (id: number, delta: number) => {
    updateItemQuantity(id, delta);
  };

  const handleRemoveItem = (id: number) => {
    removeItem(id);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    if (cartItems.length === 1) {
      // Single item - go directly to buy page with quantity
      const item = cartItems[0];
      router.push(`/marketplace/buy/${item.id}?quantity=${item.quantity}`);
    } else {
      // Multiple items - prompt user to checkout individually
      alert("Please checkout items individually using the 'Checkout This Item' buttons below. We're working on bulk checkout!");
    }
  };

  const handleCheckoutSingle = (itemId: number, quantity: number) => {
    router.push(`/marketplace/buy/${itemId}?quantity=${quantity}`);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="p-6 pb-3">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart ({totalItems} items)
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mb-5" />
              <h3 className="text-lg font-medium text-gray-900 mb-3">Your cart is empty</h3>
              <p className="text-gray-500 mb-5">Start shopping to add items to your cart</p>
              <Link href="/marketplace">
                <Button className="bg-green-600 hover:bg-green-700">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                      src={item.image || '/images/placeholder.png'}
                      alt={item.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      by {item.farmerName}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={item.quantity >= item.max_quantity}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Price Info */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        ₵{item.price} per {item.unit_of_measure}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        ₵{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Individual Checkout Button for Multiple Items */}
                    {cartItems.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckoutSingle(item.id, item.quantity)}
                        className="w-full mt-3 text-xs h-8"
                      >
                        Checkout This Item
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="border-t p-6 space-y-4 bg-gray-50">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-xl font-bold text-green-600">
                ₵{totalAmount.toFixed(2)}
              </span>
            </div>
            
            {/* Checkout Buttons */}
            <div className="space-y-3">
              {cartItems.length === 1 ? (
                <Button 
                  onClick={handleCheckout}
                  className="w-full bg-[#158f20] hover:bg-[#05402E] text-white h-12"
                >
                  Checkout - ₵{totalAmount.toFixed(2)}
                </Button>
              ) : (
                <>
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium mb-2">
                      Multiple Items in Cart
                    </p>
                    <p className="text-xs text-yellow-700">
                      Please checkout items individually using the "Checkout This Item" buttons above.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="pt-1">
              <Link href="/marketplace" className="block w-full">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}