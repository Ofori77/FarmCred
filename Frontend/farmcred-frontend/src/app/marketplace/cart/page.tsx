"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/redux/hooks/useCart";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Minus, Plus, Trash2, Calendar, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import { useInitiateOrder } from "@/hooks/useMarketPlace";

export default function CartPage() {
  const router = useRouter();
  const { 
    items: cart, 
    removeItem: removeFromCart, 
    updateItemQuantity, 
    updateItemDeliveryDate: updateDeliveryDate, 
    clear: clearCart, 
    totalAmount 
  } = useCart();
  const { initiateOrder, loading } = useInitiateOrder();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const handleQuantityChange = (id: number, delta: number) => {
    updateItemQuantity(id, delta);
  };

  const handleDeliveryDateChange = (id: number, date: string) => {
    updateDeliveryDate(id, date);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check if all items have delivery dates
    const itemsWithoutDates = cart.filter(item => !item.delivery_date);
    if (itemsWithoutDates.length > 0) {
      toast.error("Please set delivery dates for all items");
      return;
    }

    setIsProcessing(true);
    try {
      // Process each cart item as a separate order
      const orderPromises = cart.map(async (item) => {
        if (!item.delivery_date) {
          throw new Error(`Delivery date not set for ${item.name}`);
        }
        
        return await initiateOrder({
          listing_id: item.id,
          quantity: item.quantity,
          delivery_date: item.delivery_date,
        });
      });

      const orders = await Promise.all(orderPromises);
      
      // Clear cart after successful orders
      clearCart();
      
      toast.success(`Successfully created ${orders.length} order(s)!`, {
        description: "You will be redirected to the orders page.",
      });

      // Redirect to orders page
      setTimeout(() => {
        router.push('/marketplace/orders');
      }, 2000);

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || "Failed to process order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-600 mb-4">Your cart is empty</h2>
              <p className="text-gray-500 mb-8">Start shopping to add items to your cart</p>
              <Link href="/marketplace">
                <Button className="bg-[#158f20] hover:bg-[#117d1b]">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketplaceNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Shopping Cart ({cart.length} items)</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg bg-white">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-[#158f20]">{item.name}</h3>
                            <p className="text-sm text-gray-600">by {item.farmerName}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`quantity-${item.id}`} className="text-sm">
                              Quantity:
                            </Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, -1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-12 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.id, 1)}
                                disabled={item.quantity >= item.max_quantity}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="text-sm text-gray-500">
                              /{item.unit_of_measure} (Max: {item.max_quantity})
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold text-[#158f20]">
                              GH₵ {(item.price * item.quantity).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              GH₵ {item.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <Label htmlFor={`delivery-${item.id}`} className="text-sm">
                            Delivery Date:
                          </Label>
                          <Input
                            id={`delivery-${item.id}`}
                            type="date"
                            value={item.delivery_date || formatDate(tomorrow)}
                            min={formatDate(tomorrow)}
                            onChange={(e) => handleDeliveryDateChange(item.id, e.target.value)}
                            className="w-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-32">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} (×{item.quantity})</span>
                        <span>GH₵ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-[#158f20]">GH₵ {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={handleCheckout}
                      disabled={loading || isProcessing}
                      className="w-full bg-gradient-to-br from-[#128f20] to-[#72BF01] text-white hover:opacity-90"
                    >
                      {isProcessing ? "Processing..." : "Proceed to Checkout"}
                    </Button>
                    
                    <Link href="/marketplace">
                      <Button variant="outline" className="w-full">
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2">
                    <p>• Payment will be held in escrow until delivery</p>
                    <p>• You can confirm receipt after delivery</p>
                    <p>• Disputes can be raised if needed</p>
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
